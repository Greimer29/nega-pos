import CatalogProduct from '#models/catalog_product'
import ProductInventoryMovement from '#models/product_inventory_movement'
import Purchase from '#models/purchase'
import Supplier from '#models/supplier'
import User from '#models/user'
import { seedOpenSalesShift } from '#tests/helpers/seed_test_sale'
import { seedReferenceData } from '#tests/helpers/seed_reference_data'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-wholesale@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_line_materials').delete()
  await db.from('sale_lines').delete()
  await db.from('sale_payments').delete()
  await db.from('sales').delete()
  await db.from('sales_shifts').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('catalog_product_sizes').delete()
  await db.from('catalog_products').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('materials').delete()
  await db.from('suppliers').delete()
  await db.from('users').delete()
}

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Wholesale',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Mayorista — catálogo, compra y venta', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedReferenceData()
    await seedAdminUser()
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await seedOpenSalesShift(Number(user.id))
  })

  test('crear producto mayorista deriva el costo unitario', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Arroz Mary 1kg',
      category: 'Uniforme',
      sale_price_usd: 0.5,
      wholesale_enabled: true,
      wholesale_units_per_pack: 30,
      wholesale_cost_usd: 9,
      wholesale_sale_price_usd: 12,
    })

    response.assertStatus(200)
    const product = response.body().data.catalog_product
    assert.equal(product.wholesale_enabled, true)
    assert.equal(product.wholesale_units_per_pack, '30.000')
    assert.equal(product.cost_usd, '0.3000')
    assert.equal(product.wholesale_cost_usd, '9.0000')
  })

  test('compra mayorista carga unidades = paquetes × und y actualiza costo', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Mayorista Test',
      rif: 'J987654321',
      active: true,
    })

    const createProduct = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Arroz Mary 1kg',
      category: 'Uniforme',
      sale_price_usd: 0.5,
      wholesale_enabled: true,
      wholesale_units_per_pack: 30,
      wholesale_cost_usd: 9,
      wholesale_sale_price_usd: 12,
    })
    createProduct.assertStatus(200)
    const productId = createProduct.body().data.catalog_product.id

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-09-23'),
      invoiceNumber: 'F-MAY-001',
      status: 'DRAFT',
      totalBs: '0.00',
    })

    const itemResponse = await client
      .post(`/api/v1/purchases/${purchase.id}/items`)
      .loginAs(user)
      .json({
        catalog_product_id: productId,
        quantity: 20,
        unit_price_usd: 9,
        is_wholesale: true,
      })
    itemResponse.assertStatus(200)
    assert.equal(itemResponse.body().data.item.isWholesale, true)
    assert.equal(itemResponse.body().data.item.quantity, '20.00')

    const confirm = await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)
    confirm.assertStatus(200)

    const movement = await ProductInventoryMovement.query()
      .where('catalogProductId', productId)
      .where('type', 'PURCHASE_IN')
      .firstOrFail()
    assert.equal(Number(movement.quantity), 600)

    const product = await CatalogProduct.findOrFail(productId)
    assert.equal(product.costUsd, '0.3000')
    assert.equal(product.wholesaleCostUsd, '9.0000')
    assert.equal(Number(product.stockQuantity), 600)
  })

  test('confirm con items en el body conserva is_wholesale (paquetes × und)', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Mayorista Confirm Items',
      rif: 'J111222333',
      active: true,
    })

    const createProduct = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Arroz pack',
      category: 'Uniforme',
      sale_price_usd: 0.02,
      wholesale_enabled: true,
      wholesale_units_per_pack: 30,
      wholesale_cost_usd: 0.3,
      wholesale_sale_price_usd: 0.6,
    })
    createProduct.assertStatus(200)
    const productId = createProduct.body().data.catalog_product.id
    assert.equal(createProduct.body().data.catalog_product.cost_usd, '0.0100')

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-09-25'),
      invoiceNumber: 'F-MAY-002',
      status: 'DRAFT',
      totalBs: '0.00',
    })

    await client
      .post(`/api/v1/purchases/${purchase.id}/items`)
      .loginAs(user)
      .json({
        catalog_product_id: productId,
        quantity: 20,
        unit_price_usd: 0.3,
        is_wholesale: true,
      })
      .then((r) => r.assertStatus(200))

    // El front reenvía las líneas en confirm; sin is_wholesale se perdía el modo paquete.
    const confirm = await client
      .post(`/api/v1/purchases/${purchase.id}/confirm`)
      .loginAs(user)
      .json({
        invoice_number: 'F-MAY-002',
        items: [
          {
            catalog_product_id: productId,
            quantity: 20,
            unit_price_usd: 0.3,
            is_wholesale: true,
          },
        ],
      })
    confirm.assertStatus(200)

    const product = await CatalogProduct.findOrFail(productId)
    assert.equal(Number(product.stockQuantity), 600)
    assert.equal(product.costUsd, '0.0100')
    assert.equal(product.wholesaleCostUsd, '0.3000')
  })

  test('venta mayorista descuenta paquetes × und al precio de paquete', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const createProduct = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Arroz Mary 1kg',
      category: 'Uniforme',
      sale_price_usd: 0.5,
      stock_quantity: 600,
      wholesale_enabled: true,
      wholesale_units_per_pack: 30,
      wholesale_cost_usd: 9,
      wholesale_sale_price_usd: 12,
    })
    createProduct.assertStatus(200)
    const productId = createProduct.body().data.catalog_product.id

    const sale = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente mayorista',
        payment_type: 'CASH',
        payment_method_code: 'cash_usd',
        confirm: true,
        lines: [
          {
            catalog_product_id: productId,
            quantity: 1,
            unit_price_usd: 12,
            is_wholesale: true,
          },
        ],
      })

    sale.assertStatus(200)
    const body = sale.body().data.sale
    assert.equal(body.total_usd, '12.0000')
    assert.equal(body.lines[0].is_wholesale, true)

    const product = await CatalogProduct.findOrFail(productId)
    assert.equal(Number(product.stockQuantity), 570)
  })

  test('E2E Arroz Mary: 1 paq mayorista + 5 und detalle, stock, costos, devolución y reportes', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const findings: string[] = []
    const month = new Date().toISOString().slice(0, 7)

    // Producto sin fórmula: stock propio, paca = 30 und
    const createProduct = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Arroz Mary 1kg',
      category: 'Uniforme',
      sale_unit: 'UND',
      sale_price_usd: 0.5,
      stock_quantity: 100,
      wholesale_enabled: true,
      wholesale_units_per_pack: 30,
      wholesale_cost_usd: 9,
      wholesale_sale_price_usd: 12,
    })
    createProduct.assertStatus(200)
    const productId = Number(createProduct.body().data.catalog_product.id)
    assert.equal(createProduct.body().data.catalog_product.cost_usd, '0.3000')
    findings.push('OK alta Arroz Mary: mayorista 30 und/paq; costo und 0.30; stock 100')

    // Misma factura: 1 paca + 5 unidades sueltas
    const sale = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente Arroz Mary mixto',
        payment_type: 'CASH',
        payment_method_code: 'cash_usd',
        confirm: true,
        lines: [
          {
            catalog_product_id: productId,
            quantity: 1,
            unit_price_usd: 12,
            is_wholesale: true,
          },
          {
            catalog_product_id: productId,
            quantity: 5,
            unit_price_usd: 0.5,
            is_wholesale: false,
          },
        ],
      })
    sale.assertStatus(200)
    const saleBody = sale.body().data.sale
    const saleId = Number(saleBody.id)
    assert.equal(saleBody.total_usd, '14.5000') // 12 + 2.5
    const wholesaleLine = saleBody.lines.find((l: { is_wholesale: boolean }) => l.is_wholesale)
    const retailLine = saleBody.lines.find((l: { is_wholesale: boolean }) => !l.is_wholesale)
    assert.exists(wholesaleLine)
    assert.exists(retailLine)
    assert.equal(wholesaleLine.cost_usd, '9.0000') // costo paquete congelado
    assert.equal(retailLine.cost_usd, '0.3000')
    assert.equal(wholesaleLine.units_per_pack, '30.000')
    findings.push('OK venta mixta: 1 paq + 5 und; total 14.50; costos 9 y 0.30')

    // Stock: 100 − (30 + 5) = 65
    let product = await CatalogProduct.findOrFail(productId)
    assert.equal(Number(product.stockQuantity), 65)
    findings.push('OK stock post-venta: 100 − 35 = 65')

    const detail = await client.get(`/api/v1/sales/${saleId}`).loginAs(user)
    detail.assertStatus(200)
    const detailWholesale = detail
      .body()
      .data.sale.lines.find((l: { is_wholesale: boolean }) => l.is_wholesale)
    assert.equal(detailWholesale.is_wholesale, true)
    assert.equal(detailWholesale.units_per_pack, '30.000')
    findings.push('OK historial: línea mayorista conserva units_per_pack')

    // Oversell: 3 pacas = 90 > 65 → 409
    const oversell = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Oversell arroz',
        payment_type: 'CASH',
        payment_method_code: 'cash_usd',
        confirm: true,
        lines: [
          {
            catalog_product_id: productId,
            quantity: 3,
            unit_price_usd: 12,
            is_wholesale: true,
          },
        ],
      })
    assert.equal(oversell.status(), 409)
    product = await CatalogProduct.findOrFail(productId)
    assert.equal(Number(product.stockQuantity), 65)
    findings.push('OK oversell 3 pacas bloqueado: HTTP 409; stock 65')

    // Devolución 1 paca → +30 und
    const returnPack = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({
        lines: [{ line_id: Number(wholesaleLine.id), quantity: 1 }],
      })
    returnPack.assertStatus(200)
    assert.equal(returnPack.body().data.sale.total_usd, '2.5000') // quedan 5 und
    product = await CatalogProduct.findOrFail(productId)
    assert.equal(Number(product.stockQuantity), 95)
    findings.push('OK devolución 1 paca: stock 65→95; total restante 2.50')

    // Devolución de las 5 und → RETURNED; stock 100
    const returnRetail = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({
        lines: [{ line_id: Number(retailLine.id), quantity: 5 }],
      })
    returnRetail.assertStatus(200)
    assert.equal(returnRetail.body().data.sale.status, 'RETURNED')
    assert.equal(returnRetail.body().data.sale.total_usd, '0.0000')
    product = await CatalogProduct.findOrFail(productId)
    assert.equal(Number(product.stockQuantity), 100)
    findings.push('OK devolución 5 und: RETURNED; stock 95→100')

    // Segunda venta mixta para reportes (sin devolver)
    const sale2 = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente reportes arroz',
        payment_type: 'CASH',
        payment_method_code: 'cash_usd',
        confirm: true,
        lines: [
          {
            catalog_product_id: productId,
            quantity: 1,
            unit_price_usd: 12,
            is_wholesale: true,
          },
          {
            catalog_product_id: productId,
            quantity: 5,
            unit_price_usd: 0.5,
            is_wholesale: false,
          },
        ],
      })
    sale2.assertStatus(200)
    product = await CatalogProduct.findOrFail(productId)
    assert.equal(Number(product.stockQuantity), 65)

    const income = await client
      .get('/api/v1/reports/income-statement')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    income.assertStatus(200)
    const pl = income.body().data.summary
    // Solo sale2 activa: ingresos 14.50; CMV = 9 + 5×0.30 = 10.50
    assert.equal(Number(pl.salesRevenueUsd), 14.5)
    assert.equal(Number(pl.cogsUsd), 10.5)
    assert.equal(Number(pl.grossProfitUsd), 4)
    findings.push('OK resultados: ingresos 14.50, CMV 10.50, bruta 4')

    const patrimonio = await client
      .get('/api/v1/reports/balance-position')
      .qs({ display_currency: 'USD' })
      .loginAs(user)
    patrimonio.assertStatus(200)
    // Inventario = 65 × 0.30 = 19.50
    assert.equal(Number(patrimonio.body().data.summary.inventoryUsd), 19.5)
    findings.push('OK patrimonio: inventario 19.50 (= 65 × 0.30)')

    console.log('\n=== HALLAZGOS E2E Arroz Mary mixto ===')
    for (const line of findings) {
      console.log(`- ${line}`)
    }
    console.log('=== FIN ===\n')
  })

  test('is_wholesale en producto sin config mayorista responde 422', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const createProduct = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Sin mayorista',
      category: 'Uniforme',
      sale_price_usd: 1,
    })
    createProduct.assertStatus(200)
    const productId = createProduct.body().data.catalog_product.id

    const sale = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente',
        payment_type: 'CASH',
        payment_method_code: 'cash_usd',
        lines: [
          {
            catalog_product_id: productId,
            quantity: 1,
            unit_price_usd: 1,
            is_wholesale: true,
          },
        ],
      })

    sale.assertStatus(422)
  })

  test('E2E completo: fórmula+mayorista — compra, venta, oversell, devolución y reportes', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const findings: string[] = []
    const month = new Date().toISOString().slice(0, 7)
    const today = new Date().toISOString().slice(0, 10)

    // 1) Material pieza
    const materialRes = await client.post('/api/v1/materials').loginAs(user).json({
      code: 'RES-E2E-1',
      name: 'Carne de res E2E',
      category: 'Uniforme',
      unit: 'KG',
      minimum_stock: 1,
      sale_price_usd: 0,
    })
    materialRes.assertStatus(200)
    const materialId = Number(materialRes.body().data.material.id)

    // 2) Fórmula 1:1
    const formulaRes = await client
      .post('/api/v1/formulas')
      .loginAs(user)
      .json({ name: 'Fórmula molida E2E' })
    formulaRes.assertStatus(200)
    const formulaId = Number(formulaRes.body().data.formula.id)
    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({ items: [{ material_id: materialId, quantity: 1 }] })
      .then((r) => r.assertStatus(200))

    // 3) Producto molida: fórmula + mayorista (10 kg/paq)
    const productRes = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Carne molida E2E',
      category: 'Uniforme',
      sale_unit: 'KG',
      sale_price_usd: 8,
      formula_id: formulaId,
      wholesale_enabled: true,
      wholesale_units_per_pack: 10,
      wholesale_cost_usd: 40,
      wholesale_sale_price_usd: 70,
    })
    productRes.assertStatus(200)
    const productId = Number(productRes.body().data.catalog_product.id)
    assert.equal(productRes.body().data.catalog_product.wholesale_enabled, true)
    assert.equal(productRes.body().data.catalog_product.formula_id, formulaId)
    findings.push('OK alta: molida con fórmula + mayorista (10 und/paq)')

    // 4) Compra 50 kg @ 4
    const supplierRes = await client.post('/api/v1/suppliers').loginAs(user).json({
      name: 'Frigorífico E2E',
      rif: 'J777E2E01',
      active: true,
    })
    const supplierId = Number(supplierRes.body().data.supplier.id)
    const purchaseRes = await client.post('/api/v1/purchases').loginAs(user).json({
      supplier_id: supplierId,
      date: today,
      invoice_number: 'E2E-MAY-FORM',
      usd_rate: 40,
    })
    const purchaseId = Number(purchaseRes.body().data.purchase.id)
    await client
      .post(`/api/v1/purchases/${purchaseId}/items`)
      .loginAs(user)
      .json({ material_id: materialId, quantity: 50, unit_price_usd: 4 })
      .then((r) => r.assertStatus(200))
    await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .then((r) => r.assertStatus(200))

    const matAfterBuy = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(matAfterBuy.body().data.material.stockActual, 50)
    assert.equal(Number(matAfterBuy.body().data.material.lastPurchasePriceUsd), 4)

    const productStock = await client.get(`/api/v1/catalog-products/${productId}`).loginAs(user)
    assert.equal(productStock.body().data.catalog_product.stock_source, 'formula')
    assert.equal(productStock.body().data.catalog_product.stock_quantity, '50.000')
    findings.push('OK compra: 50 kg res; molida muestra stock fórmula 50')

    // 5) Venta mayorista 2 paq + detalle 5 kg
    const sale = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente E2E carne',
        payment_type: 'CASH',
        payment_method_code: 'cash_usd',
        confirm: true,
        lines: [
          {
            catalog_product_id: productId,
            quantity: 2,
            unit_price_usd: 70,
            is_wholesale: true,
          },
          {
            catalog_product_id: productId,
            quantity: 5,
            unit_price_usd: 8,
            is_wholesale: false,
          },
        ],
      })
    sale.assertStatus(200)
    const saleBody = sale.body().data.sale
    const saleId = Number(saleBody.id)
    assert.equal(saleBody.total_usd, '180.0000') // 140 + 40
    const wholesaleLine = saleBody.lines.find((l: { is_wholesale: boolean }) => l.is_wholesale)
    const retailLine = saleBody.lines.find((l: { is_wholesale: boolean }) => !l.is_wholesale)
    assert.exists(wholesaleLine)
    assert.exists(retailLine)
    assert.equal(wholesaleLine.cost_usd, '40.0000') // 4 × 10
    assert.equal(retailLine.cost_usd, '4.0000')
    assert.equal(wholesaleLine.units_per_pack, '10.000')
    findings.push('OK venta mixta: 2 paq mayor + 5 kg detalle; total 180; costos 40 y 4')

    // Consumo: 2×10 + 5 = 25 kg → quedan 25
    const matAfterSale = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(matAfterSale.body().data.material.stockActual, 25)

    const productAfterSale = await client.get(`/api/v1/catalog-products/${productId}`).loginAs(user)
    assert.equal(productAfterSale.body().data.catalog_product.stock_quantity, '25.000')
    findings.push('OK stock post-venta: material y fórmula = 25 kg')

    // 6) Historial / detalle conserva mayorista
    const detail = await client.get(`/api/v1/sales/${saleId}`).loginAs(user)
    detail.assertStatus(200)
    const detailWholesale = detail
      .body()
      .data.sale.lines.find((l: { is_wholesale: boolean }) => l.is_wholesale)
    assert.equal(detailWholesale.is_wholesale, true)
    assert.equal(detailWholesale.units_per_pack, '10.000')
    findings.push('OK historial: línea mayorista con units_per_pack en detalle')

    // 7) Oversell: 3 paq = 30 kg > 25 → 409
    const oversell = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Oversell',
        payment_type: 'CASH',
        payment_method_code: 'cash_usd',
        confirm: true,
        lines: [
          {
            catalog_product_id: productId,
            quantity: 3,
            unit_price_usd: 70,
            is_wholesale: true,
          },
        ],
      })
    assert.isTrue(oversell.status() >= 400, `esperaba oversell, got ${oversell.status()}`)
    const matUnchanged = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(matUnchanged.body().data.material.stockActual, 25)
    findings.push(`OK oversell bloqueado: HTTP ${oversell.status()}; stock intacto 25`)

    // 8) Devolución 1 paquete mayorista → +10 kg material
    const returnRes = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({
        lines: [{ line_id: Number(wholesaleLine.id), quantity: 1 }],
      })
    returnRes.assertStatus(200)
    const matAfterReturn = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(matAfterReturn.body().data.material.stockActual, 35)
    findings.push('OK devolución 1 paq mayorista: material 25+10 = 35')

    // 9) Reportes
    const income = await client
      .get('/api/v1/reports/income-statement')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    income.assertStatus(200)
    const pl = income.body().data.summary
    // Tras devolver 1 paq: ingresos = 180 - 70 = 110; CMV = (1×40 + 5×4) = 60
    assert.equal(Number(pl.salesRevenueUsd), 110)
    assert.equal(Number(pl.cogsUsd), 60)
    assert.equal(Number(pl.grossProfitUsd), 50)
    findings.push('OK resultados: ingresos 110, CMV 60, utilidad bruta 50 (post-devolución)')

    const flujo = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    flujo.assertStatus(200)
    const cash = flujo.body().data.summary
    // Cobros: 180 - 70 (devolución 1 paq) = 110; compras: 50×4 = 200
    assert.equal(Number(cash.purchasesUsd), 200)
    assert.equal(Number(cash.salesUsd), 110)
    findings.push(
      `OK flujo: pagos compra=${cash.purchasesUsd}, cobros ventas=${cash.salesUsd}, neto=${cash.netUsd}`
    )

    const patrimonio = await client
      .get('/api/v1/reports/balance-position')
      .qs({ display_currency: 'USD' })
      .loginAs(user)
    patrimonio.assertStatus(200)
    // Inventario = 35 kg × 4 = 140 (solo material; producto fórmula no suma)
    assert.equal(Number(patrimonio.body().data.summary.inventoryUsd), 140)
    findings.push('OK patrimonio: inventario 140 (= 35 × 4); molida no duplica stock')

    const resumen = await client
      .get('/api/v1/reports/financial-summary')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    resumen.assertStatus(200)
    assert.equal(Number(resumen.body().data.resultado.operatingIncomeUsd), 50)
    findings.push(
      `OK resumen: utilidad operativa=50; diagnosis=${resumen.body().data.diagnosis.headline}`
    )

    console.log('\n=== HALLAZGOS E2E fórmula+mayorista ===')
    for (const line of findings) {
      console.log(`- ${line}`)
    }
    console.log('=== FIN ===\n')
  })

  test('E2E devoluciones fórmula+mayorista: detalle, doble parcial, exceso y total', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const findings: string[] = []
    const month = new Date().toISOString().slice(0, 7)
    const today = new Date().toISOString().slice(0, 10)

    const materialRes = await client.post('/api/v1/materials').loginAs(user).json({
      code: 'RES-RET-1',
      name: 'Res devoluciones E2E',
      category: 'Uniforme',
      unit: 'KG',
      minimum_stock: 1,
      sale_price_usd: 0,
    })
    materialRes.assertStatus(200)
    const materialId = Number(materialRes.body().data.material.id)

    const formulaRes = await client
      .post('/api/v1/formulas')
      .loginAs(user)
      .json({ name: 'Fórmula devoluciones E2E' })
    formulaRes.assertStatus(200)
    const formulaId = Number(formulaRes.body().data.formula.id)
    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({ items: [{ material_id: materialId, quantity: 1 }] })
      .then((r) => r.assertStatus(200))

    const productRes = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Molida devoluciones E2E',
      category: 'Uniforme',
      sale_unit: 'KG',
      sale_price_usd: 8,
      formula_id: formulaId,
      wholesale_enabled: true,
      wholesale_units_per_pack: 10,
      wholesale_cost_usd: 40,
      wholesale_sale_price_usd: 70,
    })
    productRes.assertStatus(200)
    const productId = Number(productRes.body().data.catalog_product.id)

    const supplierRes = await client.post('/api/v1/suppliers').loginAs(user).json({
      name: 'Frigorífico devoluciones',
      rif: 'J777RET01',
      active: true,
    })
    const supplierId = Number(supplierRes.body().data.supplier.id)
    const purchaseRes = await client.post('/api/v1/purchases').loginAs(user).json({
      supplier_id: supplierId,
      date: today,
      invoice_number: 'E2E-RET-FORM',
      usd_rate: 40,
    })
    const purchaseId = Number(purchaseRes.body().data.purchase.id)
    await client
      .post(`/api/v1/purchases/${purchaseId}/items`)
      .loginAs(user)
      .json({ material_id: materialId, quantity: 50, unit_price_usd: 4 })
      .then((r) => r.assertStatus(200))
    await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .then((r) => r.assertStatus(200))

    // Venta: 2 paq + 5 kg → consume 25; quedan 25
    const sale = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente devoluciones',
        payment_type: 'CASH',
        payment_method_code: 'cash_usd',
        confirm: true,
        lines: [
          {
            catalog_product_id: productId,
            quantity: 2,
            unit_price_usd: 70,
            is_wholesale: true,
          },
          {
            catalog_product_id: productId,
            quantity: 5,
            unit_price_usd: 8,
            is_wholesale: false,
          },
        ],
      })
    sale.assertStatus(200)
    const saleId = Number(sale.body().data.sale.id)
    const wholesaleLine = sale
      .body()
      .data.sale.lines.find((l: { is_wholesale: boolean }) => l.is_wholesale)
    const retailLine = sale
      .body()
      .data.sale.lines.find((l: { is_wholesale: boolean }) => !l.is_wholesale)
    assert.exists(wholesaleLine)
    assert.exists(retailLine)

    let stock = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(stock.body().data.material.stockActual, 25)

    // 1) Devolución solo al detalle: 3 kg
    const returnRetail = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({
        lines: [{ line_id: Number(retailLine.id), quantity: 3 }],
      })
    returnRetail.assertStatus(200)
    assert.equal(returnRetail.body().data.sale.status, 'COMPLETED')
    assert.equal(returnRetail.body().data.sale.total_usd, '156.0000') // 180 - 24
    stock = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(stock.body().data.material.stockActual, 28)
    findings.push('OK devolución detalle 3 kg: stock 25→28; total 156; sigue COMPLETED')

    // 2) Segunda parcial: 1 paq mayorista (doble parcial)
    const returnWholesale = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({
        lines: [{ line_id: Number(wholesaleLine.id), quantity: 1 }],
      })
    returnWholesale.assertStatus(200)
    assert.equal(returnWholesale.body().data.sale.status, 'COMPLETED')
    assert.equal(returnWholesale.body().data.sale.total_usd, '86.0000') // 156 - 70
    stock = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(stock.body().data.material.stockActual, 38)
    findings.push('OK doble parcial +1 paq mayorista: stock 28→38; total 86')

    // 3) Exceso: devolver 3 kg cuando solo quedan 2 en detalle → 422
    const overReturn = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({
        lines: [{ line_id: Number(retailLine.id), quantity: 3 }],
      })
    assert.equal(overReturn.status(), 422)
    stock = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(stock.body().data.material.stockActual, 38)
    findings.push('OK exceso en línea detalle bloqueado: HTTP 422; stock intacto 38')

    // 4) Devolución total del resto (sin lines → todo lo pendiente)
    // Resta: 1 paq + 2 kg = 70 + 16 = 86
    const returnFull = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    returnFull.assertStatus(200)
    assert.equal(returnFull.body().data.sale.status, 'RETURNED')
    assert.equal(returnFull.body().data.sale.total_usd, '0.0000')
    stock = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(stock.body().data.material.stockActual, 50)
    findings.push('OK devolución total restante: status RETURNED; stock 38→50 (compra intacta)')

    // 5) Segunda devolución total sobre ya RETURNED → 422
    const returnAgain = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    assert.equal(returnAgain.status(), 422)
    findings.push('OK re-devolución sobre RETURNED bloqueada: HTTP 422')

    // 6) Reportes: venta anulada no aporta ingresos/CMV; inventario = 50×4
    const income = await client
      .get('/api/v1/reports/income-statement')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    income.assertStatus(200)
    const pl = income.body().data.summary
    assert.equal(Number(pl.salesRevenueUsd), 0)
    assert.equal(Number(pl.cogsUsd), 0)
    findings.push('OK resultados post-devolución total: ingresos 0, CMV 0')

    const flujo = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    flujo.assertStatus(200)
    assert.equal(Number(flujo.body().data.summary.salesUsd), 0)
    assert.equal(Number(flujo.body().data.summary.purchasesUsd), 200)
    findings.push('OK flujo: cobros 0; compras 200')

    const patrimonio = await client
      .get('/api/v1/reports/balance-position')
      .qs({ display_currency: 'USD' })
      .loginAs(user)
    patrimonio.assertStatus(200)
    assert.equal(Number(patrimonio.body().data.summary.inventoryUsd), 200)
    findings.push('OK patrimonio: inventario 200 (= 50 × 4)')

    console.log('\n=== HALLAZGOS E2E devoluciones fórmula+mayorista ===')
    for (const line of findings) {
      console.log(`- ${line}`)
    }
    console.log('=== FIN ===\n')
  })
})
