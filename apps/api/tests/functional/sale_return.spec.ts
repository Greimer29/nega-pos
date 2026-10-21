import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Customer from '#models/customer'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import ProductInventoryMovement from '#models/product_inventory_movement'
import SaleLine from '#models/sale_line'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { seedOpenSalesShift } from '#tests/helpers/seed_test_sale'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-sale-return@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('sale_payments').delete()
  await db.from('sale_line_materials').delete()
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('catalog_product_sizes').delete()
  await db.from('catalog_products').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('materials').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('sales_shifts').delete()
  await db.from('users').delete()
}

async function materialStock(materialId: number) {
  const result = await InventoryMovement.query()
    .where('materialId', materialId)
    .sum('quantity as total')
    .first()
  return Number(result?.$extras.total ?? 0)
}

async function seedMaterialWithStock(code: string, quantity: number, extra = {}) {
  const material = await Material.create({
    code,
    name: `Material ${code}`,
    category: 'Uniforme',
    unit: 'UND',
    minimumStock: '1',
    active: true,
    ...extra,
  })
  await InventoryMovement.create({
    materialId: Number(material.id),
    type: 'PURCHASE_IN',
    quantity: String(quantity),
  })
  return material
}

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Sale Return',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Sale devolución venta API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await seedOpenSalesShift(Number(user.id))
  })

  test('POST /api/v1/sales/:id/return reintegrates catalog stock and marks RETURNED', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente devolución',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto dev',
      category: 'UNIFORM',
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '10.000',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        customer_id: Number(customer.id),
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(product.id),
            quantity: 5,
            unit_price_usd: 20,
          },
        ],
      })

    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id

    await product.refresh()
    assert.equal(product.stockQuantity, '5.000')

    const response = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.sale.status, 'RETURNED')

    await product.refresh()
    assert.equal(product.stockQuantity, '10.000')

    const saleOut = await ProductInventoryMovement.query()
      .where('catalogProductId', Number(product.id))
      .where('type', 'SALE_OUT')
      .first()

    assert.exists(saleOut)
  })

  test('POST /api/v1/sales/:id/return partial reintegrates material stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await Material.create({
      code: 'MAT-DEV',
      name: 'Material devolución',
      category: 'Uniforme',
      unit: 'ROL',
      minimumStock: '1',
      active: true,
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '100',
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Walk-in',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            material_id: Number(material.id),
            quantity: 10,
            unit_price_usd: 5,
          },
        ],
      })

    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id
    const lineId = createResponse.body().data.sale.lines[0].id

    const response = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({
        lines: [{ line_id: lineId, quantity: 4 }],
      })

    response.assertStatus(200)

    const stockResult = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(stockResult?.$extras.total), 94)
  })

  test('POST /api/v1/sales/:id/return scales invoice discount into net refund totals', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const productA = await CatalogProduct.create({
      name: 'Prod A',
      category: 'General',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '20.000',
      active: true,
    })
    const productB = await CatalogProduct.create({
      name: 'Prod B',
      category: 'General',
      salePriceUsd: '5.0000',
      costUsd: '2.0000',
      stockQuantity: '20.000',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente desc',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        discount_usd: 6,
        lines: [
          { catalog_product_id: Number(productA.id), quantity: 2, unit_price_usd: 10 },
          { catalog_product_id: Number(productB.id), quantity: 2, unit_price_usd: 5 },
        ],
      })

    createResponse.assertStatus(200)
    const sale = createResponse.body().data.sale as {
      id: number
      total_usd: string
      discount_usd: string
      lines: Array<{ id: number; catalog_product_id: number }>
    }
    assert.equal(sale.total_usd, '24.0000')
    assert.equal(sale.discount_usd, '6.0000')

    const lineA = sale.lines.find((line) => line.catalog_product_id === Number(productA.id))!

    const partial = await client
      .post(`/api/v1/sales/${sale.id}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: lineA.id, quantity: 2 }] })

    partial.assertStatus(200)
    const afterPartial = partial.body().data.sale as {
      status: string
      total_usd: string
      discount_usd: string
    }
    assert.equal(afterPartial.status, 'COMPLETED')
    assert.equal(afterPartial.total_usd, '8.0000')
    assert.equal(afterPartial.discount_usd, '2.0000')

    const full = await client.post(`/api/v1/sales/${sale.id}/return`).loginAs(user)
    full.assertStatus(200)
    const afterFull = full.body().data.sale as {
      status: string
      total_usd: string
      discount_usd: string
    }
    assert.equal(afterFull.status, 'RETURNED')
    assert.equal(afterFull.total_usd, '0.0000')
    assert.equal(afterFull.discount_usd, '0.0000')
  })

  test('POST /api/v1/sales/:id/return voids amount-only credit invoice without lines', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente CxC monto',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    const invoiceResponse = await client
      .post(`/api/v1/customers/${customer.id}/invoices`)
      .loginAs(user)
      .json({
        amount: 0.5,
        currency_code: 'XAU',
        is_credit: true,
        date: '2026-10-03',
        credit_due_date: '2026-11-02',
      })

    invoiceResponse.assertStatus(200)
    const sale = invoiceResponse.body().data.sale as {
      id: number
      total_usd: string
      balance_usd: string
      status: string
      lines: unknown[]
    }
    assert.equal(sale.status, 'COMPLETED')
    assert.equal(sale.total_usd, '0.5000')
    assert.equal(sale.balance_usd, '0.5000')
    assert.lengthOf(sale.lines ?? [], 0)

    const returnResponse = await client.post(`/api/v1/sales/${sale.id}/return`).loginAs(user)

    returnResponse.assertStatus(200)
    const after = returnResponse.body().data.sale as {
      status: string
      total_usd: string
      balance_usd: string
      amount_paid_usd: string
    }
    assert.equal(after.status, 'RETURNED')
    assert.equal(after.total_usd, '0.0000')
    assert.equal(after.balance_usd, '0.0000')
    assert.equal(after.amount_paid_usd, '0.0000')
  })

  test('partial then total catalog return restores stock once and blocks a third return', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Producto parcial',
      category: 'General',
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      stockQuantity: '10.000',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente parcial',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [{ catalog_product_id: Number(product.id), quantity: 6, unit_price_usd: 20 }],
      })
    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id
    const lineId = createResponse.body().data.sale.lines[0].id

    await product.refresh()
    assert.equal(product.stockQuantity, '4.000')

    const partial = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: lineId, quantity: 2 }] })
    partial.assertStatus(200)
    assert.equal(partial.body().data.sale.status, 'COMPLETED')
    assert.equal(partial.body().data.sale.total_usd, '80.0000')
    assert.equal(partial.body().data.sale.amount_paid_usd, '80.0000')
    assert.equal(partial.body().data.sale.balance_usd, '0.0000')

    await product.refresh()
    assert.equal(product.stockQuantity, '6.000')

    const full = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    full.assertStatus(200)
    assert.equal(full.body().data.sale.status, 'RETURNED')
    assert.equal(full.body().data.sale.total_usd, '0.0000')

    await product.refresh()
    assert.equal(product.stockQuantity, '10.000')

    const again = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    again.assertStatus(422)
    assert.equal(again.body().error.code, 'ORDER_NOT_RETURNABLE')

    await product.refresh()
    assert.equal(product.stockQuantity, '10.000')

    const reversals = await ProductInventoryMovement.query()
      .where('catalogProductId', Number(product.id))
      .where('type', 'REVERSAL_ADJUSTMENT')
    assert.equal(
      reversals.reduce((sum, movement) => sum + Number(movement.quantity), 0),
      6
    )
    const saleCode = createResponse.body().data.sale.code
    for (const movement of reversals) {
      assert.equal(movement.note, `Devolución factura ${saleCode}`)
    }
  })

  test('returning more than the remaining quantity rolls back, then total material return restores stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterialWithStock('MAT-TOTAL', 100)

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente material',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [{ material_id: Number(material.id), quantity: 10, unit_price_usd: 5 }],
      })
    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id
    const lineId = createResponse.body().data.sale.lines[0].id
    assert.equal(await materialStock(Number(material.id)), 90)

    const excess = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: lineId, quantity: 11 }] })
    excess.assertStatus(422)
    assert.equal(await materialStock(Number(material.id)), 90)

    const line = await SaleLine.findOrFail(lineId)
    assert.equal(Number(line.returnedQuantity), 0)

    const full = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    full.assertStatus(200)
    assert.equal(full.body().data.sale.status, 'RETURNED')
    assert.equal(full.body().data.sale.total_usd, '0.0000')
    assert.equal(await materialStock(Number(material.id)), 100)
  })

  test('formula product partial and total return restore recipe materials only', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterialWithStock('MAT-RECETA', 100)

    const formulaRes = await client
      .post('/api/v1/formulas')
      .loginAs(user)
      .json({ name: 'Receta devolución' })
    formulaRes.assertStatus(200)
    const formulaId = Number(formulaRes.body().data.formula.id)
    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({ items: [{ material_id: Number(material.id), quantity: 2 }] })
      .then((response) => response.assertStatus(200))

    const productRes = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Producto con receta',
      category: 'Uniforme',
      sale_price_usd: 15,
      formula_id: formulaId,
    })
    productRes.assertStatus(200)
    const productId = Number(productRes.body().data.catalog_product.id)

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente receta',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [{ catalog_product_id: productId, quantity: 3, unit_price_usd: 15 }],
      })
    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id
    const lineId = createResponse.body().data.sale.lines[0].id
    assert.equal(await materialStock(Number(material.id)), 94)

    const partial = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: lineId, quantity: 1 }] })
    partial.assertStatus(200)
    assert.equal(partial.body().data.sale.status, 'COMPLETED')
    assert.equal(partial.body().data.sale.total_usd, '30.0000')
    assert.equal(await materialStock(Number(material.id)), 96)

    const full = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    full.assertStatus(200)
    assert.equal(full.body().data.sale.status, 'RETURNED')
    assert.equal(await materialStock(Number(material.id)), 100)

    const productMovements = await ProductInventoryMovement.query().where(
      'catalogProductId',
      productId
    )
    assert.lengthOf(productMovements, 0)
  })

  test('wholesale material return restores packs times units per pack', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterialWithStock('MAT-PACK', 100, {
      wholesaleEnabled: true,
      wholesaleUnitsPerPack: '12.000',
      wholesaleCostUsd: '6.0000',
      wholesaleSalePriceUsd: '10.0000',
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente mayorista',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            material_id: Number(material.id),
            quantity: 2,
            unit_price_usd: 10,
            is_wholesale: true,
          },
        ],
      })
    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id
    const lineId = createResponse.body().data.sale.lines[0].id
    assert.equal(await materialStock(Number(material.id)), 76)

    const partial = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: lineId, quantity: 1 }] })
    partial.assertStatus(200)
    assert.equal(partial.body().data.sale.status, 'COMPLETED')
    assert.equal(partial.body().data.sale.total_usd, '10.0000')
    assert.equal(await materialStock(Number(material.id)), 88)

    const full = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    full.assertStatus(200)
    assert.equal(full.body().data.sale.status, 'RETURNED')
    assert.equal(await materialStock(Number(material.id)), 100)
  })

  test('service line return recalculates totals without stock and product line restores stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Producto con servicio',
      category: 'General',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '5.000',
      active: true,
    })
    const service = await CatalogProduct.create({
      name: 'Instalación',
      category: 'Servicios',
      salePriceUsd: '25.0000',
      itemKind: 'SERVICE',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente servicio',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          { catalog_product_id: Number(product.id), quantity: 2, unit_price_usd: 10 },
          { catalog_product_id: Number(service.id), quantity: 1, unit_price_usd: 25 },
        ],
      })
    createResponse.assertStatus(200)
    const sale = createResponse.body().data.sale as {
      id: number
      lines: Array<{ id: number; catalog_product_id: number }>
    }
    const serviceLine = sale.lines.find((line) => line.catalog_product_id === Number(service.id))!

    const serviceReturn = await client
      .post(`/api/v1/sales/${sale.id}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: serviceLine.id, quantity: 1 }] })
    serviceReturn.assertStatus(200)
    assert.equal(serviceReturn.body().data.sale.status, 'COMPLETED')
    assert.equal(serviceReturn.body().data.sale.total_usd, '20.0000')

    await product.refresh()
    assert.equal(product.stockQuantity, '3.000')
    const serviceMovements = await ProductInventoryMovement.query().where(
      'catalogProductId',
      Number(service.id)
    )
    assert.lengthOf(serviceMovements, 0)

    const full = await client.post(`/api/v1/sales/${sale.id}/return`).loginAs(user)
    full.assertStatus(200)
    assert.equal(full.body().data.sale.status, 'RETURNED')
    assert.equal(full.body().data.sale.total_usd, '0.0000')

    await product.refresh()
    assert.equal(product.stockQuantity, '5.000')
  })

  test('credit sale partial return lowers outstanding balance', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente crédito devolución',
      type: 'CORPORATE',
      creditDays: 15,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto crédito',
      category: 'General',
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      stockQuantity: '10.000',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        customer_id: Number(customer.id),
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CREDIT',
        lines: [{ catalog_product_id: Number(product.id), quantity: 5, unit_price_usd: 20 }],
      })
    createResponse.assertStatus(200)
    const sale = createResponse.body().data.sale
    assert.equal(sale.balance_usd, '100.0000')
    assert.equal(sale.amount_paid_usd, '0.0000')

    const partial = await client
      .post(`/api/v1/sales/${sale.id}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: sale.lines[0].id, quantity: 2 }] })
    partial.assertStatus(200)
    assert.equal(partial.body().data.sale.status, 'COMPLETED')
    assert.equal(partial.body().data.sale.total_usd, '60.0000')
    assert.equal(partial.body().data.sale.balance_usd, '60.0000')
    assert.equal(partial.body().data.sale.amount_paid_usd, '0.0000')

    await product.refresh()
    assert.equal(product.stockQuantity, '7.000')
  })

  test('sized product return restores size and product stock', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const productRes = await client
      .post('/api/v1/catalog-products')
      .loginAs(user)
      .json({
        name: 'Zapato devolución',
        category: 'Uniforme',
        sale_price_usd: 30,
        sizes: [
          { size: '38', stock_quantity: 5 },
          { size: '40', stock_quantity: 2 },
        ],
      })
    productRes.assertStatus(200)
    const product = productRes.body().data.catalog_product
    const size38 = product.sizes.find((row: { size: string }) => row.size === '38')

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente talla',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: product.id,
            catalog_product_size_id: size38.id,
            size: '38',
            quantity: 2,
            unit_price_usd: 30,
          },
        ],
      })
    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id
    const lineId = createResponse.body().data.sale.lines[0].id

    const partial = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: lineId, quantity: 1 }] })
    partial.assertStatus(200)

    let sizeRow = await CatalogProductSize.findOrFail(size38.id)
    assert.equal(Number(sizeRow.stockQuantity), 4)
    let refreshed = await CatalogProduct.findOrFail(product.id)
    assert.equal(Number(refreshed.stockQuantity), 6)

    const full = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    full.assertStatus(200)
    assert.equal(full.body().data.sale.status, 'RETURNED')

    sizeRow = await CatalogProductSize.findOrFail(size38.id)
    assert.equal(Number(sizeRow.stockQuantity), 5)
    refreshed = await CatalogProduct.findOrFail(product.id)
    assert.equal(Number(refreshed.stockQuantity), 7)
  })
})
