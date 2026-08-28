import CatalogProduct from '#models/catalog_product'
import Sale from '#models/sale'
import SaleLine from '#models/sale_line'
import SalesShift from '#models/sales_shift'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-sales-shift@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Shift',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Sales shifts API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('POST /sales-shifts/open creates OPEN shift', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const response = await client.post('/api/v1/sales-shifts/open').loginAs(user)

    response.assertStatus(200)
    const body = response.body().data
    assert.equal(body.sales_shift.status, 'OPEN')
    assert.isString(body.sales_shift.opened_at)
    assert.isNull(body.sales_shift.closed_at)
  })

  test('POST /sales-shifts/open fails when one is already OPEN', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await client.post('/api/v1/sales-shifts/open').loginAs(user)
    const second = await client.post('/api/v1/sales-shifts/open').loginAs(user)

    second.assertStatus(409)
    assert.equal(second.body().error.code, 'TURNO_YA_ABIERTO')
  })

  test('POST /sales-shifts/:id/close closes open shift', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const opened = await client.post('/api/v1/sales-shifts/open').loginAs(user)
    const shiftId = opened.body().data.sales_shift.id

    const closed = await client.post(`/api/v1/sales-shifts/${shiftId}/close`).loginAs(user)
    closed.assertStatus(200)
    assert.equal(closed.body().data.sales_shift.status, 'CLOSED')
    assert.isString(closed.body().data.sales_shift.closed_at)

    const current = await client.get('/api/v1/sales-shifts/current').loginAs(user)
    assert.isNull(current.body().data.sales_shift)
  })

  test('confirming sale without open shift returns 409', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Producto turno',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const draftResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente sin turno',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(product.id),
            quantity: 1,
            unit_price_usd: 10,
          },
        ],
      })

    draftResponse.assertStatus(200)

    const response = await client
      .post(`/api/v1/sales/${draftResponse.body().data.sale.id}/confirm`)
      .loginAs(user)
      .json({ payment_method_code: 'cash_usd' })

    response.assertStatus(409)
    assert.equal(response.body().error.code, 'TURNO_NO_ABIERTO')
  })

  test('confirmed sale links to open shift and appears in daily-closing by shift', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const opened = await client.post('/api/v1/sales-shifts/open').loginAs(user)
    const shiftId = opened.body().data.sales_shift.id

    const product = await CatalogProduct.create({
      name: 'Producto cierre turno',
      category: 'Uniforme',
      salePriceUsd: '25.0000',
      costUsd: '10.0000',
      stockQuantity: '10.000',
      active: true,
    })

    const draftResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Generico',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(product.id),
            quantity: 1,
            unit_price_usd: 25,
          },
        ],
      })

    draftResponse.assertStatus(200)

    const confirmResponse = await client
      .post(`/api/v1/sales/${draftResponse.body().data.sale.id}/confirm`)
      .loginAs(user)
      .json({ payment_method_code: 'cash_usd' })

    confirmResponse.assertStatus(200)

    const sale = await Sale.find(draftResponse.body().data.sale.id)
    assert.equal(Number(sale?.salesShiftId), shiftId)

    const closing = await client
      .get('/api/v1/dashboard/daily-closing')
      .qs({ sales_shift_id: shiftId })
      .loginAs(user)

    closing.assertStatus(200)
    const data = closing.body().data
    assert.equal(data.summary.invoices_count, 1)
    assert.equal(data.summary.cash_total_usd, '25.0000')
    assert.lengthOf(data.invoices, 1)
  })

  test('sale after midnight still belongs to open shift from previous day', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const shift = await SalesShift.create({
      openedAt: DateTime.fromISO('2026-08-24T20:00:00', { zone: 'America/Caracas' }),
      closedAt: null,
      openedByUserId: Number(user.id),
      closedByUserId: null,
      status: 'OPEN',
      notes: null,
    })

    const product = await CatalogProduct.create({
      name: 'Producto medianoche',
      category: 'Uniforme',
      salePriceUsd: '12.0000',
      costUsd: '4.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const sale = await Sale.create({
      code: '0000000099',
      guestName: 'Generico',
      status: 'COMPLETED',
      billingMode: 'FAST',
      orderStatus: 'DELIVERED',
      paymentType: 'CASH',
      paymentMethodCode: 'cash_usd',
      totalUsd: '12.0000',
      amountPaidUsd: '12.0000',
      balanceUsd: '0.0000',
      soldAt: DateTime.fromISO('2026-08-25T01:30:00', { zone: 'America/Caracas' }),
      confirmedAt: DateTime.fromISO('2026-08-25T01:30:00', { zone: 'America/Caracas' }),
      salesShiftId: Number(shift.id),
    })

    await SaleLine.create({
      saleId: Number(sale.id),
      catalogProductId: Number(product.id),
      description: 'Línea medianoche',
      quantity: '1',
      unitPriceUsd: '12.0000',
      subtotalUsd: '12.0000',
      returnedQuantity: '0',
    })

    const closing = await client
      .get('/api/v1/dashboard/daily-closing')
      .qs({ sales_shift_id: Number(shift.id) })
      .loginAs(user)

    closing.assertStatus(200)
    assert.equal(closing.body().data.summary.invoices_count, 1)
    assert.equal(closing.body().data.summary.cash_total_usd, '12.0000')
  })
})
