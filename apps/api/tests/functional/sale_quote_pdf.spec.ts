import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Sale from '#models/sale'
import User from '#models/user'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const ADMIN_EMAIL = 'test-quote-admin@negapos.local'
const SELLER_EMAIL = 'test-quote-seller@negapos.local'
const NO_SALES_EMAIL = 'test-quote-nosales@negapos.local'
const PASSWORD = 'password123'

async function seedUsers() {
  await User.updateOrCreate(
    { email: ADMIN_EMAIL },
    { password: PASSWORD, name: 'Quote Admin', role: 'ADMIN', active: true }
  )
  await User.updateOrCreate(
    { email: SELLER_EMAIL },
    {
      password: PASSWORD,
      name: 'Quote Seller',
      role: 'OPERATOR',
      permissions: ['ventas.view'],
      active: true,
    }
  )
  await User.updateOrCreate(
    { email: NO_SALES_EMAIL },
    {
      password: PASSWORD,
      name: 'No Sales',
      role: 'OPERATOR',
      permissions: ['settings.view'],
      active: true,
    }
  )
}

async function createDraft(admin: User, client: any) {
  const product = await CatalogProduct.create({
    name: 'Camisa escolar',
    category: 'UNIFORM',
    salePriceUsd: '0.5000',
    stockQuantity: '10.000',
    active: true,
  })
  const customer = await Customer.create({
    name: 'Cliente Presupuesto',
    type: 'CORPORATE',
    document: 'J-12345678-9',
    phone: '0414-1234567',
    active: true,
  })

  const response = await client
    .post('/api/v1/sales')
    .loginAs(admin)
    .json({
      customer_id: Number(customer.id),
      discount_usd: 0.1,
      lines: [{ catalog_product_id: Number(product.id), quantity: 2, unit_price_usd: 0.5 }],
    })
  response.assertStatus(200)
  return Number(response.body().data.sale.id)
}

test.group('Sale quote PDF', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedUsers()
  })

  test('GET /api/v1/sales/:id/quote-pdf returns a PDF for a draft', async ({ client, assert }) => {
    const admin = await User.findByOrFail('email', ADMIN_EMAIL)
    const saleId = await createDraft(admin, client)

    const response = await client
      .get(`/api/v1/sales/${saleId}/quote-pdf`)
      .qs({ currency: 'usd' })
      .loginAs(admin)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    assert.include(
      String(response.header('content-disposition')),
      `filename="Presupuesto-${saleId}.pdf"`
    )
    const body: unknown = response.body()
    assert.isTrue(Buffer.isBuffer(body))
    assert.equal((body as Buffer).subarray(0, 5).toString('latin1'), '%PDF-')
  })

  test('a seller with ventas.view can download the quote', async ({ client }) => {
    const admin = await User.findByOrFail('email', ADMIN_EMAIL)
    const seller = await User.findByOrFail('email', SELLER_EMAIL)
    const saleId = await createDraft(admin, client)

    const response = await client.get(`/api/v1/sales/${saleId}/quote-pdf`).loginAs(seller)
    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
  })

  test('users without ventas.view cannot download the quote', async ({ client }) => {
    const admin = await User.findByOrFail('email', ADMIN_EMAIL)
    const noSales = await User.findByOrFail('email', NO_SALES_EMAIL)
    const saleId = await createDraft(admin, client)

    const response = await client.get(`/api/v1/sales/${saleId}/quote-pdf`).loginAs(noSales)
    response.assertStatus(403)
  })

  test('only drafts have a quote', async ({ client }) => {
    const admin = await User.findByOrFail('email', ADMIN_EMAIL)
    const saleId = await createDraft(admin, client)
    await Sale.query().where('id', saleId).update({ status: 'COMPLETED', code: '0000000001' })

    const response = await client.get(`/api/v1/sales/${saleId}/quote-pdf`).loginAs(admin)
    response.assertStatus(409)
    response.assertBodyContains({ error: { code: 'VENTA_NO_EDITABLE' } })
  })

  test('rejects currencies that are not active', async ({ client }) => {
    const admin = await User.findByOrFail('email', ADMIN_EMAIL)
    const saleId = await createDraft(admin, client)

    const response = await client
      .get(`/api/v1/sales/${saleId}/quote-pdf`)
      .qs({ currency: 'EUR' })
      .loginAs(admin)
    response.assertStatus(404)
    response.assertBodyContains({ error: { code: 'MONEDA_NO_ENCONTRADA' } })
  })

  test('returns 404 for unknown sales', async ({ client }) => {
    const admin = await User.findByOrFail('email', ADMIN_EMAIL)

    const response = await client.get('/api/v1/sales/999999/quote-pdf').loginAs(admin)
    response.assertStatus(404)
  })

  test('settings/general stores quote validity and terms', async ({ client, assert }) => {
    const admin = await User.findByOrFail('email', ADMIN_EMAIL)

    const defaults = await client.get('/api/v1/settings/general').loginAs(admin)
    defaults.assertStatus(200)
    assert.equal(defaults.body().data.business_profile.quote_validity_days, 3)
    assert.equal(defaults.body().data.business_profile.quote_terms, '')

    const saved = await client.put('/api/v1/settings/general').loginAs(admin).json({
      trade_name: 'Mi Negocio',
      quote_validity_days: 7,
      quote_terms: '  Precios sujetos a disponibilidad.  ',
    })
    saved.assertStatus(200)
    assert.equal(saved.body().data.business_profile.quote_validity_days, 7)
    assert.equal(
      saved.body().data.business_profile.quote_terms,
      'Precios sujetos a disponibilidad.'
    )

    const invalid = await client.put('/api/v1/settings/general').loginAs(admin).json({
      trade_name: 'Mi Negocio',
      quote_validity_days: -1,
    })
    invalid.assertStatus(422)
  })
})
