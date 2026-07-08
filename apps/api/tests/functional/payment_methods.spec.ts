import PaymentMethod from '#models/payment_method'
import Sale from '#models/sale'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { seedTestSale } from '#tests/helpers/seed_test_sale'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-payment-methods@negapos.local'
const TEST_PASSWORD = 'password123'

const SEEDED_PAYMENT_METHOD_CODES = [
  'cash_usd',
  'cash_bs',
  'transfer',
  'mobile_payment',
  'zelle',
  'binance',
] as const

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Payment Methods',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Payment methods API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
    await PaymentMethod.query().whereNotIn('code', [...SEEDED_PAYMENT_METHOD_CODES]).delete()
  })

  group.each.teardown(async () => {
    await PaymentMethod.query().update({ isActive: true })
  })

  test('GET /api/v1/payment-methods lists seeded methods', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.get('/api/v1/payment-methods').loginAs(user)

    response.assertStatus(200)
    const methods = response.body().data.payment_methods as Array<{ code: string }>
    assert.isTrue(methods.some((method) => method.code === 'cash_usd'))
    assert.isTrue(methods.some((method) => method.code === 'zelle'))
  })

  test('POST /api/v1/payment-methods creates a method', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/payment-methods').loginAs(user).json({
      code: 'wire_usd',
      name: 'Transferencia USD',
      currency_code: 'USD',
      sort_order: 99,
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        payment_method: {
          code: 'wire_usd',
          name: 'Transferencia USD',
          currency_code: 'USD',
          is_active: true,
        },
      },
    })
  })

  test('POST /api/v1/payment-methods rejects duplicate code', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/payment-methods').loginAs(user).json({
      code: 'cash_usd',
      name: 'Duplicado',
      currency_code: 'USD',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: { code: 'CODIGO_METODO_PAGO_DUPLICADO' },
    })
  })

  test('PUT /api/v1/payment-methods/:code updates method', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.put('/api/v1/payment-methods/zelle').loginAs(user).json({
      name: 'Zelle actualizado',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        payment_method: {
          code: 'zelle',
          name: 'Zelle actualizado',
        },
      },
    })
  })

  test('DELETE /api/v1/payment-methods/:code hard-deletes unused method', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await PaymentMethod.create({
      code: 'temp_method',
      name: 'Temporal',
      currencyCode: 'USD',
      isActive: true,
      sortOrder: 100,
    })

    const response = await client.delete('/api/v1/payment-methods/temp_method').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { code: 'temp_method', modo: 'hard' } })

    const deleted = await PaymentMethod.findBy('code', 'temp_method')
    assert.isNull(deleted)
  })

  test('DELETE /api/v1/payment-methods/:code soft-deletes method in use', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await seedTestSale({
      totalUsd: '10.0000',
      paymentMethodCode: 'zelle',
      lines: [{ quantity: '1', unitPriceUsd: '10.0000' }],
    })

    const response = await client.delete('/api/v1/payment-methods/zelle').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({ data: { code: 'zelle', modo: 'soft' } })

    const method = await PaymentMethod.findByOrFail('code', 'zelle')
    assert.equal(Number(method.isActive), 0)

    const sale = await Sale.query().where('paymentMethodCode', 'zelle').firstOrFail()
    assert.equal(sale.paymentMethodCode, 'zelle')
  })

  test('PUT deactivate last active method returns 422', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const methods = await PaymentMethod.query().where('isActive', true)
    for (const method of methods) {
      if (method.code !== 'cash_usd') {
        method.isActive = false
        await method.save()
      }
    }

    const response = await client.put('/api/v1/payment-methods/cash_usd').loginAs(user).json({
      is_active: false,
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: { code: 'ULTIMO_METODO_PAGO_ACTIVO' },
    })
  })
})
