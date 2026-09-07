import User from '#models/user'
import Account from '#models/account'
import AppSetting from '#models/app_setting'
import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import CustomerPayment from '#models/customer_payment'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import ProductInventoryMovement from '#models/product_inventory_movement'
import Purchase from '#models/purchase'
import Supplier from '#models/supplier'
import SupplierPayment from '#models/supplier_payment'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestSaleCodes, seedTestSale } from '#tests/helpers/seed_test_sale'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-reports@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('expenses').delete()
  await db.from('incomes').delete()
  await db.from('machine_expenses').delete()
  await db.from('customer_payments').delete()
  await db.from('supplier_payments').delete()
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
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
  await db.from('users').delete()
  await AppSetting.updateOrCreate(
    { key: 'base_currency_code' },
    { value: 'XAU', updatedAt: DateTime.now() }
  )
  await db.from('currencies').where('code', 'XAU').update({
    rate_per_usd: '1.0000',
    is_active: true,
  })
  await db.from('currencies').where('code', 'USD').update({
    rate_per_usd: '100.0000',
    is_active: true,
  })
  await db.from('currencies').where('code', 'VES').update({
    rate_per_usd: '100.0000',
    is_active: true,
  })
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

test.group('Reports API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    resetTestSaleCodes()
    await seedAdminUser()
  })

  test('GET /api/v1/reports/account-statement returns summary for month', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales,purchases,expenses,machine_expenses' })
      .loginAs(user)

    response.assertStatus(200)
    assert.exists(response.body().data.summary)
    assert.exists(response.body().data.period)
    assert.isArray(response.body().data.movements)
  })

  test('GET /api/v1/reports/account-statement accepts unassigned filter', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', unassigned: true })
      .loginAs(user)

    response.assertStatus(200)
  })

  test('GET /api/v1/reports/account-statement accepts types as repeated query params', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: ['sales', 'purchases'] })
      .loginAs(user)

    response.assertStatus(200)
    assert.exists(response.body().data.summary)
  })

  test('GET /api/v1/reports/account-statement uses USD for catalog sales with returns', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente reporte',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Zapatos Adidas',
      category: 'Calzado',
      salePriceUsd: '7.0000',
      costUsd: '4.0000',
      active: true,
    })
    await seedTestSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO('2026-06-16'),
      confirmedAt: DateTime.fromISO('2026-06-16'),
      totalUsd: '7.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '7.0000',
          subtotalUsd: '7.0000',
        },
      ],
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          amountNative: string
          currencyCode: string
          amountDisplay: string
        }>
        summary: { sales: string }
      }
    }

    assert.lengthOf(body.data.movements, 1)
    assert.equal(body.data.movements[0].currencyCode, 'USD')
    assert.equal(body.data.movements[0].amountUsd, '7.0000')
    assert.equal(body.data.movements[0].amountNative, '7.0000')
    assert.equal(body.data.movements[0].amountDisplay, '7.00')
    assert.equal(body.data.summary.sales, '7.00')
  })

  test('GET /api/v1/reports/account-statement subtracts returned catalog quantity', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente devolución',
      type: 'CORPORATE',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Zapatos Adidas',
      category: 'Calzado',
      salePriceUsd: '7.0000',
      costUsd: '4.0000',
      active: true,
    })
    await seedTestSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO('2026-06-16'),
      confirmedAt: DateTime.fromISO('2026-06-16'),
      totalUsd: '7.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '2',
          unitPriceUsd: '7.0000',
          subtotalUsd: '14.0000',
          returnedQuantity: '1',
        },
      ],
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: { movements: Array<{ amountUsd: string }>; summary: { sales: string } }
    }

    assert.equal(body.data.movements[0].amountUsd, '7.0000')
    assert.equal(body.data.summary.sales, '7.00')
  })

  test('GET account-statement includes credit purchases by due date and unpaid carryover', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor crédito', active: true })
    const today = DateTime.now()
    const month = today.toFormat('yyyy-MM')
    const monthStart = today.startOf('month')
    const monthEnd = today.endOf('month')
    const nextMonth = today.plus({ months: 1 })
    const nextMonthKey = nextMonth.toFormat('yyyy-MM')

    const duePast = DateTime.max(monthStart, today.minus({ days: 2 }))
    const dueFutureCandidate = today.plus({ days: 5 })
    const dueFuture = dueFutureCandidate <= monthEnd ? dueFutureCandidate : today.plus({ days: 1 })
    const dueNextMonth = nextMonth.startOf('month').plus({ days: 14 })

    await Purchase.create({
      supplierId: supplier.id,
      date: today.minus({ days: 20 }),
      invoiceNumber: 'F-CRED-VENC',
      totalUsd: '100.0000',
      totalBs: '3600.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: duePast,
      balanceUsd: '100.0000',
      amountPaidUsd: '0.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: today.minus({ days: 5 }),
      invoiceNumber: 'F-CRED-PEND',
      totalUsd: '50.0000',
      totalBs: '1800.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: dueFuture,
      balanceUsd: '50.0000',
      amountPaidUsd: '0.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: today.minus({ days: 10 }),
      invoiceNumber: 'F-CRED-PROX',
      totalUsd: '80.0000',
      totalBs: '2880.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: dueNextMonth,
      balanceUsd: '80.0000',
      amountPaidUsd: '0.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: today,
      invoiceNumber: 'F-CONTADO',
      totalUsd: '25.0000',
      totalBs: '900.00',
      status: 'CONFIRMED',
      isCredit: false,
    })

    const currentMonthResponse = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month, types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    currentMonthResponse.assertStatus(200)
    const currentBody = currentMonthResponse.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          isCreditPurchase?: boolean
          creditReportStatus?: string
        }>
        summary: { purchasesUsd: string }
      }
    }

    const currentCredit = currentBody.data.movements.filter((m) => m.isCreditPurchase)
    assert.isAtLeast(currentCredit.length, 1)
    assert.exists(currentBody.data.movements.find((m) => m.amountUsd === '100.0000'))
    if (dueFuture <= monthEnd) {
      const pending = currentBody.data.movements.find((m) => m.amountUsd === '50.0000')
      assert.exists(pending)
      assert.equal(pending!.creditReportStatus, 'pending')
    }

    const nextMonthResponse = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: nextMonthKey, types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    nextMonthResponse.assertStatus(200)
    const nextBody = nextMonthResponse.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          isCreditPurchase?: boolean
          isCreditPurchaseCarryover?: boolean
          creditBalanceUsd?: string
          creditReportStatus?: string
        }>
      }
    }

    assert.exists(nextBody.data.movements.find((m) => m.amountUsd === '80.0000'))
    if (duePast < nextMonth.startOf('month')) {
      const carryover = nextBody.data.movements.find(
        (m) => m.isCreditPurchase && m.creditBalanceUsd === '100.0000'
      )
      assert.exists(carryover)
      assert.equal(carryover!.amountUsd, '0.0000')
      assert.equal(carryover!.isCreditPurchaseCarryover, true)
    }
  })

  test('GET account-statement does not double-count overdue credit purchases across months', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor arrastre', active: true })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-10'),
      invoiceNumber: 'F-CRED-ARR',
      totalUsd: '120.0000',
      totalBs: '4320.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: DateTime.fromISO('2026-06-10'),
      balanceUsd: '120.0000',
      amountPaidUsd: '0.0000',
    })

    const dueMonth = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    dueMonth.assertStatus(200)
    const dueBody = dueMonth.body() as {
      data: { summary: { purchasesUsd: string } }
    }
    assert.equal(dueBody.data.summary.purchasesUsd, '120.0000')

    const carryoverMonth = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-07', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    carryoverMonth.assertStatus(200)
    const carryoverBody = carryoverMonth.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          isCreditPurchaseCarryover?: boolean
          creditBalanceUsd?: string
        }>
        summary: { purchasesUsd: string }
      }
    }

    assert.equal(carryoverBody.data.summary.purchasesUsd, '0.0000')
    const carryover = carryoverBody.data.movements.find((m) => m.isCreditPurchaseCarryover)
    assert.exists(carryover)
    assert.equal(carryover!.amountUsd, '0.0000')
    assert.equal(carryover!.creditBalanceUsd, '120.0000')
  })

  test('GET account-statement lists settled credit purchases informatively with zero amount', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor saldado', active: true })
    const reportMonth = '2026-06'
    const dueDate = DateTime.fromISO('2026-06-15')

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      invoiceNumber: 'F-CRED-SALD',
      totalUsd: '100.0000',
      totalBs: '3600.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: dueDate,
      balanceUsd: '0.0000',
      amountPaidUsd: '100.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-06-10'),
      invoiceNumber: 'F-CONTADO-REF',
      totalUsd: '25.0000',
      totalBs: '900.00',
      status: 'CONFIRMED',
      isCredit: false,
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: reportMonth, types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{
          amountUsd: string
          isCreditPurchase?: boolean
          creditReportStatus?: string
        }>
        summary: { purchasesUsd: string }
      }
    }

    const settledCredit = body.data.movements.find((m) => m.amountUsd === '0.0000')
    assert.exists(settledCredit)
    assert.equal(settledCredit!.isCreditPurchase, true)
    assert.equal(settledCredit!.creditReportStatus, 'settled')
    assert.equal(body.data.summary.purchasesUsd, '25.0000')
    assert.exists(body.data.movements.find((m) => m.amountUsd === '25.0000'))
  })

  test('GET account-statement excludes credit sales from summary but lists them informatively', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente crédito reporte',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto crédito',
      category: 'Camisas',
      salePriceUsd: '100.0000',
      costUsd: '40.0000',
      active: true,
    })
    await seedTestSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO('2026-06-01'),
      confirmedAt: DateTime.fromISO('2026-06-01'),
      paymentType: 'CREDIT',
      amountPaidUsd: '0.0000',
      balanceUsd: '100.0000',
      creditDueDate: DateTime.fromISO('2026-07-01'),
      totalUsd: '100.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '100.0000',
          subtotalUsd: '100.0000',
        },
      ],
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{
          type: string
          isIncome: boolean
          isCreditSale?: boolean
          amountUsd: string
        }>
        summary: { sales: string }
      }
    }

    assert.equal(body.data.summary.sales, '0.00')
    assert.lengthOf(body.data.movements, 1)
    assert.equal(body.data.movements[0].type, 'sale')
    assert.equal(body.data.movements[0].isIncome, false)
    assert.equal(body.data.movements[0].isCreditSale, true)
    assert.equal(body.data.movements[0].amountUsd, '100.0000')
  })

  test('GET account-statement counts customer payments as sales income on payment date', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente abono reporte',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto abono',
      category: 'Camisas',
      salePriceUsd: '100.0000',
      costUsd: '40.0000',
      active: true,
    })
    const sale = await seedTestSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO('2026-06-01'),
      confirmedAt: DateTime.fromISO('2026-06-01'),
      paymentType: 'CREDIT',
      amountPaidUsd: '40.0000',
      balanceUsd: '60.0000',
      creditDueDate: DateTime.fromISO('2026-07-01'),
      totalUsd: '100.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '100.0000',
          subtotalUsd: '100.0000',
        },
      ],
    })
    await CustomerPayment.create({
      customerId: Number(customer.id),
      saleId: Number(sale.id),
      orderId: null,
      accountId: null,
      amountUsd: '40.0000',
      date: DateTime.fromISO('2026-06-15'),
      note: 'Abono parcial',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{
          type: string
          date: string
          isIncome: boolean
          isCreditSale?: boolean
          amountUsd: string
        }>
        summary: { sales: string }
      }
    }

    assert.equal(body.data.summary.sales, '40.00')
    const creditSale = body.data.movements.find((m) => m.type === 'sale')
    assert.exists(creditSale)
    assert.equal(creditSale!.isCreditSale, true)
    assert.equal(creditSale!.amountUsd, '60.0000')
    const paymentMovement = body.data.movements.find((m) => m.type === 'customer_payment')
    assert.exists(paymentMovement)
    assert.equal(paymentMovement!.date, '2026-06-15')
    assert.equal(paymentMovement!.isIncome, true)
    assert.equal(paymentMovement!.amountUsd, '40.0000')
  })

  test('GET account-statement omits customer payments outside period', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente abono fuera',
      type: 'CORPORATE',
      active: true,
    })
    await CustomerPayment.create({
      customerId: Number(customer.id),
      orderId: null,
      accountId: null,
      amountUsd: '25.0000',
      date: DateTime.fromISO('2026-07-05'),
      note: 'Abono julio',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ type: string }>
        summary: { sales: string }
      }
    }

    assert.equal(body.data.summary.sales, '0.00')
    assert.isEmpty(body.data.movements)
  })

  test('GET account-statement filters customer payments by account', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente cuenta',
      type: 'CORPORATE',
      active: true,
    })
    const accountA = await Account.create({ name: 'Caja A', description: null, isActive: true })
    const accountB = await Account.create({ name: 'Caja B', description: null, isActive: true })

    await CustomerPayment.create({
      customerId: Number(customer.id),
      orderId: null,
      accountId: Number(accountA.id),
      amountUsd: '30.0000',
      date: DateTime.fromISO('2026-06-10'),
    })
    await CustomerPayment.create({
      customerId: Number(customer.id),
      orderId: null,
      accountId: Number(accountB.id),
      amountUsd: '20.0000',
      date: DateTime.fromISO('2026-06-12'),
    })

    const filtered = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', account_id: accountA.id, display_currency: 'USD' })
      .loginAs(user)

    filtered.assertStatus(200)
    const filteredBody = filtered.body() as {
      data: {
        movements: Array<{ amountUsd: string }>
        summary: { sales: string }
      }
    }

    assert.equal(filteredBody.data.summary.sales, '30.00')
    assert.lengthOf(filteredBody.data.movements, 1)
    assert.equal(filteredBody.data.movements[0].amountUsd, '30.0000')
  })

  test('GET account-statement includes supplier payments in purchases', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor pago reporte', active: true })
    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      invoiceNumber: 'F-CRED-PAY',
      totalUsd: '80.0000',
      totalBs: '2880.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: DateTime.fromISO('2026-06-20'),
      balanceUsd: '30.0000',
      amountPaidUsd: '50.0000',
    })

    await SupplierPayment.create({
      supplierId: Number(supplier.id),
      purchaseId: Number(purchase.id),
      accountId: null,
      amountUsd: '50.0000',
      date: DateTime.fromISO('2026-06-15'),
      note: 'Pago parcial',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ type: string; date: string; isIncome: boolean; amountUsd: string }>
        summary: { purchasesUsd: string; purchases: string }
      }
    }

    assert.equal(body.data.summary.purchasesUsd, '80.0000')
    assert.equal(body.data.summary.purchases, '80.00')
    const paymentMovement = body.data.movements.find((m) => m.type === 'supplier_payment')
    assert.exists(paymentMovement)
    assert.equal(paymentMovement!.date, '2026-06-15')
    assert.equal(paymentMovement!.isIncome, false)
    assert.equal(paymentMovement!.amountUsd, '50.0000')
  })

  test('GET account-statement omits supplier payments outside period', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor pago fuera', active: true })

    await SupplierPayment.create({
      supplierId: Number(supplier.id),
      purchaseId: null,
      accountId: null,
      amountUsd: '35.0000',
      date: DateTime.fromISO('2026-07-05'),
      note: 'Pago julio',
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ type: string }>
        summary: { purchasesUsd: string }
      }
    }

    assert.equal(body.data.summary.purchasesUsd, '0.0000')
    assert.isEmpty(body.data.movements)
  })

  test('GET account-statement shows net credit sale amount after returns without counting as income', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente devolución crédito',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto devuelto crédito',
      category: 'Camisas',
      salePriceUsd: '50.0000',
      costUsd: '20.0000',
      active: true,
    })
    await seedTestSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO('2026-06-08'),
      confirmedAt: DateTime.fromISO('2026-06-08'),
      paymentType: 'CREDIT',
      amountPaidUsd: '0.0000',
      balanceUsd: '50.0000',
      creditDueDate: DateTime.fromISO('2026-07-08'),
      totalUsd: '100.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '2',
          unitPriceUsd: '50.0000',
          subtotalUsd: '100.0000',
          returnedQuantity: '1',
        },
      ],
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', types: 'sales', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ isCreditSale?: boolean; amountUsd: string; isIncome: boolean }>
        summary: { sales: string }
      }
    }

    assert.equal(body.data.summary.sales, '0.00')
    assert.equal(body.data.movements[0].amountUsd, '50.0000')
    assert.equal(body.data.movements[0].isCreditSale, true)
    assert.equal(body.data.movements[0].isIncome, false)
  })

  test('GET account-statement includes incomes in net balance', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await client.post('/api/v1/incomes').loginAs(user).json({
      date: '2026-06-15',
      description: 'Capital inicial',
      amount: 500,
    })

    const response = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: '2026-06', display_currency: 'USD' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        movements: Array<{ type: string; amountUsd: string; isIncome: boolean; label: string }>
        summary: { incomesUsd: string; netUsd: string; incomes: string }
      }
    }

    assert.equal(body.data.summary.incomesUsd, '500.0000')
    assert.equal(body.data.summary.netUsd, '500.0000')
    const incomeMovement = body.data.movements.find((m) => m.type === 'income')
    assert.exists(incomeMovement)
    assert.equal(incomeMovement!.label, 'Capital inicial')
    assert.equal(incomeMovement!.isIncome, true)
    assert.equal(incomeMovement!.amountUsd, '500.0000')
  })

  test('GET /reports/inventory returns products and materials snapshot', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const product = await CatalogProduct.create({
      name: 'Camisa stock',
      category: 'Uniforme',
      salePriceUsd: '25.0000',
      costUsd: '10.0000',
      stockQuantity: '8.000',
      minimumStock: '2.000',
      saleUnit: 'UND',
      active: true,
    })

    const material = await Material.create({
      code: 'MAT-INV-1',
      name: 'Tela report',
      category: 'Telas',
      unit: 'MTS',
      minimumStock: '5.000',
      lastPurchasePriceUsd: '3.5000',
      salePriceUsd: '0.0000',
      active: true,
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '12.000',
    })

    const response = await client
      .get('/api/v1/reports/inventory')
      .qs({ active: true, sort_by: 'name', sort_dir: 'asc' })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        products: Array<{
          kind: string
          product_id: number
          description: string
          total_quantity: string
          lines: Array<{ size: string | null; quantity: string }>
        }>
        meta: { total: number }
      }
    }

    assert.isAtLeast(body.data.meta.total, 2)
    const productRow = body.data.products.find(
      (row) => row.kind === 'product' && row.product_id === Number(product.id)
    )
    const materialRow = body.data.products.find(
      (row) => row.kind === 'material' && row.description === 'Tela report'
    )
    assert.exists(productRow)
    assert.equal(productRow!.total_quantity, '8.000')
    assert.equal(productRow!.lines[0].size, null)
    assert.exists(materialRow)
    assert.equal(materialRow!.total_quantity, '12.000')
  })

  test('GET /reports/inventory/:id/movements returns product movements', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const product = await CatalogProduct.create({
      name: 'Producto movimientos',
      category: 'Uniforme',
      salePriceUsd: '15.0000',
      costUsd: '5.0000',
      stockQuantity: '10.000',
      minimumStock: '1.000',
      saleUnit: 'UND',
      active: true,
    })

    await ProductInventoryMovement.create({
      catalogProductId: Number(product.id),
      type: 'MANUAL_CARGO',
      quantity: '10.000',
      note: 'Ajuste inicial',
    })

    const response = await client
      .get(`/api/v1/reports/inventory/${product.id}/movements`)
      .qs({ month: DateTime.now().toFormat('yyyy-MM') })
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        product: { product_id: number; description: string }
        movements: Array<{ type: string; note: string | null }>
      }
    }

    assert.equal(body.data.product.product_id, Number(product.id))
    assert.equal(body.data.product.description, 'Producto movimientos')
    assert.isAtLeast(body.data.movements.length, 1)
    assert.equal(body.data.movements[0].type, 'MANUAL_CARGO')
  })
})
