import Customer from '#models/customer'
import Sale from '#models/sale'
import SaleLine from '#models/sale_line'
import User from '#models/user'
import { seedReferenceData } from '#tests/helpers/seed_reference_data'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { resetTestSaleCodes } from '#tests/helpers/seed_test_sale'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-customer-invoice@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Invoice Test',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Customer invoices API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    resetTestSaleCodes()
    await seedReferenceData()
    await seedAdminUser()
  })

  test('POST credit invoice creates COMPLETED sale with balance and no lines', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Credito Factura',
      type: 'CORPORATE',
      creditDays: 15,
      active: true,
    })

    const response = await client
      .post(`/api/v1/customers/${customer.id}/invoices`)
      .loginAs(user)
      .json({
        date: '2026-09-10',
        amount: 100,
        is_credit: true,
        note: 'Deuda migrada',
        credit_due_date: '2026-09-25',
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        sale: {
          id: number
          code: string
          payment_type: string
          status: string
          total_usd: string
          balance_usd: string
          amount_paid_usd: string
          credit_due_date: string | null
          notes: string | null
          lines: unknown[]
          sales_shift_id?: number | null
        }
      }
    }

    assert.equal(body.data.sale.payment_type, 'CREDIT')
    assert.equal(body.data.sale.status, 'COMPLETED')
    assert.equal(Number(body.data.sale.total_usd), 100)
    assert.equal(Number(body.data.sale.balance_usd), 100)
    assert.equal(Number(body.data.sale.amount_paid_usd), 0)
    assert.equal(body.data.sale.credit_due_date, '2026-09-25')
    assert.equal(body.data.sale.notes, 'Deuda migrada')
    assert.lengthOf(body.data.sale.lines ?? [], 0)
    assert.exists(body.data.sale.code)

    const sale = await Sale.findOrFail(body.data.sale.id)
    assert.isNull(sale.salesShiftId)
    const lines = await SaleLine.query().where('saleId', Number(sale.id))
    assert.lengthOf(lines, 0)
  })

  test('POST cash invoice creates COMPLETED paid sale without open shift', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Contado Factura',
      type: 'OTHER',
      creditDays: 0,
      active: true,
    })

    const response = await client
      .post(`/api/v1/customers/${customer.id}/invoices`)
      .loginAs(user)
      .json({
        date: '2026-09-11',
        amount: 40,
        is_credit: false,
        payment_method_code: 'cash_usd',
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        sale: {
          id: number
          payment_type: string
          payment_method_code: string | null
          total_usd: string
          balance_usd: string
          amount_paid_usd: string
          lines: unknown[]
        }
      }
    }

    assert.equal(body.data.sale.payment_type, 'CASH')
    assert.equal(body.data.sale.payment_method_code, 'cash_usd')
    assert.equal(Number(body.data.sale.total_usd), 40)
    assert.equal(Number(body.data.sale.amount_paid_usd), 40)
    assert.equal(Number(body.data.sale.balance_usd), 0)
    assert.lengthOf(body.data.sale.lines ?? [], 0)

    const sale = await Sale.findOrFail(body.data.sale.id)
    assert.isNull(sale.salesShiftId)
  })

  test('POST credit invoice rejects customer without credit days', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Sin Credito',
      type: 'OTHER',
      creditDays: 0,
      active: true,
    })

    const response = await client
      .post(`/api/v1/customers/${customer.id}/invoices`)
      .loginAs(user)
      .json({
        date: '2026-09-10',
        amount: 50,
        is_credit: true,
      })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'E_CLIENTE_SIN_CREDITO',
      },
    })
  })

  test('POST cash invoice requires payment method', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Contado sin metodo',
      type: 'OTHER',
      active: true,
    })

    const response = await client
      .post(`/api/v1/customers/${customer.id}/invoices`)
      .loginAs(user)
      .json({
        date: '2026-09-10',
        amount: 20,
        is_credit: false,
      })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'METODO_PAGO_REQUERIDO',
      },
    })
  })

  test('account-statement marks financial invoices as hasItems false', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Statement',
      type: 'CORPORATE',
      creditDays: 10,
      active: true,
    })

    await client
      .post(`/api/v1/customers/${customer.id}/invoices`)
      .loginAs(user)
      .json({
        date: '2026-09-12',
        amount: 75,
        is_credit: true,
      })

    const response = await client
      .get(`/api/v1/customers/${customer.id}/account-statement`)
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        sales: Array<{ hasItems: boolean; paymentType: string; balanceUsd: string }>
        saldoPendienteUsd: string
      }
    }

    assert.lengthOf(body.data.sales, 1)
    assert.isFalse(body.data.sales[0].hasItems)
    assert.equal(body.data.sales[0].paymentType, 'CREDIT')
    assert.equal(Number(body.data.saldoPendienteUsd), 75)
  })
})
