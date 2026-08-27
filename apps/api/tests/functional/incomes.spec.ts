import { MONETARY_REGISTRATION_USD_MESSAGE } from '#exceptions/moneda_registro_usd_requerida_exception'
import User from '#models/user'
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

  test('POST /api/v1/incomes rejects non-base currency', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/incomes').loginAs(user).json({
      date: '2026-06-01',
      description: 'Ingreso en bolívares',
      amount_usd: 100,
      currency_code: 'VES',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'MONEDA_REGISTRO_USD_REQUERIDA',
      },
    })
    assert.include(response.body().error.message, MONETARY_REGISTRATION_USD_MESSAGE)
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
