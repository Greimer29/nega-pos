import Customer from '#models/customer'
import Order from '#models/order'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { resetTestSaleCodes, seedTestSale } from '#tests/helpers/seed_test_sale'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-customers@negapos.local'
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

test.group('Customers API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    resetTestSaleCodes()
    await seedAdminUser()
  })

  test('GET /api/v1/customers requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/customers')
    response.assertStatus(401)
  })

  test('POST /api/v1/customers creates customer with normalized phone and email', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/customers').loginAs(user).json({
      name: 'Acme Corp',
      phone: '04128332238',
      email: 'Contacto@Acme.com',
      type: 'CORPORATE',
      document: 'J-12345678-9',
      address: 'Av. Principal 123',
      notes: 'Customer frecuente',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        customer: {
          name: 'Acme Corp',
          phone: '+584128332238',
          email: 'contacto@acme.com',
          type: 'CORPORATE',
          document: 'J-12345678-9',
          active: true,
        },
      },
    })

    const body = response.body() as { data: { customer: { id: number } } }
    assert.exists(body.data.customer.id)
  })

  test('POST /api/v1/customers rejects duplicate email', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Customer.create({
      name: 'Existente',
      email: 'duplicado@example.com',
      type: 'OTHER',
      active: true,
    })

    const response = await client.post('/api/v1/customers').loginAs(user).json({
      name: 'Duplicado',
      email: 'Duplicado@Example.com',
      type: 'OTHER',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'EMAIL_DUPLICADO',
      },
    })
  })

  test('POST /api/v1/customers rejects duplicate phone', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Customer.create({
      name: 'Existente',
      phone: '+584128332238',
      type: 'OTHER',
      active: true,
    })

    const response = await client.post('/api/v1/customers').loginAs(user).json({
      name: 'Duplicado Tel',
      phone: '04128332238',
      type: 'OTHER',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'TELEFONO_DUPLICADO',
      },
    })
  })

  test('POST /api/v1/customers rejects invalid phone', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/customers').loginAs(user).json({
      name: 'Customer Mal Tel',
      phone: '123',
      type: 'OTHER',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'TELEFONO_INVALIDO',
      },
    })
  })

  test('GET /api/v1/customers/:id returns customer with orders history', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Customer Detalle',
      type: 'WHITE_LABEL',
      active: true,
    })

    await Order.create({
      code: 'PED-202605-0001',
      customerId: customer.id,
      modality: 'WHITE_LABEL',
      description: 'Camisetas polo',
      totalQuantity: 100,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'CONFIRMED',
    })

    const response = await client.get(`/api/v1/customers/${customer.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        customer: {
          id: Number(customer.id),
          name: 'Customer Detalle',
          orders: [
            {
              code: 'PED-202605-0001',
              status: 'CONFIRMED',
            },
          ],
        },
      },
    })

    const body = response.body() as { data: { customer: { orders: unknown[] } } }
    assert.lengthOf(body.data.customer.orders, 1)
  })

  test('GET /api/v1/customers/:id returns 404 for missing customer', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.get('/api/v1/customers/99999').loginAs(user)

    response.assertStatus(404)
    response.assertBodyContains({
      error: {
        code: 'CLIENTE_NO_ENCONTRADO',
      },
    })
  })

  test('PUT /api/v1/customers/:id updates customer', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Antes',
      type: 'OTHER',
      active: true,
    })

    const response = await client.put(`/api/v1/customers/${customer.id}`).loginAs(user).json({
      name: 'Después',
      type: 'CORPORATE',
      notes: 'Actualizado',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        customer: {
          name: 'Después',
          type: 'CORPORATE',
          notes: 'Actualizado',
        },
      },
    })
  })

  test('DELETE /api/v1/customers/:id hard deletes when no orders', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Para Borrar',
      type: 'OTHER',
      active: true,
    })

    const response = await client.delete(`/api/v1/customers/${customer.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'hard',
      },
    })

    const deleted = await Customer.find(customer.id)
    assert.isNull(deleted)
  })

  test('DELETE /api/v1/customers/:id soft deletes when has orders', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Con Orders',
      type: 'OTHER',
      active: true,
    })

    await Order.create({
      code: 'PED-202605-0002',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Uniformes',
      totalQuantity: 50,
      orderDate: DateTime.now(),
      status: 'DRAFT',
    })

    const response = await client.delete(`/api/v1/customers/${customer.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'soft',
      },
    })

    await customer.refresh()
    assert.isFalse(Boolean(customer.active))
  })

  test('GET /api/v1/customers lists customers with pagination and filters', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Customer.create({ name: 'Listado Alpha', type: 'CORPORATE', active: true })
    await Customer.create({ name: 'Listado Beta', type: 'WHITE_LABEL', active: true })
    await Customer.create({ name: 'Otro Customer', type: 'OTHER', active: false })

    const response = await client
      .get('/api/v1/customers?search=Listado&type=CORPORATE')
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data.meta.total, 1)
    assert.lengthOf(body.data.customers, 1)
    assert.equal(body.data.customers[0].name, 'Listado Alpha')
  })

  test('POST /api/v1/customers/:id/image stores customer photo', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente con foto',
      type: 'CORPORATE',
      active: true,
    })

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )

    const response = await client
      .post(`/api/v1/customers/${customer.id}/image`)
      .loginAs(user)
      .file('image', png, {
        filename: 'cliente.png',
        contentType: 'image/png',
      })

    response.assertStatus(200)

    const body = response.body() as { data: { customer: { imagePath: string | null } } }
    assert.isNotNull(body.data.customer.imagePath)

    const downloadResponse = await client
      .get(`/api/v1/customers/${customer.id}/image`)
      .loginAs(user)

    downloadResponse.assertStatus(200)
    downloadResponse.assertHeader('content-type', 'image/png')
  })

  test('GET /api/v1/customers/:id/account-statement lists sales and saldo pendiente', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Cuenta',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    await seedTestSale({
      customerId: Number(customer.id),
      status: 'DRAFT',
      totalUsd: '100.0000',
      lines: [{ quantity: '1', unitPriceUsd: '100.0000' }],
    })

    await seedTestSale({
      customerId: Number(customer.id),
      code: '0000000002',
      paymentType: 'CASH',
      totalUsd: '25.0000',
      soldAt: DateTime.now().minus({ days: 5 }),
      confirmedAt: DateTime.now().minus({ days: 5 }),
      lines: [{ quantity: '1', unitPriceUsd: '25.0000' }],
    })

    await seedTestSale({
      customerId: Number(customer.id),
      code: '0000000003',
      paymentType: 'CREDIT',
      totalUsd: '50.0000',
      amountPaidUsd: '10.0000',
      balanceUsd: '40.0000',
      creditDueDate: DateTime.now().plus({ days: 15 }),
      soldAt: DateTime.now().minus({ days: 3 }),
      confirmedAt: DateTime.now().minus({ days: 3 }),
      lines: [{ quantity: '1', unitPriceUsd: '50.0000' }],
    })

    await seedTestSale({
      customerId: Number(customer.id),
      code: '0000000004',
      status: 'RETURNED',
      paymentType: 'CREDIT',
      totalUsd: '15.0000',
      balanceUsd: '15.0000',
      soldAt: DateTime.now().minus({ days: 1 }),
      confirmedAt: DateTime.now().minus({ days: 1 }),
      lines: [{ quantity: '1', unitPriceUsd: '15.0000' }],
    })

    const response = await client
      .get(`/api/v1/customers/${customer.id}/account-statement`)
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        sales: Array<{ code: string | null; status: string; paymentType: string }>
        saldoPendienteUsd: string
      }
    }

    assert.lengthOf(body.data.sales, 2)
    assert.exists(
      body.data.sales.find((sale) => sale.paymentType === 'CASH' && sale.status === 'COMPLETED')
    )
    assert.exists(
      body.data.sales.find((sale) => sale.paymentType === 'CREDIT' && sale.status === 'COMPLETED')
    )
    assert.notExists(body.data.sales.find((sale) => sale.status === 'DRAFT'))
    assert.notExists(body.data.sales.find((sale) => sale.status === 'RETURNED'))
    assert.equal(body.data.saldoPendienteUsd, '40.0000')
  })

  test('GET /api/v1/customers/:id/account-statement excludes cash sales from saldo', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Solo Contado',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    await seedTestSale({
      customerId: Number(customer.id),
      paymentType: 'CASH',
      totalUsd: '80.0000',
      soldAt: DateTime.now(),
      confirmedAt: DateTime.now(),
      lines: [{ quantity: '1', unitPriceUsd: '80.0000' }],
    })

    const response = await client
      .get(`/api/v1/customers/${customer.id}/account-statement`)
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body() as { data: { saldoPendienteUsd: string } }
    assert.equal(body.data.saldoPendienteUsd, '0.0000')
  })

  test('POST /api/v1/customers/:id/payments registers payment without account', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Abono',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    const sale = await seedTestSale({
      customerId: Number(customer.id),
      paymentType: 'CREDIT',
      totalUsd: '12.0000',
      balanceUsd: '12.0000',
      creditDueDate: DateTime.fromISO('2026-06-20'),
      soldAt: DateTime.now().minus({ days: 2 }),
      confirmedAt: DateTime.now().minus({ days: 2 }),
      lines: [{ quantity: '1', unitPriceUsd: '12.0000' }],
    })

    const response = await client
      .post(`/api/v1/customers/${customer.id}/payments`)
      .loginAs(user)
      .json({
        sale_id: sale.id,
        account_id: null,
        amount_usd: 12,
        date: '2026-06-20',
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: { payment: { customerId: number; saleId: number; amountUsd: string } }
    }

    assert.equal(body.data.payment.customerId, customer.id)
    assert.equal(body.data.payment.saleId, sale.id)
    assert.equal(body.data.payment.amountUsd, '12.0000')

    await sale.refresh()
    assert.equal(sale.balanceUsd, '0.0000')
    assert.equal(sale.amountPaidUsd, '12.0000')
  })

  test('POST /api/v1/customers/:id/payments rejects overpayment', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Sobrepago',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    const sale = await seedTestSale({
      customerId: Number(customer.id),
      paymentType: 'CREDIT',
      totalUsd: '10.0000',
      balanceUsd: '10.0000',
      creditDueDate: DateTime.fromISO('2026-06-20'),
      soldAt: DateTime.now().minus({ days: 2 }),
      confirmedAt: DateTime.now().minus({ days: 2 }),
      lines: [{ quantity: '1', unitPriceUsd: '10.0000' }],
    })

    const response = await client
      .post(`/api/v1/customers/${customer.id}/payments`)
      .loginAs(user)
      .json({
        sale_id: sale.id,
        account_id: null,
        amount_usd: 15,
        date: '2026-06-20',
      })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'PAGO_CLIENTE_EXCEDE_SALDO')

    await sale.refresh()
    assert.equal(sale.balanceUsd, '10.0000')
    assert.equal(sale.amountPaidUsd, '0.0000')
  })

  test('GET /api/v1/customers/:id/image requires authentication', async ({ client }) => {
    const customer = await Customer.create({
      name: 'Cliente sin auth',
      type: 'CORPORATE',
      active: true,
    })

    const response = await client.get(`/api/v1/customers/${customer.id}/image`)

    response.assertStatus(401)
  })
})
