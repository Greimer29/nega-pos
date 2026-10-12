import CatalogProduct from '#models/catalog_product'
import PaymentMethod from '#models/payment_method'
import Sale from '#models/sale'
import SalesShift from '#models/sales_shift'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-offline-sales@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Offline',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Offline sales sync', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('POST /sales/offline is idempotent and assigns server code', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()

    const product = await CatalogProduct.create({
      name: 'Producto Offline Test',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '100.0000',
      active: true,
    })

    await SalesShift.create({
      openedAt: DateTime.now(),
      openedByUserId: user.id,
      status: 'OPEN',
    })

    const offlineClientId = 'offlineclientid001'
    const payload = {
      offline_client_id: offlineClientId,
      sold_at: DateTime.now().toISO(),
      payment_type: 'CASH',
      billing_mode: 'FAST',
      discount_usd: 0,
      payments: [
        {
          payment_method_code: method.code,
          amount_usd: 10,
          currency_code: method.currencyCode,
          usd_rate: 1,
        },
      ],
      lines: [
        {
          catalog_product_id: Number(product.id),
          quantity: 1,
          unit_price_usd: 10,
        },
      ],
    }

    const first = await client.post('/api/v1/sales/offline').loginAs(user).json(payload)
    first.assertStatus(200)
    assert.equal(first.body().data.already_synced, false)
    assert.isString(first.body().data.sale.code)
    assert.isTrue(String(first.body().data.sale.code).length > 0)

    const saleId = first.body().data.sale.id as number
    const code = first.body().data.sale.code as string

    const second = await client.post('/api/v1/sales/offline').loginAs(user).json(payload)
    second.assertStatus(200)
    assert.equal(second.body().data.already_synced, true)
    assert.equal(second.body().data.sale.id, saleId)
    assert.equal(second.body().data.sale.code, code)

    const count = await Sale.query().where('offlineClientId', offlineClientId).count('* as total')
    assert.equal(Number(count[0].$extras.total), 1)
  })

  test('GET /sales/offline-catalog returns snapshot payload', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const response = await client.get('/api/v1/sales/offline-catalog').loginAs(user)
    response.assertStatus(200)
    const catalog = response.body().data.catalog
    assert.isArray(catalog.products)
    assert.isArray(catalog.materials)
    assert.isArray(catalog.customers)
    assert.isArray(catalog.payment_methods)
    assert.isArray(catalog.currencies)
  })
})
