import CatalogProduct from '#models/catalog_product'
import ProductInventoryMovement from '#models/product_inventory_movement'
import User from '#models/user'
import { seedOpenSalesShift } from '#tests/helpers/seed_test_sale'
import { seedReferenceData } from '../helpers/seed_reference_data.js'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-catalog-services@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('sales_shifts').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('catalog_product_sizes').delete()
  await db.from('catalog_products').delete()
  await db.from('counters').delete()
  await db.from('users').delete()
}

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Services',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Catalog services (item_kind SERVICE)', (group) => {
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

  test('POST creates SERVICE without inventory fields', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Instalación',
      category: 'logística',
      item_kind: 'SERVICE',
      sale_price_usd: 25,
      cost_usd: 0,
      description: 'Servicio de instalación',
    })

    response.assertStatus(200)
    const product = response.body().data.catalog_product
    assert.equal(product.item_kind, 'SERVICE')
    assert.isTrue(product.is_service)
    assert.equal(Number(product.stock_quantity), 0)
    assert.isNull(product.formula_id)
  })

  test('GET list defaults to PRODUCT and filters SERVICE', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await CatalogProduct.create({
      name: 'Camisa física',
      category: 'Uniforme',
      itemKind: 'PRODUCT',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '3.000',
      active: true,
    })
    await CatalogProduct.create({
      name: 'Envío',
      category: 'logística',
      itemKind: 'SERVICE',
      salePriceUsd: '5.0000',
      costUsd: '0.0000',
      stockQuantity: '0',
      active: true,
    })

    const productsOnly = await client.get('/api/v1/catalog-products').loginAs(user)
    productsOnly.assertStatus(200)
    const productNames = productsOnly
      .body()
      .data.catalog_products.map((p: { name: string }) => p.name)
    assert.include(productNames, 'Camisa física')
    assert.notInclude(productNames, 'Envío')

    const servicesOnly = await client
      .get('/api/v1/catalog-products')
      .loginAs(user)
      .qs({ item_kind: 'SERVICE' })
    servicesOnly.assertStatus(200)
    const serviceNames = servicesOnly
      .body()
      .data.catalog_products.map((p: { name: string }) => p.name)
    assert.include(serviceNames, 'Envío')
    assert.notInclude(serviceNames, 'Camisa física')
  })

  test('POST sale with SERVICE does not create inventory movement and accepts description', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const physical = await CatalogProduct.create({
      name: 'Producto stock',
      category: 'Uniforme',
      itemKind: 'PRODUCT',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '8.000',
      active: true,
    })
    const service = await CatalogProduct.create({
      name: 'Mano de obra',
      category: 'taller',
      itemKind: 'SERVICE',
      salePriceUsd: '20.0000',
      costUsd: '0.0000',
      stockQuantity: '0',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente servicio',
        payment_method_code: 'cash_usd',
        confirm: true,
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(physical.id),
            quantity: 2,
            unit_price_usd: 10,
          },
          {
            catalog_product_id: Number(service.id),
            quantity: 3,
            unit_price_usd: 18,
            description: 'Reparación express en taller',
          },
        ],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.status, 'COMPLETED')
    assert.equal(Number(response.body().data.sale.total_usd), 2 * 10 + 3 * 18)

    const sale = response.body().data.sale
    const serviceLine = (
      sale.lines as Array<{ catalog_product_id: number; description: string }>
    ).find((line) => Number(line.catalog_product_id) === Number(service.id))
    assert.exists(serviceLine)
    assert.equal(serviceLine?.description, 'Reparación express en taller')

    await physical.refresh()
    assert.equal(physical.stockQuantity, '6.000')

    await service.refresh()
    assert.equal(service.stockQuantity, '0')

    const serviceMovements = await ProductInventoryMovement.query().where(
      'catalogProductId',
      Number(service.id)
    )
    assert.lengthOf(serviceMovements, 0)

    const productMovements = await ProductInventoryMovement.query()
      .where('catalogProductId', Number(physical.id))
      .where('type', 'SALE_OUT')
    assert.lengthOf(productMovements, 1)
  })

  test('POST sale return does not invent stock for SERVICE', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const service = await CatalogProduct.create({
      name: 'Consultoría',
      category: 'taller',
      itemKind: 'SERVICE',
      salePriceUsd: '50.0000',
      costUsd: '0.0000',
      stockQuantity: '0',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Walk-in',
        payment_method_code: 'cash_usd',
        confirm: true,
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(service.id),
            quantity: 1,
            unit_price_usd: 50,
            description: 'Sesión 1h',
          },
        ],
      })

    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id

    const returnResponse = await client.post(`/api/v1/sales/${saleId}/return`).loginAs(user)
    returnResponse.assertStatus(200)
    assert.equal(returnResponse.body().data.sale.status, 'RETURNED')

    await service.refresh()
    assert.equal(service.stockQuantity, '0')

    const movements = await ProductInventoryMovement.query().where(
      'catalogProductId',
      Number(service.id)
    )
    assert.lengthOf(movements, 0)
  })

  test('POST SERVICE rejects formula and stock adjustment', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const withFormula = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Servicio inválido',
      category: 'taller',
      item_kind: 'SERVICE',
      sale_price_usd: 10,
      formula_id: 1,
    })
    withFormula.assertStatus(422)

    const service = await CatalogProduct.create({
      name: 'Servicio ok',
      category: 'taller',
      itemKind: 'SERVICE',
      salePriceUsd: '10.0000',
      costUsd: '0.0000',
      stockQuantity: '0',
      active: true,
    })

    const adjustment = await client
      .post(`/api/v1/catalog-products/${service.id}/adjustment`)
      .loginAs(user)
      .json({
        mode: 'CARGO',
        quantity: 5,
        note: 'no aplica',
      })
    adjustment.assertStatus(422)
  })
})
