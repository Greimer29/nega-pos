import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import ProductInventoryMovement from '#models/product_inventory_movement'
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
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('catalog_products').delete()
  await db.from('materials').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('sales_shifts').delete()
  await db.from('users').delete()
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
})
