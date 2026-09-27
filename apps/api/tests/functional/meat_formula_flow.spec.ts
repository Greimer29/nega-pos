/**
 * Flujo carnicería: material "Carne de res" + productos con fórmula (Molida / Guisar).
 * Prueba local (nega_pos_test): config → compra → ventas → reportes → errores.
 */
import Supplier from '#models/supplier'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { seedReferenceData } from '#tests/helpers/seed_reference_data'
import { seedOpenSalesShift } from '#tests/helpers/seed_test_sale'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

const TEST_EMAIL = 'test-meat-formula@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_line_materials').delete()
  await db.from('sale_lines').delete()
  await db.from('sale_payments').delete()
  await db.from('sales').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('order_lines').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('order_materials').delete()
  await db.from('orders').delete()
  await db.from('catalog_products').delete()
  await db.from('materials').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('suppliers').delete()
  await db.from('sales_shifts').delete()
  await db.from('users').delete()
}

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Meat Formula',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Meat formula flow — material pieza → cortes → reportes', (group) => {
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

  test('E2E: compra kg res → vender molida/guisar → stock/CMV/patrimonio coherentes', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const findings: string[] = []

    const supplier = await Supplier.create({
      name: 'Frigorífico test',
      rif: 'J999MEAT01',
      active: true,
    })

    // 1) Material = pieza de carne
    const materialResponse = await client.post('/api/v1/materials').loginAs(user).json({
      code: 'RES-001',
      name: 'Carne de res',
      category: 'Uniforme',
      unit: 'KG',
      minimum_stock: 5,
      sale_price_usd: 0,
    })
    materialResponse.assertStatus(200)
    const materialId = Number(materialResponse.body().data.material.id)

    // 2) Fórmulas 1 kg producto = 1 kg material (una por corte, mismo material)
    const formulaMolidaRes = await client
      .post('/api/v1/formulas')
      .loginAs(user)
      .json({ name: 'Fórmula Molida' })
    formulaMolidaRes.assertStatus(200)
    const formulaMolidaId = Number(formulaMolidaRes.body().data.formula.id)

    const formulaGuisarRes = await client
      .post('/api/v1/formulas')
      .loginAs(user)
      .json({ name: 'Fórmula Guisar' })
    formulaGuisarRes.assertStatus(200)
    const formulaGuisarId = Number(formulaGuisarRes.body().data.formula.id)

    await client
      .put(`/api/v1/formulas/${formulaMolidaId}/materials`)
      .loginAs(user)
      .json({ items: [{ material_id: materialId, quantity: 1 }] })
      .then((r) => r.assertStatus(200))

    await client
      .put(`/api/v1/formulas/${formulaGuisarId}/materials`)
      .loginAs(user)
      .json({ items: [{ material_id: materialId, quantity: 1 }] })
      .then((r) => r.assertStatus(200))

    // 3) Productos con precios de venta distintos y cost_usd distintos (a propósito)
    const molidaRes = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Carne molida',
      category: 'Uniforme',
      sale_unit: 'KG',
      sale_price_usd: 8,
      cost_usd: 5,
      formula_id: formulaMolidaId,
    })
    molidaRes.assertStatus(200)
    const molidaId = Number(molidaRes.body().data.catalog_product.id)
    assert.equal(molidaRes.body().data.catalog_product.stock_source, 'formula')

    const guisarRes = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Carne para guisar',
      category: 'Uniforme',
      sale_unit: 'KG',
      sale_price_usd: 6,
      cost_usd: 3,
      formula_id: formulaGuisarId,
    })
    guisarRes.assertStatus(200)
    const guisarId = Number(guisarRes.body().data.catalog_product.id)

    // 4) Compra 40 kg @ 4 USD/kg = 160 USD
    const purchaseRes = await client
      .post('/api/v1/purchases')
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: DateTime.now().toISODate(),
        invoice_number: 'MEAT-001',
        usd_rate: 40,
      })
    purchaseRes.assertStatus(200)
    const purchaseId = Number(purchaseRes.body().data.purchase.id)

    const itemRes = await client.post(`/api/v1/purchases/${purchaseId}/items`).loginAs(user).json({
      material_id: materialId,
      quantity: 40,
      unit_price_usd: 4,
    })
    itemRes.assertStatus(200)

    const confirmPurchase = await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
    confirmPurchase.assertStatus(200)

    const materialAfterBuy = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(materialAfterBuy.body().data.material.stockActual, 40)
    assert.equal(Number(materialAfterBuy.body().data.material.lastPurchasePriceUsd), 4)
    findings.push('OK compra: 40 kg Carne de res @ 4 → stock material=40, lastPurchasePrice=4')

    const molidaStock = await client.get(`/api/v1/catalog-products/${molidaId}`).loginAs(user)
    const guisarStock = await client.get(`/api/v1/catalog-products/${guisarId}`).loginAs(user)
    // Ambos ven stock derivado del mismo material (40/1 = 40)
    assert.equal(molidaStock.body().data.catalog_product.stock_quantity, '40.000')
    assert.equal(guisarStock.body().data.catalog_product.stock_quantity, '40.000')
    findings.push(
      'OK stock fórmula: Molida y Guisar muestran 40 kg disponibles (mismo pozo de material)'
    )

    // 5) Rechazo: no se puede comprar stock del producto con fórmula
    const buyProductDraft = await client
      .post('/api/v1/purchases')
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: DateTime.now().toISODate(),
        invoice_number: 'MEAT-PRODUCT-FAIL',
        usd_rate: 40,
      })
    const buyProductId = Number(buyProductDraft.body().data.purchase.id)
    const buyProductItem = await client
      .post(`/api/v1/purchases/${buyProductId}/items`)
      .loginAs(user)
      .json({
        catalog_product_id: molidaId,
        quantity: 5,
        unit_price_usd: 4,
      })
    // Puede fallar al agregar ítem o al confirmar — documentar status real
    if (buyProductItem.status() === 200) {
      const confirmBad = await client
        .post(`/api/v1/purchases/${buyProductId}/confirm`)
        .loginAs(user)
      assert.isTrue(
        confirmBad.status() >= 400,
        `esperaba rechazo al confirmar compra de producto con fórmula, got ${confirmBad.status()}`
      )
      findings.push(`OK rechazo compra producto-fórmula en confirm: HTTP ${confirmBad.status()}`)
    } else {
      findings.push(`OK rechazo compra producto-fórmula en item: HTTP ${buyProductItem.status()}`)
      assert.isTrue(buyProductItem.status() >= 400)
    }

    // 6) Venta 10 kg molida @ 8 + 15 kg guisar @ 6
    const saleRes = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente carnicería',
        confirm: true,
        payment_type: 'CASH',
        billing_mode: 'FAST',
        payment_method_code: 'cash_usd',
        lines: [
          { catalog_product_id: molidaId, quantity: 10, unit_price_usd: 8 },
          { catalog_product_id: guisarId, quantity: 15, unit_price_usd: 6 },
        ],
      })
    saleRes.assertStatus(200)
    const sale = saleRes.body().data.sale
    assert.equal(Number(sale.total_usd), 170) // 80 + 90

    const lines = sale.lines ?? sale.sale_lines ?? []
    const molidaLine = lines.find(
      (l: { catalog_product_id?: number }) => Number(l.catalog_product_id) === molidaId
    )
    const guisarLine = lines.find(
      (l: { catalog_product_id?: number }) => Number(l.catalog_product_id) === guisarId
    )

    // CMV por línea: costo = lastPurchase del material × qty fórmula (1), NO cost_usd del producto
    assert.exists(molidaLine)
    assert.exists(guisarLine)
    assert.equal(Number(molidaLine.cost_usd), 4)
    assert.equal(Number(guisarLine.cost_usd), 4)
    findings.push(
      'OK costo venta: ambas líneas congelan cost_usd=4 (último costo material), ignora cost_usd producto 5 y 3'
    )

    const materialAfterSale = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(materialAfterSale.body().data.material.stockActual, 15) // 40 - 10 - 15
    findings.push('OK stock material tras venta: 40 - 10 - 15 = 15 kg')

    const molidaAfter = await client.get(`/api/v1/catalog-products/${molidaId}`).loginAs(user)
    const guisarAfter = await client.get(`/api/v1/catalog-products/${guisarId}`).loginAs(user)
    assert.equal(molidaAfter.body().data.catalog_product.stock_quantity, '15.000')
    assert.equal(guisarAfter.body().data.catalog_product.stock_quantity, '15.000')
    findings.push(
      'OK stock fórmula post-venta: ambos productos muestran 15 (pozo compartido, no stock separado por corte)'
    )

    // 7) Error: vender más de lo disponible (16 kg > 15)
    const oversell = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Oversell',
        confirm: true,
        payment_type: 'CASH',
        billing_mode: 'FAST',
        payment_method_code: 'cash_usd',
        lines: [{ catalog_product_id: molidaId, quantity: 16, unit_price_usd: 8 }],
      })
    assert.isTrue(oversell.status() >= 400, `esperaba error oversell, got ${oversell.status()}`)
    findings.push(`OK oversell bloqueado: HTTP ${oversell.status()}`)

    const materialUnchanged = await client.get(`/api/v1/materials/${materialId}`).loginAs(user)
    assert.equal(materialUnchanged.body().data.material.stockActual, 15)

    // 8) Reportes financieros
    const month = DateTime.now().toFormat('yyyy-MM')

    const income = await client
      .get('/api/v1/reports/income-statement')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    income.assertStatus(200)
    const pl = income.body().data.summary
    assert.equal(Number(pl.salesRevenueUsd), 170)
    // CMV = 10×4 + 15×4 = 100
    assert.equal(Number(pl.cogsUsd), 100)
    assert.equal(Number(pl.grossProfitUsd), 70)
    findings.push(
      `OK estado resultados: ingresos=170, CMV=100 (no 10×5+15×3=95), utilidad bruta=70`
    )

    const flujo = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    flujo.assertStatus(200)
    const cash = flujo.body().data.summary
    // Cobros ventas 170; pagos proveedores = compra contado 160
    assert.equal(Number(cash.salesUsd), 170)
    assert.equal(Number(cash.purchasesUsd), 160)
    const net = Number(cash.netUsd)
    assert.equal(net, 10) // 170 - 160
    findings.push(`OK flujo de caja: cobros=170, pagos compra=160, neto=10`)

    const patrimonio = await client
      .get('/api/v1/reports/balance-position')
      .qs({ display_currency: 'USD' })
      .loginAs(user)
    patrimonio.assertStatus(200)
    const bal = patrimonio.body().data.summary
    // Inventario = solo material restante 15 × 4 = 60 (productos con fórmula excluidos)
    assert.equal(Number(bal.inventoryUsd), 60)
    findings.push(
      `OK patrimonio: inventario valorizado=${bal.inventoryUsd} (= 15 kg × 4); productos-fórmula no suman stock propio`
    )

    const resumen = await client
      .get('/api/v1/reports/financial-summary')
      .qs({ month, display_currency: 'USD' })
      .loginAs(user)
    resumen.assertStatus(200)
    const fin = resumen.body().data as {
      diagnosis: { tone: string; headline: string }
      resultado: { operatingIncomeUsd: string }
      flujo: { netUsd: string }
    }
    assert.equal(Number(fin.resultado.operatingIncomeUsd), 70)
    assert.equal(Number(fin.flujo.netUsd), 10)
    findings.push(
      `OK resumen financiero: utilidad operativa=70, flujo neto=10; diagnosis=${fin.diagnosis.headline}`
    )

    // 9) Ajuste manual de producto con fórmula debe rechazarse
    const adjust = await client
      .post(`/api/v1/catalog-products/${molidaId}/adjustment`)
      .loginAs(user)
      .json({ mode: 'CARGO', quantity: 5, note: 'no debería' })
    assert.isTrue(adjust.status() >= 400, `esperaba rechazo ajuste fórmula, got ${adjust.status()}`)
    findings.push(`OK rechazo ajuste manual producto-fórmula: HTTP ${adjust.status()}`)

    // Imprimir hallazgos en assertion message si algo falla después — y dejar rastro en console
    console.log('\n=== HALLAZGOS meat_formula_flow ===')
    for (const line of findings) {
      console.log(`- ${line}`)
    }
    console.log('=== FIN HALLAZGOS ===\n')
  })
})
