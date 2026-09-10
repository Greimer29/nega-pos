import Purchase from '#models/purchase'
import Material from '#models/material'
import InventoryMovement from '#models/inventory_movement'
import Machine from '#models/machine'
import MachineExpense from '#models/machine_expense'
import Expense from '#models/expense'
import Supplier from '#models/supplier'
import User from '#models/user'
import Customer from '#models/customer'
import CatalogProduct from '#models/catalog_product'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import Currency from '#models/currency'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import {
  resetTestSaleCodes,
  seedOpenSalesShift,
  seedTestSale,
  type SeedTestSaleInput,
} from '#tests/helpers/seed_test_sale'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-dashboard@negapos.local'
const TEST_PASSWORD = 'password123'

let openShiftId = 0

async function seedDashboardSale(input: SeedTestSaleInput) {
  return seedTestSale({
    ...input,
    salesShiftId: input.salesShiftId === undefined ? openShiftId : input.salesShiftId,
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

test.group('Dashboard API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    resetTestSaleCodes()
    await seedAdminUser()
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const shift = await seedOpenSalesShift(Number(user.id))
    openShiftId = Number(shift.id)
  })

  test('GET /api/v1/dashboard/summary requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/dashboard/summary')
    response.assertStatus(401)
  })

  test('GET /api/v1/dashboard/summary returns empty summary', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        bajoStock: [],
        purchasesMonth: {
          quantity: 0,
          totalUsd: '0.00',
        },
        machineExpensesMonth: {
          quantity: 0,
          totalAmount: '0.00',
        },
      },
    })

    const body = response.body()
    assert.isArray(body.data.bajoStock)
  })

  test('GET /api/v1/dashboard/summary lists materials below minimum stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await Material.create({
      code: '5810',
      name: 'Atlética',
      category: 'Uniforme',
      unit: 'ROL',
      minimumStock: '5',
      active: true,
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'MANUAL_ADJUSTMENT',
      quantity: '2',
    })

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    const body = response.body()
    assert.lengthOf(body.data.bajoStock, 1)
    assert.equal(body.data.bajoStock[0].code, '5810')
    assert.equal(body.data.bajoStock[0].stockActual, 2)
  })

  test('GET /api/v1/dashboard/summary sums confirmed purchases of current month', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'El Castillo', active: true })
    const mesActual = DateTime.now().toISODate()!

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO(mesActual),
      invoiceNumber: 'F-100',
      totalBs: '1500.50',
      totalUsd: '1500.50',
      status: 'CONFIRMED',
    })
    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO(mesActual),
      invoiceNumber: 'F-101',
      totalBs: '500.00',
      totalUsd: '500.00',
      status: 'CONFIRMED',
    })
    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2020-01-15'),
      invoiceNumber: 'F-VIEJA',
      totalBs: '9999.00',
      status: 'CONFIRMED',
    })
    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO(mesActual),
      totalBs: '300.00',
      status: 'DRAFT',
    })

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.purchasesMonth.quantity, 2)
    assert.equal(response.body().data.purchasesMonth.totalUsd, '2000.50')
  })

  test('GET /api/v1/dashboard/summary sums machine expenses of current month', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const mesActual = DateTime.now().toISODate()!
    const machine = await Machine.create({
      name: 'Overlock',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })

    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(mesActual),
      category: 'REPAIR',
      description: 'Needles replacement',
      amount: '150.50',
      currencyCode: 'XAU',
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(mesActual),
      category: 'SUPPLY',
      description: 'Machine oil',
      amount: '49.50',
      currencyCode: 'XAU',
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO('2020-01-15'),
      category: 'MAINTENANCE',
      description: 'Old service',
      amount: '999.00',
    })

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.machineExpensesMonth.quantity, 2)
    assert.equal(response.body().data.machineExpensesMonth.totalAmount, '200.00')
  })

  test('GET /api/v1/dashboard/daily-product-sales returns products sold today', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente Dashboard',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Camisa vendida hoy',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '12.0000',
      costUsd: '5.0000',
      stockQuantity: '8.000',
      active: true,
    })
    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.now(),
      totalUsd: '24.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '2',
          unitPriceUsd: '12.0000',
          subtotalUsd: '24.0000',
        },
      ],
    })

    const response = await client.get('/api/v1/dashboard/daily-product-sales').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        products: Array<{ id: number; quantity_sold: number; total_usd: string }>
        summary: { productos_vendidos: number; monto_productos_usd: string }
      }
    }

    assert.lengthOf(body.data.products, 1)
    assert.equal(body.data.products[0].id, Number(product.id))
    assert.equal(body.data.products[0].quantity_sold, 2)
    assert.equal(body.data.products[0].total_usd, '24.0000')
    assert.equal(body.data.summary.productos_vendidos, 2)
    assert.equal(body.data.summary.monto_productos_usd, '24.0000')
  })

  test('GET daily-product-sales uses formula stock for catalog products', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await Material.create({
      code: 'MAT-DASH-FORM',
      name: 'Material dashboard',
      category: 'Uniforme',
      unit: 'UND',
      minimumStock: '0',
      lastPurchasePriceUsd: '1.0000',
      active: true,
    })
    await InventoryMovement.create({
      materialId: material.id,
      type: 'MANUAL_ADJUSTMENT',
      quantity: '20',
    })

    const formula = await Formula.create({ name: 'Fórmula dashboard', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })

    const product = await CatalogProduct.create({
      name: 'Producto fórmula dashboard',
      category: 'Credito',
      saleUnit: 'UND',
      salePriceUsd: '12.0000',
      costUsd: '2.0000',
      formulaId: Number(formula.id),
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client.get('/api/v1/dashboard/daily-product-sales').loginAs(user)

    response.assertStatus(200)
    const item = response
      .body()
      .data.products.find((row: { id: number }) => row.id === Number(product.id))

    assert.isUndefined(item)

    const customer = await Customer.create({ name: 'Cliente fórmula', active: true })
    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.now(),
      totalUsd: '24.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '2',
          unitPriceUsd: '12.0000',
          subtotalUsd: '24.0000',
        },
      ],
    })

    const afterSale = await client.get('/api/v1/dashboard/daily-product-sales').loginAs(user)

    afterSale.assertStatus(200)
    const soldItem = afterSale
      .body()
      .data.products.find((row: { id: number }) => row.id === Number(product.id))

    assert.exists(soldItem)
    assert.equal(soldItem.quantity_sold, 2)
    assert.equal(soldItem.stock_quantity, '10.000')
  })

  test('GET /api/v1/dashboard/overview subtracts daily expenses from ganancia del dia', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!
    const customer = await Customer.create({
      name: 'Cliente Ganancia',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto ganancia',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '12.0000',
      costUsd: '5.0000',
      stockQuantity: '10.000',
      active: true,
    })
    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.now(),
      totalUsd: '24.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '2',
          unitPriceUsd: '12.0000',
          subtotalUsd: '24.0000',
        },
      ],
    })

    await Expense.create({
      date: DateTime.fromISO(hoy),
      description: 'Transporte',
      amountUsd: '4.0000',
      currencyCode: 'XAU',
    })

    const machine = await Machine.create({
      name: 'Overlock ganancia',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(hoy),
      category: 'REPAIR',
      description: 'Repuesto',
      amount: '6.0000',
      currencyCode: 'XAU',
    })

    const response = await client.get('/api/v1/dashboard/overview').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        ventasDelDia: { gastosMontoUsd: string }
        gananciaDelDia: { montoUsd: string; porcentajeSobreVentas: number }
      }
    }

    assert.equal(body.data.ventasDelDia.gastosMontoUsd, '10.0000')
    assert.equal(body.data.gananciaDelDia.montoUsd, '4.0000')
    assert.equal(body.data.gananciaDelDia.porcentajeSobreVentas, 16.67)
  })

  test('GET /api/v1/dashboard/daily-expenses returns expenses for today', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!

    await Expense.create({
      date: DateTime.fromISO(hoy),
      description: 'Transporte',
      amountUsd: '4.0000',
      currencyCode: 'XAU',
    })

    const machine = await Machine.create({
      name: 'Overlock gastos',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(hoy),
      category: 'REPAIR',
      description: 'Repuesto',
      amount: '6.0000',
      currencyCode: 'XAU',
    })

    const response = await client.get('/api/v1/dashboard/daily-expenses').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        items: Array<{ kind: string; description: string; amount_usd: string }>
        summary: { gastos_cantidad: number; gastos_monto_usd: string }
      }
    }

    assert.equal(body.data.summary.gastos_cantidad, 2)
    assert.equal(body.data.summary.gastos_monto_usd, '10.0000')
    assert.lengthOf(body.data.items, 2)
  })

  test('GET /api/v1/dashboard/overview converts machine expenses in VES to USD', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!

    await Currency.query().where('code', 'VES').update({ ratePerUsd: '40.0000' })

    const machine = await Machine.create({
      name: 'Overlock VES',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(hoy),
      category: 'REPAIR',
      description: 'Repuesto en bolívares',
      amount: '4000.0000',
      currencyCode: 'VES',
    })

    const response = await client.get('/api/v1/dashboard/overview').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        ventasDelDia: { gastosMontoUsd: string }
        machineExpensesMonth: { totalAmount: string }
      }
    }

    assert.equal(body.data.ventasDelDia.gastosMontoUsd, '100.0000')
    assert.equal(body.data.machineExpensesMonth.totalAmount, '100.00')
  })

  test('GET /api/v1/dashboard/overview uses open shift for ventas del dia', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!
    const customer = await Customer.create({ name: 'Cliente Fecha', active: true })
    const product = await CatalogProduct.create({
      name: 'Producto fecha venta',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '5.000',
      active: true,
    })

    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO(hoy),
      confirmedAt: DateTime.now().minus({ days: 2 }),
      totalUsd: '10.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '10.0000',
          subtotalUsd: '10.0000',
          costUsd: '4.0000',
        },
      ],
    })

    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO(hoy),
      confirmedAt: DateTime.now(),
      totalUsd: '10.0000',
      salesShiftId: null,
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '10.0000',
          subtotalUsd: '10.0000',
          costUsd: '4.0000',
        },
      ],
    })

    const response = await client.get('/api/v1/dashboard/overview').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        ventasDelDia: { productosVendidos: number; montoProductosUsd: string }
        gananciaDelDia: { montoUsd: string }
      }
    }

    assert.equal(body.data.ventasDelDia.productosVendidos, 1)
    assert.equal(body.data.ventasDelDia.montoProductosUsd, '10.0000')
    assert.equal(body.data.gananciaDelDia.montoUsd, '6.0000')
  })

  test('GET /api/v1/dashboard/overview uses frozen line cost for ganancia del dia', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!
    const customer = await Customer.create({ name: 'Cliente Costo', active: true })
    const product = await CatalogProduct.create({
      name: 'Producto costo congelado',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '20.0000',
      costUsd: '5.0000',
      stockQuantity: '5.000',
      active: true,
    })

    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO(hoy),
      totalUsd: '20.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '20.0000',
          subtotalUsd: '20.0000',
          costUsd: '5.0000',
        },
      ],
    })

    product.costUsd = '12.0000'
    await product.save()

    const response = await client.get('/api/v1/dashboard/overview').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: { gananciaDelDia: { montoUsd: string } }
    }

    assert.equal(body.data.gananciaDelDia.montoUsd, '15.0000')
  })

  test('GET /api/v1/dashboard/overview matches report sales for same sold_at', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!
    const mes = DateTime.now().toFormat('yyyy-MM')
    const customer = await Customer.create({ name: 'Cliente coherencia', active: true })
    const product = await CatalogProduct.create({
      name: 'Producto coherencia reporte',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '30.0000',
      costUsd: '10.0000',
      stockQuantity: '5.000',
      active: true,
    })

    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO(hoy),
      confirmedAt: DateTime.now().minus({ days: 3 }),
      totalUsd: '60.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '2',
          unitPriceUsd: '30.0000',
          subtotalUsd: '60.0000',
          costUsd: '10.0000',
        },
      ],
    })

    const dashboardResponse = await client.get('/api/v1/dashboard/overview').loginAs(user)
    dashboardResponse.assertStatus(200)

    const reportResponse = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: mes, types: 'sales', display_currency: 'XAU' })
      .loginAs(user)

    reportResponse.assertStatus(200)

    const dashboardBody = dashboardResponse.body() as {
      data: {
        ventasDelDia: { montoProductosUsd: string; montoCreditoUsd: string }
      }
    }
    const reportBody = reportResponse.body() as {
      data: { summary: { sales: string } }
    }

    const cashSalesUsd =
      Number(dashboardBody.data.ventasDelDia.montoProductosUsd) -
      Number(dashboardBody.data.ventasDelDia.montoCreditoUsd)

    assert.equal(dashboardBody.data.ventasDelDia.montoProductosUsd, '60.0000')
    assert.equal(reportBody.data.summary.sales, cashSalesUsd.toFixed(2))
  })

  test('GET /api/v1/dashboard/overview report sales match cash-only portion on mixed day', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const hoy = DateTime.now().toISODate()!
    const customer = await Customer.create({
      name: 'Cliente mixto coherencia',
      creditDays: 30,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto mixto coherencia',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '30.0000',
      costUsd: '10.0000',
      stockQuantity: '10.000',
      active: true,
    })

    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO(hoy),
      totalUsd: '60.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '2',
          unitPriceUsd: '30.0000',
          subtotalUsd: '60.0000',
          costUsd: '10.0000',
        },
      ],
    })

    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.fromISO(hoy),
      paymentType: 'CREDIT',
      amountPaidUsd: '0.0000',
      balanceUsd: '40.0000',
      creditDueDate: DateTime.now().plus({ days: 30 }),
      totalUsd: '40.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '40.0000',
          subtotalUsd: '40.0000',
          costUsd: '10.0000',
        },
      ],
    })

    const dashboardResponse = await client.get('/api/v1/dashboard/overview').loginAs(user)
    dashboardResponse.assertStatus(200)

    const reportResponse = await client
      .get('/api/v1/reports/account-statement')
      .qs({ from: hoy, to: hoy, types: 'sales', display_currency: 'XAU' })
      .loginAs(user)

    reportResponse.assertStatus(200)

    const dashboardBody = dashboardResponse.body() as {
      data: {
        ventasDelDia: { montoProductosUsd: string; montoCreditoUsd: string }
      }
    }
    const reportBody = reportResponse.body() as {
      data: { summary: { sales: string } }
    }

    assert.equal(dashboardBody.data.ventasDelDia.montoProductosUsd, '100.0000')
    assert.equal(dashboardBody.data.ventasDelDia.montoCreditoUsd, '40.0000')
    assert.equal(reportBody.data.summary.sales, '60.00')
  })

  test('GET /api/v1/dashboard/overview separates credit sales from net profit and daily credit amount', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente crédito dashboard',
      creditDays: 30,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto mixto dashboard',
      category: 'Camisas',
      saleUnit: 'UND',
      salePriceUsd: '50.0000',
      costUsd: '32.0000',
      stockQuantity: '20.000',
      active: true,
    })

    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.now(),
      totalUsd: '50.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '50.0000',
          subtotalUsd: '50.0000',
          costUsd: '32.0000',
        },
      ],
    })

    await seedDashboardSale({
      customerId: Number(customer.id),
      soldAt: DateTime.now(),
      paymentType: 'CREDIT',
      amountPaidUsd: '0.0000',
      balanceUsd: '50.0000',
      creditDueDate: DateTime.now().plus({ days: 30 }),
      totalUsd: '50.0000',
      lines: [
        {
          catalogProductId: Number(product.id),
          description: product.name,
          quantity: '1',
          unitPriceUsd: '50.0000',
          subtotalUsd: '50.0000',
          costUsd: '32.0000',
        },
      ],
    })

    const response = await client.get('/api/v1/dashboard/overview').loginAs(user)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        ventasDelDia: {
          montoProductosUsd: string
          montoCreditoUsd: string
          pedidosCredito: number
        }
        gananciaDelDia: {
          montoUsd: string
          gananciaCreditoUsd: string
          porcentajeSobreVentas: number
        }
      }
    }

    assert.equal(body.data.ventasDelDia.montoProductosUsd, '100.0000')
    assert.equal(body.data.ventasDelDia.montoCreditoUsd, '50.0000')
    assert.equal(body.data.ventasDelDia.pedidosCredito, 1)
    assert.equal(body.data.gananciaDelDia.gananciaCreditoUsd, '18.0000')
    assert.equal(body.data.gananciaDelDia.montoUsd, '18.0000')
    assert.equal(body.data.gananciaDelDia.porcentajeSobreVentas, 36)
  })

  test('GET dashboard purchasesMonth excludes unpaid credit from cash total', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor crédito dashboard', active: true })
    const dueInMonth = DateTime.now().endOf('month').minus({ days: 1 })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now().minus({ days: 40 }),
      invoiceNumber: 'F-CRED-DASH',
      totalUsd: '100.0000',
      totalBs: '3600.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: dueInMonth,
      balanceUsd: '35.0000',
      amountPaidUsd: '65.0000',
    })

    const response = await client.get('/api/v1/dashboard/summary').loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.purchasesMonth.quantity, 0)
    assert.equal(response.body().data.purchasesMonth.totalUsd, '0.00')
  })

  test('GET dashboard purchasesMonth matches report purchasesUsd for current month', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Proveedor coherencia dashboard', active: true })
    const mes = DateTime.now().toFormat('yyyy-MM')
    const mesActual = DateTime.now().toISODate()!

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO(mesActual),
      invoiceNumber: 'F-CASH-DASH',
      totalUsd: '25.0000',
      totalBs: '900.00',
      status: 'CONFIRMED',
      isCredit: false,
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now().minus({ days: 20 }),
      invoiceNumber: 'F-CRED-DASH-2',
      totalUsd: '80.0000',
      totalBs: '2880.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: DateTime.now().endOf('month').minus({ days: 2 }),
      balanceUsd: '40.0000',
      amountPaidUsd: '40.0000',
    })

    const dashboardResponse = await client.get('/api/v1/dashboard/summary').loginAs(user)
    const reportResponse = await client
      .get('/api/v1/reports/account-statement')
      .qs({ month: mes, types: 'purchases', display_currency: 'USD' })
      .loginAs(user)

    dashboardResponse.assertStatus(200)
    reportResponse.assertStatus(200)

    const dashboardTotal = dashboardResponse.body().data.purchasesMonth.totalUsd
    const reportTotal = Number(reportResponse.body().data.summary.purchasesUsd).toFixed(2)

    assert.equal(dashboardTotal, reportTotal)
    assert.equal(dashboardTotal, '25.00')
  })

  test('GET dashboard overview daily chart spans the same ISO week as weekly chart', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const dailyResponse = await client
      .get('/api/v1/dashboard/overview')
      .qs({ chart: 'daily' })
      .loginAs(user)
    const weeklyResponse = await client
      .get('/api/v1/dashboard/overview')
      .qs({ chart: 'weekly' })
      .loginAs(user)

    dailyResponse.assertStatus(200)
    weeklyResponse.assertStatus(200)

    const dailySeries = dailyResponse.body().data.ventasSeries as Array<{ label: string }>
    const weeklySeries = weeklyResponse.body().data.ventasSeries as Array<{ label: string }>

    assert.lengthOf(dailySeries, 7)
    assert.lengthOf(weeklySeries, 8)
    assert.match(dailySeries[0]!.label, /^lun/i)
  })

  test('GET /api/v1/dashboard/daily-closing aggregates sales by payment method', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const shiftId = openShiftId

    await seedDashboardSale({
      totalUsd: '25.0000',
      paymentMethodCode: 'cash_usd',
      salesShiftId: shiftId,
      lines: [{ quantity: '1', unitPriceUsd: '25.0000' }],
    })

    await seedDashboardSale({
      totalUsd: '15.0000',
      paymentMethodCode: 'zelle',
      salesShiftId: shiftId,
      lines: [{ quantity: '1', unitPriceUsd: '15.0000' }],
    })

    await seedDashboardSale({
      totalUsd: '30.0000',
      paymentType: 'CREDIT',
      paymentMethodCode: null,
      salesShiftId: shiftId,
      lines: [{ quantity: '1', unitPriceUsd: '30.0000' }],
    })

    const response = await client
      .get('/api/v1/dashboard/daily-closing')
      .qs({ sales_shift_id: shiftId })
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body().data
    assert.equal(body.summary.invoices_count, 3)
    assert.equal(body.summary.cash_total_usd, '40.0000')
    assert.equal(body.summary.credit_total_usd, '30.0000')
    assert.lengthOf(body.by_payment_method, 2)

    const cashUsd = body.by_payment_method.find(
      (item: { code: string }) => item.code === 'cash_usd'
    )
    assert.equal(cashUsd.sales_count, 1)
    assert.equal(cashUsd.total_usd, '25.0000')
  })

  test('GET /api/v1/dashboard/daily-closing includes expenses for the selected shift', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const today = DateTime.now().toISODate()!
    const shiftId = openShiftId

    await seedDashboardSale({
      totalUsd: '50.0000',
      paymentMethodCode: 'cash_usd',
      salesShiftId: shiftId,
      lines: [{ quantity: '1', unitPriceUsd: '50.0000' }],
    })

    await Expense.create({
      date: DateTime.fromISO(today),
      description: 'Transporte cierre',
      amountUsd: '10.0000',
      currencyCode: 'XAU',
    })

    const machine = await Machine.create({
      name: 'Máquina cierre',
      type: 'OVERLOCK',
      status: 'OPERATIONAL',
      active: true,
    })
    await MachineExpense.create({
      machineId: Number(machine.id),
      date: DateTime.fromISO(today),
      category: 'REPAIR',
      description: 'Repuesto cierre',
      amount: '5.0000',
      currencyCode: 'XAU',
    })

    const response = await client
      .get('/api/v1/dashboard/daily-closing')
      .qs({ sales_shift_id: shiftId })
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body().data
    assert.equal(body.summary.expenses_count, 2)
    assert.equal(body.summary.cash_total_usd, '50.0000')

    const companyExpense = body.expenses.items.find(
      (item: { kind: string; description: string }) =>
        item.kind === 'expense' && item.description === 'Transporte cierre'
    )
    const machineExpense = body.expenses.items.find(
      (item: { kind: string; description: string }) =>
        item.kind === 'machine_expense' && item.description === 'Repuesto cierre'
    )
    assert.exists(companyExpense)
    assert.exists(machineExpense)
    assert.equal(companyExpense.amount_usd, '10.0000')
    assert.equal(machineExpense.amount_usd, '5.0000')
    assert.equal(body.summary.expenses_total_usd, '15.0000')
    assert.equal(body.summary.net_cash_usd, '35.0000')
    assert.lengthOf(body.expenses.items, 2)
  })
})
