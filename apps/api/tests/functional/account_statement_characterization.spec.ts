import Account from '#models/account'
import Customer from '#models/customer'
import CustomerPayment from '#models/customer_payment'
import Expense from '#models/expense'
import Income from '#models/income'
import Machine from '#models/machine'
import MachineExpense from '#models/machine_expense'
import Purchase from '#models/purchase'
import Supplier from '#models/supplier'
import SupplierPayment from '#models/supplier_payment'
import User from '#models/user'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { resetTestSaleCodes, seedTestSale } from '#tests/helpers/seed_test_sale'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime, Settings } from 'luxon'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const TEST_EMAIL = 'test-account-statement-characterization@negapos.local'
const SNAPSHOT_PATH = fileURLToPath(
  new URL('../fixtures/account_statement_characterization.json', import.meta.url)
)
// The financial summary reports `asOf` = today (America/Caracas).
const FROZEN_NOW = DateTime.fromISO('2026-10-20T15:00:00Z')

/**
 * Fixed-date dataset (August 2026, with July history and September due dates) covering every
 * source of the account statement. All dates are in the past so credit statuses stay stable.
 */
async function seedDataset() {
  const cashBox = await Account.create({ name: 'Caja principal', isActive: true })
  const bank = await Account.create({ name: 'Banco', isActive: true })
  const customer = await Customer.create({
    name: 'Cliente estado',
    type: 'CORPORATE',
    creditDays: 30,
    active: true,
  })
  const supplier = await Supplier.create({
    name: 'Proveedor estado',
    rif: 'J999000111',
    active: true,
  })
  const machine = await Machine.create({
    name: 'Recta estado',
    type: 'RECTA',
    status: 'OPERATIONAL',
    active: true,
    isCredit: false,
    amountPaidUsd: '0.0000',
    balanceUsd: '0.0000',
  })

  // Ventas: 23:00 del 31/07 en Caracas cae en julio (apertura); 00:30 del 01/08 y 23:30 del
  // 31/08 caen en agosto.
  await seedTestSale({
    code: '0000080001',
    guestName: 'Venta julio noche',
    soldAt: DateTime.fromISO('2026-08-01T03:00:00Z'),
    totalUsd: '7.0000',
    lines: [{ quantity: '1', unitPriceUsd: '7.0000' }],
  })
  await seedTestSale({
    code: '0000080002',
    guestName: 'Venta agosto madrugada',
    soldAt: DateTime.fromISO('2026-08-01T04:30:00Z'),
    totalUsd: '10.0000',
    lines: [{ quantity: '1', unitPriceUsd: '10.0000' }],
  })
  await seedTestSale({
    code: '0000080003',
    guestName: 'Venta con descuento',
    soldAt: DateTime.fromISO('2026-08-15T15:00:00Z'),
    totalUsd: '18.0000',
    discountUsd: '2.0000',
    lines: [{ quantity: '2', unitPriceUsd: '10.0000' }],
  })
  await seedTestSale({
    code: '0000080004',
    guestName: 'Venta fin de mes',
    soldAt: DateTime.fromISO('2026-09-01T03:30:00Z'),
    totalUsd: '5.0000',
    lines: [{ quantity: '1', unitPriceUsd: '5.0000' }],
  })
  const creditSale = await seedTestSale({
    code: '0000080005',
    customerId: Number(customer.id),
    soldAt: DateTime.fromISO('2026-08-05T15:00:00Z'),
    paymentType: 'CREDIT',
    totalUsd: '40.0000',
    amountPaidUsd: '15.0000',
    balanceUsd: '25.0000',
    creditDueDate: DateTime.fromISO('2026-08-20'),
    lines: [{ quantity: '4', unitPriceUsd: '10.0000' }],
  })
  await seedTestSale({
    code: '0000080006',
    customerId: Number(customer.id),
    soldAt: DateTime.fromISO('2026-08-10T15:00:00Z'),
    paymentType: 'CREDIT',
    totalUsd: '12.0000',
    amountPaidUsd: '12.0000',
    balanceUsd: '0.0000',
    creditDueDate: DateTime.fromISO('2026-09-10'),
    lines: [{ quantity: '1', unitPriceUsd: '12.0000' }],
  })
  await seedTestSale({
    code: '0000080007',
    guestName: 'Venta devuelta',
    status: 'RETURNED',
    soldAt: DateTime.fromISO('2026-08-12T15:00:00Z'),
    totalUsd: '0.0000',
    lines: [{ quantity: '1', unitPriceUsd: '9.0000', returnedQuantity: '1' }],
  })

  await CustomerPayment.create({
    customerId: Number(customer.id),
    saleId: Number(creditSale.id),
    accountId: Number(cashBox.id),
    amountUsd: '15.0000',
    date: DateTime.fromISO('2026-08-18'),
  })
  await CustomerPayment.create({
    customerId: Number(customer.id),
    accountId: null,
    amountUsd: '4.0000',
    date: DateTime.fromISO('2026-07-20'),
  })

  // Compras: contado agosto, crédito vencido en agosto, crédito de julio que vence en
  // septiembre (arrastre) y crédito ya saldado.
  await Purchase.create({
    supplierId: Number(supplier.id),
    accountId: Number(cashBox.id),
    date: DateTime.fromISO('2026-08-03'),
    invoiceNumber: 'C-CONTADO',
    status: 'CONFIRMED',
    isCredit: false,
    totalUsd: '30.0000',
    totalBs: '0.00',
    amountPaidUsd: '30.0000',
    balanceUsd: '0.0000',
  })
  await Purchase.create({
    supplierId: Number(supplier.id),
    accountId: null,
    date: DateTime.fromISO('2026-08-04'),
    invoiceNumber: 'C-VENCIDA',
    status: 'CONFIRMED',
    isCredit: true,
    creditDueDate: DateTime.fromISO('2026-08-20'),
    totalUsd: '50.0000',
    totalBs: '0.00',
    amountPaidUsd: '10.0000',
    balanceUsd: '40.0000',
  })
  await Purchase.create({
    supplierId: Number(supplier.id),
    accountId: null,
    date: DateTime.fromISO('2026-07-25'),
    invoiceNumber: 'C-ARRASTRE',
    status: 'CONFIRMED',
    isCredit: true,
    creditDueDate: DateTime.fromISO('2026-09-10'),
    totalUsd: '20.0000',
    totalBs: '0.00',
    amountPaidUsd: '0.0000',
    balanceUsd: '20.0000',
  })
  await Purchase.create({
    supplierId: Number(supplier.id),
    accountId: Number(bank.id),
    date: DateTime.fromISO('2026-08-06'),
    invoiceNumber: 'C-SALDADA',
    status: 'CONFIRMED',
    isCredit: true,
    creditDueDate: DateTime.fromISO('2026-08-25'),
    totalUsd: '8.0000',
    totalBs: '0.00',
    amountPaidUsd: '8.0000',
    balanceUsd: '0.0000',
  })
  await Purchase.create({
    supplierId: Number(supplier.id),
    accountId: Number(cashBox.id),
    date: DateTime.fromISO('2026-07-10'),
    invoiceNumber: 'C-JULIO',
    status: 'CONFIRMED',
    isCredit: false,
    totalUsd: '6.0000',
    totalBs: '0.00',
    amountPaidUsd: '6.0000',
    balanceUsd: '0.0000',
  })

  await SupplierPayment.create({
    supplierId: Number(supplier.id),
    accountId: Number(bank.id),
    amountUsd: '10.0000',
    date: DateTime.fromISO('2026-08-22'),
  })

  await Expense.create({
    accountId: Number(cashBox.id),
    date: DateTime.fromISO('2026-08-09'),
    description: 'Gasto en bolívares',
    amountUsd: '0.5000',
    currencyCode: 'VES',
    entryRate: '100.0000',
  })
  await Expense.create({
    accountId: null,
    date: DateTime.fromISO('2026-07-15'),
    description: 'Gasto julio',
    amountUsd: '1.2500',
    currencyCode: 'XAU',
    entryRate: null,
  })

  await MachineExpense.create({
    machineId: Number(machine.id),
    accountId: Number(bank.id),
    date: DateTime.fromISO('2026-08-11'),
    category: 'REPAIR',
    description: 'Reparación legacy',
    amount: '200.00',
    currencyCode: 'VES',
  })

  await Income.create({
    accountId: Number(cashBox.id),
    date: DateTime.fromISO('2026-08-02'),
    description: 'Aporte de capital',
    amountUsd: '100.0000',
    currencyCode: 'XAU',
    entryRate: null,
  })

  return { cashBox, bank }
}

/** Database ids change on every run; the snapshot keeps everything else. */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize)
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !['id', 'referenceId', 'customerId', 'supplierId'].includes(key))
      .map(([key, entry]) => [key, normalize(entry)])
    return Object.fromEntries(entries)
  }
  if (typeof value === 'string') {
    return value.replace(/Compra #\d+/g, 'Compra #N')
  }
  return value
}

test.group('Account statement characterization', (group) => {
  const realNow = Settings.now

  group.setup(async () => {
    await testUtils.db().migrate()
  })

  // Other suites run after this one with narrower resets; leave no payments behind.
  group.teardown(async () => {
    await resetTestDatabase()
  })

  group.each.setup(async () => {
    Settings.now = () => FROZEN_NOW.toMillis()
    await resetTestDatabase()
    resetTestSaleCodes()
    await User.updateOrCreate(
      { email: TEST_EMAIL },
      { password: 'password123', name: 'Admin Estado', role: 'ADMIN', active: true }
    )
  })

  group.each.teardown(async () => {
    Settings.now = realNow
  })

  test('account statement and financial summary keep their current results', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const { cashBox } = await seedDataset()

    async function get(url: string, qs: Record<string, unknown>) {
      const response = await client.get(url).loginAs(user).qs(qs)
      response.assertStatus(200)
      return normalize(response.body().data)
    }

    const actual = {
      fullMonthUsd: await get('/api/v1/reports/account-statement', {
        month: '2026-08',
        display_currency: 'USD',
      }),
      cashBoxInVes: await get('/api/v1/reports/account-statement', {
        month: '2026-08',
        account_id: Number(cashBox.id),
        display_currency: 'VES',
      }),
      unassignedSalesAndExpenses: await get('/api/v1/reports/account-statement', {
        from: '2026-08-01',
        to: '2026-08-31',
        unassigned: true,
        types: 'sales,expenses',
      }),
      purchasesOnlyHalfMonth: await get('/api/v1/reports/account-statement', {
        from: '2026-08-01',
        to: '2026-08-15',
        types: 'purchases',
      }),
      financialSummary: await get('/api/v1/reports/financial-summary', { month: '2026-08' }),
    }

    if (process.env.UPDATE_SNAPSHOTS === '1') {
      writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(actual, null, 2)}\n`)
    }

    assert.isTrue(existsSync(SNAPSHOT_PATH), 'Missing snapshot: run with UPDATE_SNAPSHOTS=1')
    const expected = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))
    assert.deepEqual(actual, expected)
  })
})
