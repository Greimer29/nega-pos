import Currency from '#models/currency'
import MachineExpense from '#models/machine_expense'
import Machine from '#models/machine'
import User from '#models/user'
import MachineService from '#services/machine_service'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-machines@negapos.local'
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

test.group('Machines API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('POST /api/v1/machines creates machine', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/machines').loginAs(user).json({
      name: 'Overlock Juki',
      type: 'OVERLOCK',
      brand: 'Juki',
      model: 'MO-654DE',
      status: 'OPERATIONAL',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        machine: {
          name: 'Overlock Juki',
          type: 'OVERLOCK',
          active: true,
        },
      },
    })

    const body = response.body() as { data: { machine: { id: number } } }
    assert.exists(body.data.machine.id)
  })

  test('POST /api/v1/machines accepts free-text machine type', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/machines').loginAs(user).json({
      name: 'Collareta industrial',
      type: 'Collaretera 5 hilos',
      status: 'OPERATIONAL',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        machine: {
          name: 'Collareta industrial',
          type: 'Collaretera 5 hilos',
        },
      },
    })
  })

  test('MachineService.calcularTotalGastado sums expenses', async ({ assert }) => {
    const machine = await Machine.create({
      name: 'Recta',
      type: 'STRAIGHT_STITCH',
      status: 'OPERATIONAL',
      active: true,
    })

    await MachineExpense.create({
      machineId: machine.id,
      date: DateTime.fromISO('2026-05-01'),
      category: 'REPAIR',
      description: 'Cambio de aguja',
      amount: '150.50',
      currencyCode: 'XAU',
    })

    await MachineExpense.create({
      machineId: machine.id,
      date: DateTime.fromISO('2026-05-10'),
      category: 'SUPPLY',
      description: 'Aceite',
      amount: '49.50',
      currencyCode: 'XAU',
    })

    const total = await MachineService.calcularTotalGastado(Number(machine.id))
    assert.equal(total, '200.00')
  })

  test('MachineService.calcularTotalGastado converts legacy VES expenses to USD', async ({
    assert,
  }) => {
    await Currency.query().where('code', 'VES').update({ ratePerUsd: '40.0000' })

    const machine = await Machine.create({
      name: 'Overlock mixta',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })

    await MachineExpense.create({
      machineId: machine.id,
      date: DateTime.fromISO('2026-05-01'),
      category: 'REPAIR',
      description: 'Repuesto en Bs',
      amount: '400.00',
      currencyCode: 'VES',
    })

    await MachineExpense.create({
      machineId: machine.id,
      date: DateTime.fromISO('2026-05-02'),
      category: 'SUPPLY',
      description: 'Aceite USD',
      amount: '50.00',
      currencyCode: 'USD',
    })

    const total = await MachineService.calcularTotalGastado(Number(machine.id))
    assert.equal(total, '10.50')
  })

  test('GET /api/v1/machines/:id returns total_spent and expenses', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const machine = await Machine.create({
      name: 'Detalle Machine',
      type: 'STRAIGHT_STITCH',
      status: 'OPERATIONAL',
      active: true,
    })

    await MachineExpense.create({
      machineId: machine.id,
      date: DateTime.fromISO('2026-05-01'),
      category: 'MAINTENANCE',
      description: 'Servicio',
      amount: '300.00',
      currencyCode: 'XAU',
    })

    const response = await client.get(`/api/v1/machines/${machine.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        machine: {
          totalSpent: '300.00',
          expenses: [
            {
              description: 'Servicio',
              amount: '300.00',
            },
          ],
        },
      },
    })
  })

  test('POST /api/v1/machines/:id/expenses creates company expense with machine_id', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const machine = await Machine.create({
      name: 'Collaretera',
      type: 'COVERSTITCH',
      status: 'OPERATIONAL',
      active: true,
    })

    const response = await client
      .post(`/api/v1/machines/${machine.id}/expenses`)
      .loginAs(user)
      .json({
        date: '2026-05-12',
        category: 'REPAIR',
        description: 'Motor',
        amount: 500,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        expense: {
          amount: '500.0000',
          amountUsd: '500.0000',
          machineId: Number(machine.id),
          description: 'Motor',
        },
      },
    })

    const expenseRows = await db.from('expenses').where('machine_id', Number(machine.id))
    assert.lengthOf(expenseRows, 1)
    const legacyRows = await db.from('machine_expenses').where('machine_id', Number(machine.id))
    assert.lengthOf(legacyRows, 0)
  })

  test('POST /api/v1/machines/:id/expenses accepts VES with entry_rate', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await db.from('currencies').where('code', 'VES').update({ rate_per_usd: '100.0000' })
    const machine = await Machine.create({
      name: 'Collaretera VES',
      type: 'COVERSTITCH',
      status: 'OPERATIONAL',
      active: true,
    })

    const response = await client
      .post(`/api/v1/machines/${machine.id}/expenses`)
      .loginAs(user)
      .json({
        date: '2026-05-12',
        description: 'Motor',
        amount: 400,
        currency_code: 'VES',
        entry_rate: 40,
      })

    response.assertStatus(200)
    assert.equal(response.body().data.expense.currencyCode, 'VES')
    assert.equal(response.body().data.expense.amountUsd, '10.0000')
    assert.equal(response.body().data.expense.machineId, Number(machine.id))
  })

  test('POST /api/v1/machines/:id/expenses defaults description from machine name', async ({
    client,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const machine = await Machine.create({
      name: 'Overlock Pro',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })

    const response = await client
      .post(`/api/v1/machines/${machine.id}/expenses`)
      .loginAs(user)
      .json({
        date: '2026-05-12',
        description: '',
        amount: 25,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        expense: {
          description: 'Gasto máquina — Overlock Pro',
          machineId: Number(machine.id),
        },
      },
    })
  })

  test('GET /api/v1/machine-expenses returns total_amount in meta', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const machine = await Machine.create({
      name: 'Global List',
      type: 'OTHER',
      status: 'OPERATIONAL',
      active: true,
    })

    await MachineExpense.create({
      machineId: machine.id,
      date: DateTime.fromISO('2026-05-01'),
      category: 'OTHER',
      description: 'Gasto 1',
      amount: '100.00',
      currencyCode: 'XAU',
    })

    await MachineExpense.create({
      machineId: machine.id,
      date: DateTime.fromISO('2026-05-02'),
      category: 'OTHER',
      description: 'Gasto 2',
      amount: '250.00',
      currencyCode: 'XAU',
    })

    const response = await client.get('/api/v1/machine-expenses').loginAs(user)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data.meta.total_amount, '350.00')
    assert.equal(body.data.meta.total, 2)
  })

  test('POST /api/v1/machines with is_credit creates payable balance', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/machines').loginAs(user).json({
      name: 'Overlock crédito',
      type: 'OVERLOCK',
      costo_adquisicion: 1200,
      is_credit: true,
      credit_due_date: '2026-12-31',
      status: 'OPERATIONAL',
    })

    response.assertStatus(200)
    const machine = response.body().data.machine as {
      isCredit: boolean
      acquisitionCost: string
      amountPaidUsd: string
      balanceUsd: string
      creditDueDate: string | null
    }

    assert.isTrue(machine.isCredit)
    assert.equal(Number(machine.acquisitionCost), 1200)
    assert.equal(machine.amountPaidUsd, '0.0000')
    assert.equal(machine.balanceUsd, '1200.0000')
    assert.equal(machine.creditDueDate, '2026-12-31')
  })

  test('POST /api/v1/machines credit accepts foreign currency and entry_rate', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    // 4000 VES @ 100 VES/base → 40 base
    const response = await client.post('/api/v1/machines').loginAs(user).json({
      name: 'Máquina VES',
      type: 'OVERLOCK',
      costo_adquisicion: 4000,
      currency_code: 'VES',
      entry_rate: 100,
      is_credit: true,
      status: 'OPERATIONAL',
    })

    response.assertStatus(200)
    const machine = response.body().data.machine as {
      isCredit: boolean
      acquisitionCost: string
      balanceUsd: string
      acquisitionAmountNative: string | null
      entryCurrencyCode: string | null
      entryRate: string | null
    }

    assert.isTrue(machine.isCredit)
    assert.equal(Number(machine.acquisitionCost), 40)
    assert.equal(machine.balanceUsd, '40.0000')
    assert.equal(machine.acquisitionAmountNative, '4000.0000')
    assert.equal(machine.entryCurrencyCode, 'VES')
    assert.equal(Number(machine.entryRate), 100)
  })

  test('POST /api/v1/machines credit without cost returns 422', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/machines').loginAs(user).json({
      name: 'Sin costo',
      type: 'OVERLOCK',
      is_credit: true,
      status: 'OPERATIONAL',
    })

    response.assertStatus(422)
  })

  test('POST /api/v1/machines/:id/payments reduces balance', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const machine = await Machine.create({
      name: 'Máquina abono',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
      acquisitionCost: '500.00',
      isCredit: true,
      amountPaidUsd: '0.0000',
      balanceUsd: '500.0000',
    })

    const response = await client
      .post(`/api/v1/machines/${machine.id}/payments`)
      .loginAs(user)
      .json({
        amount_usd: 200,
        date: '2026-06-15',
        note: 'Primer abono',
      })

    response.assertStatus(200)
    assert.equal(response.body().data.payment.amountUsd, '200.0000')

    await machine.refresh()
    assert.equal(machine.amountPaidUsd, '200.0000')
    assert.equal(machine.balanceUsd, '300.0000')

    const detail = await client.get(`/api/v1/machines/${machine.id}`).loginAs(user)
    detail.assertStatus(200)
    const payments = detail.body().data.machine.payments as Array<{ amountUsd: string }>
    assert.lengthOf(payments, 1)
    assert.equal(payments[0].amountUsd, '200.0000')
  })

  test('account-statement includes machine credit in pending payables', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await Machine.create({
      name: 'CxP máquina reporte',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
      acquisitionCost: '800.00',
      isCredit: true,
      amountPaidUsd: '0.0000',
      balanceUsd: '800.0000',
      acquisitionDate: DateTime.fromISO('2026-06-01'),
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const summary = response.body().data.summary as { pendingPayablesUsd: string }
    assert.equal(Number(summary.pendingPayablesUsd), 800)

    const movements = response.body().data.movements as Array<{ type: string; label: string }>
    assert.isTrue(movements.some((m) => m.type === 'machine_credit'))
  })

  test('POST /api/v1/machines/:id/payments rejects amount over balance', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const machine = await Machine.create({
      name: 'Máquina saldo bajo',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
      acquisitionCost: '100.00',
      isCredit: true,
      amountPaidUsd: '0.0000',
      balanceUsd: '100.0000',
    })

    const response = await client
      .post(`/api/v1/machines/${machine.id}/payments`)
      .loginAs(user)
      .json({
        amount_usd: 150,
        date: '2026-06-15',
      })

    response.assertStatus(422)
  })

  test('DELETE /api/v1/machines/:id soft deletes when has expenses', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const machine = await Machine.create({
      name: 'Con Gastos',
      type: 'STRAIGHT_STITCH',
      status: 'OPERATIONAL',
      active: true,
    })

    await MachineExpense.create({
      machineId: machine.id,
      date: DateTime.now(),
      category: 'OTHER',
      description: 'Gasto',
      amount: '10.00',
    })

    const response = await client.delete(`/api/v1/machines/${machine.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'soft',
      },
    })

    await machine.refresh()
    assert.isFalse(Boolean(machine.active))
  })
})
