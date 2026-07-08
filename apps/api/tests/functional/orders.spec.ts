import Customer from '#models/customer'
import CatalogProduct from '#models/catalog_product'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-orders@negapos.local'
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

async function seedCustomer() {
  return Customer.create({
    name: 'Customer Orders',
    type: 'CORPORATE',
    active: true,
  })
}

test.group('Orders API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/orders requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/orders')
    response.assertStatus(401)
  })

  test('POST /api/v1/orders creates order with auto-generated code', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()

    const response = await client
      .post('/api/v1/orders')
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'Uniformes escolares',
        total_quantity: 200,
        order_date: '2026-05-15',
        estimated_delivery_date: '2026-06-15',
        total_price: 1500.5,
        notes: 'Urgente',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        order: {
          modality: 'CORPORATE',
          description: 'Uniformes escolares',
          totalQuantity: 200,
          status: 'DRAFT',
          totalPrice: '1500.50',
        },
      },
    })

    const body = response.body() as { data: { order: { code: string; id: number } } }
    assert.match(body.data.order.code, /^PED-202605-\d{4}$/)
  })

  test('POST /api/v1/orders creates draft with lines in one transaction', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const productA = await CatalogProduct.create({
      name: 'Producto A',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      active: true,
    })
    const productB = await CatalogProduct.create({
      name: 'Producto B',
      category: 'Uniforme',
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      active: true,
    })

    const response = await client
      .post('/api/v1/orders')
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'Venta catálogo',
        total_quantity: 3,
        order_date: '2026-05-15',
        lines: [
          { catalog_product_id: Number(productA.id), quantity: 2 },
          { catalog_product_id: Number(productB.id), quantity: 1 },
        ],
      })

    response.assertStatus(200)

    const orderId = response.body().data.order.id as number
    const lines = await OrderLine.query().where('orderId', orderId).orderBy('id', 'asc')

    assert.lengthOf(lines, 2)
    assert.equal(lines[0].catalogProductId, Number(productA.id))
    assert.equal(lines[0].quantity, '2.000')
    assert.equal(lines[1].catalogProductId, Number(productB.id))
    assert.equal(lines[1].quantity, '1.000')
  })

  test('PUT /api/v1/orders/:id replaces draft lines atomically', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const productA = await CatalogProduct.create({
      name: 'Producto sync A',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      active: true,
    })
    const productB = await CatalogProduct.create({
      name: 'Producto sync B',
      category: 'Uniforme',
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202605-0297',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Borrador sync',
      totalQuantity: 2,
      orderDate: DateTime.fromISO('2026-05-10'),
      status: 'DRAFT',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(productA.id),
      quantity: '2.000',
      unitPriceUsd: '10.0000',
      subtotalUsd: '20.0000',
    })

    const response = await client
      .put(`/api/v1/orders/${order.id}`)
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'Borrador sync actualizado',
        total_quantity: 1,
        order_date: '2026-05-10',
        lines: [{ catalog_product_id: Number(productB.id), quantity: 1 }],
      })

    response.assertStatus(200)

    const lines = await OrderLine.query().where('orderId', Number(order.id))
    assert.lengthOf(lines, 1)
    assert.equal(lines[0].catalogProductId, Number(productB.id))
    assert.equal(lines[0].quantity, '1.000')
  })

  test('POST /api/v1/orders rejects missing customer', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/orders').loginAs(user).json({
      customer_id: 99999,
      modality: 'WHITE_LABEL',
      description: 'Test',
      total_quantity: 10,
      order_date: '2026-05-01',
    })

    response.assertStatus(404)
    response.assertBodyContains({
      error: {
        code: 'CLIENTE_NO_ENCONTRADO',
      },
    })
  })

  test('PUT /api/v1/orders/:id updates guest draft order', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const order = await Order.create({
      code: 'PED-202605-0103',
      customerId: null,
      guestName: 'Walk-in Original',
      modality: 'CORPORATE',
      description: 'Venta rápida',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    const response = await client.put(`/api/v1/orders/${order.id}`).loginAs(user).json({
      guest_name: 'Walk-in Actualizado',
      modality: 'CORPORATE',
      description: 'Venta actualizada',
      total_quantity: 8,
      order_date: '2026-05-01',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        order: {
          guestName: 'Walk-in Actualizado',
          customerId: null,
          description: 'Venta actualizada',
          totalQuantity: 8,
        },
      },
    })

    await order.refresh()
    assert.equal(order.guestName, 'Walk-in Actualizado')
    assert.isNull(order.customerId)
  })

  test('PUT /api/v1/orders/:id only allows DRAFT', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const order = await Order.create({
      code: 'PED-202605-0099',
      customerId: customer.id,
      modality: 'WHITE_LABEL',
      description: 'Original',
      totalQuantity: 50,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'CONFIRMED',
    })

    const response = await client
      .put(`/api/v1/orders/${order.id}`)
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'WHITE_LABEL',
        description: 'Cambio',
        total_quantity: 50,
        order_date: '2026-05-01',
      })

    response.assertStatus(409)
    response.assertBodyContains({
      error: {
        code: 'PEDIDO_NO_EDITABLE',
      },
    })
  })

  test('POST /api/v1/orders/:id/transition advances state machine', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const order = await Order.create({
      code: 'PED-202605-0100',
      customerId: customer.id,
      modality: 'WHITE_LABEL',
      description: 'Polos',
      totalQuantity: 30,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    const confirmar = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED' })

    confirmar.assertStatus(200)
    confirmar.assertBodyContains({
      data: {
        order: {
          status: 'CONFIRMED',
        },
      },
    })

    const produccion = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    produccion.assertStatus(200)
    produccion.assertBodyContains({
      data: {
        order: {
          status: 'IN_PRODUCTION',
        },
      },
    })

    const entregado = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'DELIVERED' })

    entregado.assertStatus(200)
    entregado.assertBodyContains({
      data: {
        order: {
          status: 'DELIVERED',
        },
      },
    })
  })

  test('POST /api/v1/orders/:id/transition rejects invalid transition', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const order = await Order.create({
      code: 'PED-202605-0101',
      customerId: customer.id,
      modality: 'WHITE_LABEL',
      description: 'Polos',
      totalQuantity: 30,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    response.assertStatus(409)
    response.assertBodyContains({
      error: {
        code: 'TRANSICION_INVALIDA',
      },
    })
  })

  test('DELETE /api/v1/orders/:id only allows DRAFT', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const order = await Order.create({
      code: 'PED-202605-0102',
      customerId: customer.id,
      modality: 'WHITE_LABEL',
      description: 'Borrador',
      totalQuantity: 10,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    const response = await client.delete(`/api/v1/orders/${order.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
      },
    })

    const deleted = await Order.find(order.id)
    assert.isNull(deleted)
  })

  test('GET /api/v1/orders lists orders with customer and filters', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()

    await Order.create({
      code: 'PED-202605-0200',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Listado A',
      totalQuantity: 10,
      orderDate: DateTime.fromISO('2026-05-10'),
      status: 'DRAFT',
    })

    await Order.create({
      code: 'PED-202605-0201',
      customerId: customer.id,
      modality: 'WHITE_LABEL',
      description: 'Listado B',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-05-11'),
      status: 'CONFIRMED',
    })

    const response = await client
      .get(`/api/v1/orders?customer_id=${customer.id}&status=CONFIRMED`)
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data.meta.total, 1)
    assert.lengthOf(body.data.orders, 1)
    assert.equal(body.data.orders[0].description, 'Listado B')
    assert.equal(body.data.orders[0].customer.name, 'Customer Orders')
  })

  test('GET /api/v1/orders exclude_status omits drafts from total and page', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()

    await Order.create({
      code: 'PED-202605-0299',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Borrador historial',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-05-10'),
      status: 'DRAFT',
    })

    await Order.create({
      code: 'PED-202605-0298',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Confirmado historial',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-05-10'),
      status: 'CONFIRMED',
      confirmedAt: DateTime.fromISO('2026-05-10'),
    })

    const response = await client
      .get(`/api/v1/orders?customer_id=${customer.id}&exclude_status=DRAFT`)
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data.meta.total, 1)
    assert.lengthOf(body.data.orders, 1)
    assert.equal(body.data.orders[0].description, 'Confirmado historial')
  })

  test('POST transition cancel from IN_PRODUCTION reverts catalog product stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const product = await CatalogProduct.create({
      name: 'Polo manual',
      category: 'UNIFORM',
      saleUnit: 'UND',
      salePriceUsd: '12.0000',
      costUsd: '5.0000',
      stockQuantity: '10.000',
      active: true,
    })

    const order = await Order.create({
      code: 'PED-202605-0300',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Pedido con producto manual',
      totalQuantity: 2,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })
    await OrderLine.create({
      orderId: order.id,
      catalogProductId: product.id,
      quantity: '2.000',
      unitPriceUsd: '12.0000',
      subtotalUsd: '24.0000',
    })

    await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED' })

    await product.refresh()
    assert.equal(product.stockQuantity, '8.000')

    await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    const cancel = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'CANCELLED' })

    cancel.assertStatus(200)

    await product.refresh()
    assert.equal(product.stockQuantity, '10.000')
  })
})
