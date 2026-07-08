import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import ProductInventoryMovement from '#models/product_inventory_movement'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
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
      category: 'FABRIC',
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
})
