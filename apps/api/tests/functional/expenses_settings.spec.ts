import User from '#models/user'
import Currency from '#models/currency'
import Machine from '#models/machine'
import MachineExpense from '#models/machine_expense'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-expenses-settings@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Test',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Expenses and settings API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('CRUD /api/v1/expenses', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const createResponse = await client.post('/api/v1/expenses').loginAs(user).json({
      date: '2026-06-01',
      description: 'Transporte',
      amount_usd: 25.5,
    })

    createResponse.assertStatus(200)
    const expenseId = createResponse.body().data.expense.id

    const listResponse = await client.get('/api/v1/expenses').loginAs(user)
    listResponse.assertStatus(200)
    listResponse.assertBodyContains({
      data: {
        expenses: [{ description: 'Transporte', amountUsd: '25.5000' }],
      },
    })

    const updateResponse = await client.put(`/api/v1/expenses/${expenseId}`).loginAs(user).json({
      date: '2026-06-02',
      description: 'Transporte actualizado',
      amount_usd: 30,
    })

    updateResponse.assertStatus(200)
    updateResponse.assertBodyContains({
      data: {
        expense: {
          description: 'Transporte actualizado',
          amountUsd: '30.0000',
        },
      },
    })

    const deleteResponse = await client.delete(`/api/v1/expenses/${expenseId}`).loginAs(user)
    deleteResponse.assertStatus(200)
    deleteResponse.assertBodyContains({ data: { eliminado: true } })
  })

  test('POST /api/v1/expenses accepts VES with entry_rate without changing catalog', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await db.from('currencies').where('code', 'VES').update({ rate_per_usd: '100.0000' })

    const response = await client.post('/api/v1/expenses').loginAs(user).json({
      date: '2026-06-01',
      description: 'Gasto en bolívares',
      amount: 400,
      currency_code: 'VES',
      entry_rate: 40,
    })

    response.assertStatus(200)
    assert.equal(response.body().data.expense.currencyCode, 'VES')
    assert.equal(response.body().data.expense.amount, '400.0000')
    assert.equal(response.body().data.expense.amountUsd, '10.0000')
    assert.equal(response.body().data.expense.entryRate, '40.000000')

    const ves = await Currency.findByOrFail('code', 'VES')
    assert.equal(ves.ratePerUsd, '100.0000')
  })

  test('GET /api/v1/expenses/summary includes weekly spent', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await client
      .post('/api/v1/expenses')
      .loginAs(user)
      .json({
        date: new Date().toISOString().slice(0, 10),
        description: 'Gasto semana',
        amount_usd: 100,
      })

    const response = await client.get('/api/v1/expenses/summary').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        summary: {
          count: 1,
          weeklySpentUsd: '100.0000',
        },
      },
    })
  })

  test('GET/PUT /api/v1/settings/exchange-rate', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const getEmpty = await client.get('/api/v1/settings/exchange-rate').loginAs(user)
    getEmpty.assertStatus(200)
    assert.isString(getEmpty.body().data.usdRate)

    const putResponse = await client
      .put('/api/v1/settings/exchange-rate')
      .loginAs(user)
      .json({ usd_rate: 36.5 })

    putResponse.assertStatus(200)
    putResponse.assertBodyContains({ data: { usdRate: '36.5000' } })

    const getResponse = await client.get('/api/v1/settings/exchange-rate').loginAs(user)
    getResponse.assertStatus(200)
    getResponse.assertBodyContains({ data: { usdRate: '36.5000' } })
  })

  test('GET/PUT /api/v1/settings/general', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const getDefault = await client.get('/api/v1/settings/general').loginAs(user)
    getDefault.assertStatus(200)
    getDefault.assertBodyContains({
      data: {
        business_profile: {
          trade_name: '',
          has_logo: false,
          use_custom_palette: false,
        },
      },
    })

    const putResponse = await client
      .put('/api/v1/settings/general')
      .loginAs(user)
      .json({
        trade_name: 'Mi Negocio',
        tagline: 'Uniformes escolares',
        ticket_footer: '¡Gracias!',
        legal_name: 'Mi Negocio C.A.',
        rif: 'J-12345678-9',
        address: 'Av. Principal',
        phone: '0414-0000000',
        email: 'info@minegocio.local',
        website: 'https://minegocio.local',
        use_custom_palette: true,
        palette: {
          primary: '#112233',
          secondary: '#aabbcc',
          accent: '#ff5500',
        },
      })

    putResponse.assertStatus(200)
    putResponse.assertBodyContains({
      data: {
        business_profile: {
          trade_name: 'Mi Negocio',
          tagline: 'Uniformes escolares',
          rif: 'J-12345678-9',
          use_custom_palette: true,
          palette: {
            primary: '#112233',
            secondary: '#aabbcc',
            accent: '#ff5500',
          },
        },
      },
    })

    const getResponse = await client.get('/api/v1/settings/general').loginAs(user)
    getResponse.assertStatus(200)
    assert.equal(getResponse.body().data.business_profile.trade_name, 'Mi Negocio')
  })

  test('POST/GET/DELETE /api/v1/settings/general/logo', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )

    const uploadResponse = await client
      .post('/api/v1/settings/general/logo')
      .loginAs(user)
      .file('logo', png, {
        filename: 'logo.png',
        contentType: 'image/png',
      })

    uploadResponse.assertStatus(200)
    uploadResponse.assertBodyContains({
      data: {
        business_profile: {
          has_logo: true,
        },
      },
    })

    const downloadResponse = await client.get('/api/v1/settings/general/logo').loginAs(user)
    downloadResponse.assertStatus(200)
    downloadResponse.assertHeader('content-type', 'image/png')

    const deleteResponse = await client.delete('/api/v1/settings/general/logo').loginAs(user)
    deleteResponse.assertStatus(200)
    deleteResponse.assertBodyContains({
      data: {
        business_profile: {
          has_logo: false,
        },
      },
    })

    const missingLogo = await client.get('/api/v1/settings/general/logo').loginAs(user)
    missingLogo.assertStatus(404)
  })

  test('GET/PUT /api/v1/settings/profit-margin', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const getEmpty = await client.get('/api/v1/settings/profit-margin').loginAs(user)
    getEmpty.assertStatus(200)
    getEmpty.assertBodyContains({ data: { profitMarginPercent: null } })

    const putResponse = await client
      .put('/api/v1/settings/profit-margin')
      .loginAs(user)
      .json({ profit_margin_percent: 30 })

    putResponse.assertStatus(200)
    putResponse.assertBodyContains({ data: { profitMarginPercent: '30.00' } })

    const getResponse = await client.get('/api/v1/settings/profit-margin').loginAs(user)
    getResponse.assertStatus(200)
    getResponse.assertBodyContains({ data: { profitMarginPercent: '30.00' } })
  })

  test('GET /api/v1/dashboard/overview fails when VES exchange rate is invalid', async ({
    client,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!
    const machine = await Machine.create({
      name: 'Overlock tasa inválida',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })

    await Currency.query().where('code', 'VES').update({ ratePerUsd: '0.0000' })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(hoy),
      category: 'REPAIR',
      description: 'Gasto en VES',
      amount: '100.0000',
      currencyCode: 'VES',
    })

    const response = await client.get('/api/v1/dashboard/overview').loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'TASA_CAMBIO_INVALIDA',
      },
    })
  })
})
