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
})
