import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-users@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Test',
      role: 'ADMIN',
      active: true,
      permissions: null,
    }
  )
}

test.group('Users API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/auth/me returns permissions for admin', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.get('/api/v1/auth/me').loginAs(user)

    response.assertStatus(200)

    const body = response.body() as { data: { user: { permissions: string[] } } }
    assert.deepEqual(body.data.user.permissions, ['*'])
  })

  test('admin creates operator with partial permissions', async ({ client, assert }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .post('/api/v1/users')
      .loginAs(admin)
      .json({
        name: 'Operador Ventas',
        email: 'operador@negapos.local',
        password: 'password123',
        role: 'OPERATOR',
        permissions: ['dashboard.view', 'ventas.view'],
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: { user: { role: string; permissions: string[] } }
    }
    assert.equal(body.data.user.role, 'OPERATOR')
    assert.includeMembers(body.data.user.permissions, ['dashboard.view', 'ventas.view'])
  })

  test('operator without users.manage cannot create users', async ({ client }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    await client
      .post('/api/v1/users')
      .loginAs(admin)
      .json({
        name: 'Operador Limitado',
        email: 'limitado@negapos.local',
        password: 'password123',
        role: 'OPERATOR',
        permissions: ['dashboard.view'],
      })

    const operator = await User.findByOrFail('email', 'limitado@negapos.local')

    const response = await client
      .post('/api/v1/users')
      .loginAs(operator)
      .json({
        name: 'Otro',
        email: 'otro@negapos.local',
        password: 'password123',
        role: 'OPERATOR',
        permissions: ['dashboard.view'],
      })

    response.assertStatus(403)
    response.assertBodyContains({
      error: { code: 'PERMISO_DENEGADO' },
    })
  })

  test('operator without ventas.confirm cannot create orders', async ({ client }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    await client
      .post('/api/v1/users')
      .loginAs(admin)
      .json({
        name: 'Solo Ver Ventas',
        email: 'verventas@negapos.local',
        password: 'password123',
        role: 'OPERATOR',
        permissions: ['ventas.view'],
      })

    const operator = await User.findByOrFail('email', 'verventas@negapos.local')

    const response = await client.post('/api/v1/orders').loginAs(operator).json({
      modality: 'CORPORATE',
      description: 'Pedido bloqueado',
      total_quantity: 1,
      order_date: DateTime.now().toISODate(),
    })

    response.assertStatus(403)
  })

  test('operator without ventas.credit cannot confirm orders on credit', async ({ client }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    await client
      .post('/api/v1/users')
      .loginAs(admin)
      .json({
        name: 'Confirmar Sin Crédito',
        email: 'confirmar-sin-credito@negapos.local',
        password: 'password123',
        role: 'OPERATOR',
        permissions: ['ventas.view', 'ventas.confirm'],
      })

    const operator = await User.findByOrFail('email', 'confirmar-sin-credito@negapos.local')

    const customerResponse = await client.post('/api/v1/customers').loginAs(admin).json({
      name: 'Cliente crédito permiso',
      type: 'CORPORATE',
      credit_days: 30,
      active: true,
    })

    const customerId = customerResponse.body().data.customer.id as number

    const orderResponse = await client.post('/api/v1/orders').loginAs(admin).json({
      customer_id: customerId,
      modality: 'CORPORATE',
      description: 'Pedido crédito permiso',
      total_quantity: 1,
      order_date: DateTime.now().toISODate(),
    })

    const orderId = orderResponse.body().data.order.id as number

    const denied = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(operator)
      .json({ new_status: 'CONFIRMED', payment_type: 'CREDIT' })

    denied.assertStatus(403)
    denied.assertBodyContains({
      error: { code: 'PERMISO_DENEGADO' },
    })

    const allowed = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(operator)
      .json({ new_status: 'CONFIRMED', payment_type: 'CASH' })

    allowed.assertStatus(200)
    allowed.assertBodyContains({
      data: {
        order: {
          status: 'CONFIRMED',
          paymentType: 'CASH',
        },
      },
    })
  })

  test('GET /api/v1/users lists users for admin', async ({ client, assert }) => {
    const admin = await User.findByOrFail('email', TEST_EMAIL)

    await User.create({
      name: 'Operador Lista',
      email: 'lista@negapos.local',
      password: TEST_PASSWORD,
      role: 'OPERATOR',
      permissions: ['dashboard.view'],
      active: true,
    })

    const response = await client.get('/api/v1/users').loginAs(admin)

    response.assertStatus(200)

    const body = response.body() as {
      data: { users: Array<{ id: number; name: string; email: string }>; meta: { total: number } }
    }
    assert.isAtLeast(body.data.meta.total, 2)
    const listed = body.data.users.find((item) => item.email === 'lista@negapos.local')
    assert.exists(listed)
    assert.equal(listed!.name, 'Operador Lista')
    assert.equal(listed!.email, 'lista@negapos.local')
  })
})
