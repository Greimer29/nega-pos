import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Expense from '#models/expense'
import InventoryMovement from '#models/inventory_movement'
import Machine from '#models/machine'
import MachineExpense from '#models/machine_expense'
import Material from '#models/material'
import Purchase from '#models/purchase'
import SalePayment from '#models/sale_payment'
import SalesShift from '#models/sales_shift'
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

const TEST_EMAIL = 'test-dashboard-characterization@negapos.local'
const SNAPSHOT_PATH = fileURLToPath(
  new URL('../fixtures/dashboard_characterization.json', import.meta.url)
)

// 11:00 del 16/08/2026 en Caracas, con un turno abierto desde el 15/08.
const FROZEN_NOW = DateTime.fromISO('2026-08-16T15:00:00Z')

async function seedDataset(userId: number) {
  const shift = await SalesShift.create({
    openedAt: DateTime.fromISO('2026-08-15T12:00:00Z'),
    openedByUserId: userId,
    closedByUserId: null,
    status: 'OPEN',
    notes: null,
  })
  const shiftId = Number(shift.id)

  const customer = await Customer.create({
    name: 'Bodega Crédito',
    type: 'CORPORATE',
    creditDays: 15,
    active: true,
  })
  const supplier = await Supplier.create({ name: 'Distribuidora', rif: 'J888000222', active: true })
  const machine = await Machine.create({
    name: 'Selladora',
    type: 'SELLADORA',
    status: 'OPERATIONAL',
    active: true,
    isCredit: false,
    amountPaidUsd: '0.0000',
    balanceUsd: '0.0000',
  })

  const rice = await CatalogProduct.create({
    name: 'Arroz',
    category: 'Víveres',
    salePriceUsd: '2.0000',
    costUsd: '1.0000',
    stockQuantity: '50.000',
    minimumStock: '0.000',
    active: true,
  })
  const oil = await CatalogProduct.create({
    name: 'Aceite',
    category: 'Víveres',
    salePriceUsd: '5.0000',
    costUsd: '3.0000',
    stockQuantity: '1.000',
    minimumStock: '5.000',
    active: true,
  })
  const bags = await Material.create({
    code: 'BOLSA-1',
    name: 'Bolsas',
    category: 'Empaque',
    unit: 'UND',
    minimumStock: '10',
    active: true,
  })
  await InventoryMovement.create({
    materialId: Number(bags.id),
    type: 'PURCHASE_IN',
    quantity: '2',
  })

  // Turno: 23:30 del 15/08 en Caracas, con descuento de factura.
  await seedTestSale({
    code: '0000090001',
    guestName: 'Cliente noche',
    soldAt: DateTime.fromISO('2026-08-16T03:30:00Z'),
    salesShiftId: shiftId,
    totalUsd: '5.0000',
    discountUsd: '1.0000',
    lines: [
      {
        catalogProductId: Number(rice.id),
        quantity: '3',
        unitPriceUsd: '2.0000',
        costUsd: '1.0000',
      },
    ],
  })
  // Turno: pago dividido USD + pago móvil.
  const split = await seedTestSale({
    code: '0000090002',
    guestName: 'Cliente pago dividido',
    soldAt: DateTime.fromISO('2026-08-16T13:00:00Z'),
    salesShiftId: shiftId,
    paymentMethodCode: null,
    totalUsd: '10.0000',
    lines: [
      {
        catalogProductId: Number(oil.id),
        quantity: '2',
        unitPriceUsd: '5.0000',
        costUsd: '3.0000',
      },
    ],
  })
  await SalePayment.create({
    saleId: Number(split.id),
    paymentMethodCode: 'cash_usd',
    amountUsd: '4.0000',
    currencyCode: 'USD',
    usdRate: null,
    amountNative: null,
    sortOrder: 0,
  })
  await SalePayment.create({
    saleId: Number(split.id),
    paymentMethodCode: 'mobile_payment',
    amountUsd: '6.0000',
    currencyCode: 'VES',
    usdRate: '100.0000',
    amountNative: '600.00',
    sortOrder: 1,
  })
  // Turno: crédito mayorista.
  await seedTestSale({
    code: '0000090003',
    customerId: Number(customer.id),
    soldAt: DateTime.fromISO('2026-08-16T14:00:00Z'),
    salesShiftId: shiftId,
    paymentType: 'CREDIT',
    totalUsd: '15.0000',
    creditDueDate: DateTime.fromISO('2026-08-31'),
    lines: [
      {
        catalogProductId: Number(rice.id),
        quantity: '1',
        unitPriceUsd: '15.0000',
        costUsd: '8.0000',
        isWholesale: true,
        unitsPerPack: '10.000',
      },
    ],
  })
  // Turno: devolución parcial.
  await seedTestSale({
    code: '0000090004',
    guestName: 'Cliente devolución',
    soldAt: DateTime.fromISO('2026-08-16T14:30:00Z'),
    salesShiftId: shiftId,
    totalUsd: '5.0000',
    lines: [
      {
        catalogProductId: Number(oil.id),
        quantity: '2',
        unitPriceUsd: '5.0000',
        costUsd: '3.0000',
        returnedQuantity: '1',
      },
    ],
  })
  // Fuera del turno: día anterior y crédito vencido antiguo.
  await seedTestSale({
    code: '0000090005',
    guestName: 'Cliente 14',
    soldAt: DateTime.fromISO('2026-08-14T16:00:00Z'),
    salesShiftId: null,
    totalUsd: '20.0000',
    lines: [
      {
        catalogProductId: Number(rice.id),
        quantity: '10',
        unitPriceUsd: '2.0000',
        costUsd: '1.0000',
      },
    ],
  })
  await seedTestSale({
    code: '0000090006',
    customerId: Number(customer.id),
    soldAt: DateTime.fromISO('2026-07-20T16:00:00Z'),
    salesShiftId: null,
    paymentType: 'CREDIT',
    totalUsd: '9.0000',
    creditDueDate: DateTime.fromISO('2026-08-01'),
    lines: [{ quantity: '1', unitPriceUsd: '9.0000' }],
  })

  // Gasto con fecha del 15/08 cargado durante el turno que sigue abierto el 16/08.
  await Expense.create({
    date: DateTime.fromISO('2026-08-15'),
    description: 'Hielo',
    amountUsd: '0.5000',
    currencyCode: 'XAU',
  })
  await Expense.create({
    date: DateTime.fromISO('2026-08-16'),
    description: 'Bolsas',
    amountUsd: '0.2500',
    currencyCode: 'XAU',
  })
  await Expense.create({
    date: DateTime.fromISO('2026-08-16'),
    description: 'Factura proveedor antigua',
    amountUsd: '3.0000',
    currencyCode: 'XAU',
    supplierId: Number(supplier.id),
  })
  await MachineExpense.create({
    machineId: Number(machine.id),
    date: DateTime.fromISO('2026-08-16'),
    category: 'MAINTENANCE',
    description: 'Mantenimiento',
    amount: '100.00',
    currencyCode: 'VES',
  })

  await SupplierPayment.create({
    supplierId: Number(supplier.id),
    amountUsd: '7.0000',
    date: DateTime.fromISO('2026-08-16'),
  })
  await Purchase.create({
    supplierId: Number(supplier.id),
    date: DateTime.fromISO('2026-08-16'),
    invoiceNumber: 'D-CONTADO',
    status: 'CONFIRMED',
    isCredit: false,
    totalUsd: '12.0000',
    totalBs: '0.00',
    amountPaidUsd: '12.0000',
    balanceUsd: '0.0000',
  })
  await Purchase.create({
    supplierId: Number(supplier.id),
    date: DateTime.fromISO('2026-08-05'),
    invoiceNumber: 'D-CREDITO',
    status: 'CONFIRMED',
    isCredit: true,
    creditDueDate: DateTime.fromISO('2026-08-10'),
    totalUsd: '30.0000',
    totalBs: '0.00',
    amountPaidUsd: '0.0000',
    balanceUsd: '30.0000',
  })

  return { shiftId }
}

/**
 * Products are sorted by total only; MySQL returns tied rows in no fixed order,
 * so ties are broken by name to keep the snapshot stable across machines.
 */
function sortProductsByTotalThenName(products: unknown[]): unknown[] {
  return [...products].sort((a, b) => {
    const left = a as { total_usd?: string; name?: string }
    const right = b as { total_usd?: string; name?: string }
    const byTotal = Number(right.total_usd ?? 0) - Number(left.total_usd ?? 0)
    return byTotal !== 0 ? byTotal : String(left.name ?? '').localeCompare(String(right.name ?? ''))
  })
}

/** Database ids change on every run; the snapshot keeps everything else. */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize)
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !['id', 'sale_id'].includes(key))
      .map(([key, entry]) => [
        key,
        key === 'products' && Array.isArray(entry)
          ? normalize(sortProductsByTotalThenName(entry))
          : normalize(entry),
      ])
    return Object.fromEntries(entries)
  }
  return value
}

test.group('Dashboard characterization', (group) => {
  const realNow = Settings.now

  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    Settings.now = () => FROZEN_NOW.toMillis()
    await resetTestDatabase()
    resetTestSaleCodes()
    await User.updateOrCreate(
      { email: TEST_EMAIL },
      { password: 'password123', name: 'Admin Dashboard', role: 'ADMIN', active: true }
    )
  })

  group.each.teardown(async () => {
    Settings.now = realNow
  })

  // Other suites run after this one with narrower resets; leave nothing behind.
  group.teardown(async () => {
    await resetTestDatabase()
  })

  test('dashboard endpoints keep their current results', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const { shiftId } = await seedDataset(Number(user.id))

    async function get(url: string, qs: Record<string, unknown> = {}) {
      const response = await client.get(url).loginAs(user).qs(qs)
      response.assertStatus(200)
      return normalize(response.body().data)
    }

    const actual = {
      summary: await get('/api/v1/dashboard/summary'),
      overviewDaily: await get('/api/v1/dashboard/overview', { chart: 'daily' }),
      overviewWeekly: await get('/api/v1/dashboard/overview', { chart: 'weekly' }),
      overviewMonthly: await get('/api/v1/dashboard/overview', { chart: 'monthly' }),
      dailyProductSales: await get('/api/v1/dashboard/daily-product-sales'),
      dailyExpenses: await get('/api/v1/dashboard/daily-expenses'),
      closingToday: await get('/api/v1/dashboard/daily-closing'),
      closingShift: await get('/api/v1/dashboard/daily-closing', { sales_shift_id: shiftId }),
      closingPreviousDay: await get('/api/v1/dashboard/daily-closing', { date: '2026-08-14' }),
    }

    if (process.env.UPDATE_SNAPSHOTS === '1') {
      writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(actual, null, 2)}\n`)
    }

    assert.isTrue(existsSync(SNAPSHOT_PATH), 'Missing snapshot: run with UPDATE_SNAPSHOTS=1')
    const expected = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))
    assert.deepEqual(actual, expected)
  })
})
