import User from '#models/user'
import Currency from '#models/currency'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-incomes@negapos.local'
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

test.group('Incomes API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('CRUD /api/v1/incomes', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const createResponse = await client.post('/api/v1/incomes').loginAs(user).json({
      date: '2026-06-01',
      description: 'Aporte de capital',
      amount_usd: 1000,
    })

    createResponse.assertStatus(200)
    const incomeId = createResponse.body().data.income.id

    const listResponse = await client.get('/api/v1/incomes').loginAs(user)
    listResponse.assertStatus(200)
    listResponse.assertBodyContains({
      data: {
        incomes: [{ description: 'Aporte de capital', amountUsd: '1000.0000' }],
      },
    })

    const updateResponse = await client.put(`/api/v1/incomes/${incomeId}`).loginAs(user).json({
      date: '2026-06-02',
      description: 'Aporte actualizado',
      amount_usd: 1500,
    })

    updateResponse.assertStatus(200)
    updateResponse.assertBodyContains({
      data: {
        income: {
          description: 'Aporte actualizado',
          amountUsd: '1500.0000',
        },
      },
    })

    const deleteResponse = await client.delete(`/api/v1/incomes/${incomeId}`).loginAs(user)
    deleteResponse.assertStatus(200)
    deleteResponse.assertBodyContains({ data: { eliminado: true } })
  })

  test('POST /api/v1/incomes accepts VES with entry_rate without changing catalog', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await Currency.query().where('code', 'VES').update({ ratePerUsd: '100.0000' })

    const response = await client.post('/api/v1/incomes').loginAs(user).json({
      date: '2026-06-01',
      description: 'Ingreso en bolívares',
      amount: 400,
      currency_code: 'VES',
      entry_rate: 40,
    })

    response.assertStatus(200)
    assert.equal(response.body().data.income.currencyCode, 'VES')
    assert.equal(response.body().data.income.amount, '400.0000')
    assert.equal(response.body().data.income.amountUsd, '10.0000')
    assert.equal(response.body().data.income.entryRate, '40.000000')

    const ves = await Currency.findByOrFail('code', 'VES')
    assert.equal(ves.ratePerUsd, '100.0000')
  })

  test('GET /api/v1/incomes/summary includes weekly received', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await client
      .post('/api/v1/incomes')
      .loginAs(user)
      .json({
        date: new Date().toISOString().slice(0, 10),
        description: 'Ingreso semana',
        amount_usd: 250,
      })

    const response = await client.get('/api/v1/incomes/summary').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        summary: {
          count: 1,
          weeklyReceivedUsd: '250.0000',
        },
      },
    })
  })
})
