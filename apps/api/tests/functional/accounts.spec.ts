import Account from '#models/account'
import Expense from '#models/expense'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-accounts@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('expenses').delete()
  await db.from('machine_expenses').delete()
  await db.from('order_lines').delete()
  await db.from('order_materials').delete()
  await db.from('orders').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('catalog_products').delete()
  await db.from('materials').delete()
  await db.from('machines').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('suppliers').delete()
  await db.from('accounts').delete()
  await db.from('sales_shifts').delete()
  await db.from('users').delete()
}

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

test.group('Accounts API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('POST /api/v1/accounts creates account', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/accounts').loginAs(user).json({
      name: 'Gastos Operativos',
      description: 'Gastos del día a día',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        account: {
          name: 'Gastos Operativos',
          description: 'Gastos del día a día',
          isActive: true,
        },
      },
    })

    const account = await Account.findByOrFail('name', 'Gastos Operativos')
    assert.equal(account.description, 'Gastos del día a día')
  })

  test('DELETE /api/v1/accounts soft-deletes when referenced', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const account = await Account.create({
      name: 'Compras insumos',
      description: null,
      isActive: true,
    })

    await Expense.create({
      date: DateTime.fromISO('2026-06-01'),
      description: 'Pago servicio',
      amountUsd: '10.0000',
      accountId: account.id,
    })

    const response = await client.delete(`/api/v1/accounts/${account.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'soft',
      },
    })

    await account.refresh()
    assert.isFalse(Boolean(account.isActive))
  })

  test('POST /api/v1/expenses assigns account', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const account = await Account.create({
      name: 'Operativos',
      description: null,
      isActive: true,
    })

    const response = await client
      .post('/api/v1/expenses')
      .loginAs(user)
      .json({
        date: '2026-06-02',
        description: 'Internet',
        amount_usd: 25,
        account_id: Number(account.id),
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        expense: {
          accountId: Number(account.id),
        },
      },
    })

    const expense = await Expense.firstOrFail()
    assert.equal(Number(expense.accountId), Number(account.id))
  })

  test('GET /api/v1/expenses filters by account_id', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const accountA = await Account.create({ name: 'A', description: null, isActive: true })
    const accountB = await Account.create({ name: 'B', description: null, isActive: true })

    await Expense.create({
      date: DateTime.fromISO('2026-06-01'),
      description: 'Gasto A',
      amountUsd: '5.0000',
      accountId: accountA.id,
    })
    await Expense.create({
      date: DateTime.fromISO('2026-06-01'),
      description: 'Gasto B',
      amountUsd: '8.0000',
      accountId: accountB.id,
    })

    const response = await client
      .get('/api/v1/expenses')
      .qs({ account_id: Number(accountA.id) })
      .loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.expenses.length, 1)
    assert.equal(response.body().data.expenses[0].description, 'Gasto A')
  })
})
