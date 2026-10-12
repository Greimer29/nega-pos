import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Material from '#models/material'
import PaymentMethod from '#models/payment_method'
import Sale from '#models/sale'
import SalesShift from '#models/sales_shift'
import User from '#models/user'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-offline-exhaustive@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Offline Exhaustive',
      role: 'ADMIN',
      active: true,
    }
  )
}

async function openShift(user: User) {
  return SalesShift.create({
    openedAt: DateTime.now(),
    openedByUserId: user.id,
    status: 'OPEN',
  })
}

test.group('Offline sales exhaustive cases', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('rápida contado sin descuento', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    await openShift(user)
    const product = await CatalogProduct.create({
      name: 'Prod contado',
      category: 'Uniforme',
      salePriceUsd: '12.0000',
      costUsd: '5.0000',
      stockQuantity: '50.0000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhcontado000001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 12,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ catalog_product_id: Number(product.id), quantity: 1, unit_price_usd: 12 }],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.billing_mode, 'FAST')
    assert.equal(response.body().data.sale.order_status, 'DELIVERED')
    assert.equal(response.body().data.sale.status, 'COMPLETED')
    assert.equal(Number(response.body().data.sale.discount_usd), 0)
  })

  test('rápida contado con descuento', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    await openShift(user)
    const product = await CatalogProduct.create({
      name: 'Prod desc',
      category: 'Uniforme',
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      stockQuantity: '50.0000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhdesc000000001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 5,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 15,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ catalog_product_id: Number(product.id), quantity: 1, unit_price_usd: 20 }],
      })

    response.assertStatus(200)
    assert.equal(Number(response.body().data.sale.discount_usd), 5)
    assert.equal(Number(response.body().data.sale.total_usd), 15)
  })

  test('varios métodos de pago', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const methods = await PaymentMethod.query().where('isActive', true).limit(2)
    assert.isAtLeast(methods.length, 1)
    await openShift(user)
    const product = await CatalogProduct.create({
      name: 'Prod multi',
      category: 'Uniforme',
      salePriceUsd: '30.0000',
      costUsd: '10.0000',
      stockQuantity: '50.0000',
      active: true,
    })

    const payments =
      methods.length >= 2
        ? [
            {
              payment_method_code: methods[0].code,
              amount_usd: 10,
              currency_code: methods[0].currencyCode,
              usd_rate: 1,
            },
            {
              payment_method_code: methods[1].code,
              amount_usd: 20,
              currency_code: methods[1].currencyCode,
              usd_rate: 1,
            },
          ]
        : [
            {
              payment_method_code: methods[0].code,
              amount_usd: 30,
              currency_code: methods[0].currencyCode,
              usd_rate: 1,
            },
          ]

    const response = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhmulti00000001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments,
        lines: [{ catalog_product_id: Number(product.id), quantity: 1, unit_price_usd: 30 }],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.payments.length, payments.length)
  })

  test('crédito con cliente', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await openShift(user)
    const customer = await Customer.create({
      name: 'Cliente crédito offline',
      type: 'CORPORATE',
      creditDays: 15,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Prod credito',
      category: 'Uniforme',
      salePriceUsd: '18.0000',
      costUsd: '7.0000',
      stockQuantity: '50.0000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhcredito000001',
        sold_at: DateTime.now().toISO(),
        customer_id: Number(customer.id),
        payment_type: 'CREDIT',
        billing_mode: 'FAST',
        discount_usd: 0,
        lines: [{ catalog_product_id: Number(product.id), quantity: 1, unit_price_usd: 18 }],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.payment_type, 'CREDIT')
    assert.isAbove(Number(response.body().data.sale.balance_usd), 0)
  })

  test('pedido queda PENDING', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    await openShift(user)
    const product = await CatalogProduct.create({
      name: 'Prod pedido',
      category: 'Uniforme',
      salePriceUsd: '14.0000',
      costUsd: '6.0000',
      stockQuantity: '50.0000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhpedido0000001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'ORDER',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 14,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ catalog_product_id: Number(product.id), quantity: 1, unit_price_usd: 14 }],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.billing_mode, 'ORDER')
    assert.equal(response.body().data.sale.order_status, 'PENDING')
  })

  test('transición de pedido offline', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    await openShift(user)
    const product = await CatalogProduct.create({
      name: 'Prod estado',
      category: 'Uniforme',
      salePriceUsd: '11.0000',
      costUsd: '4.0000',
      stockQuantity: '50.0000',
      active: true,
    })

    const created = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhestado0000001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'ORDER',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 11,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ catalog_product_id: Number(product.id), quantity: 1, unit_price_usd: 11 }],
      })

    created.assertStatus(200)
    const saleId = created.body().data.sale.id

    const transition = await client
      .post('/api/v1/sales/offline/transitions')
      .loginAs(user)
      .json({ sale_id: saleId, order_status: 'IN_PROCESS' })

    transition.assertStatus(200)
    assert.equal(transition.body().data.sale.order_status, 'IN_PROCESS')
  })

  test('material (detalle) y servicio', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    await openShift(user)

    const material = await Material.create({
      code: 'MAT-OFF-1',
      name: 'Tela offline',
      category: 'TELA',
      unit: 'MTS',
      minimumStock: '0',
      salePriceUsd: '5.0000',
      lastPurchasePriceUsd: '3.0000',
      active: true,
    })

    const service = await CatalogProduct.create({
      name: 'Servicio offline',
      category: 'Servicio',
      itemKind: 'SERVICE',
      salePriceUsd: '25.0000',
      costUsd: '0.0000',
      stockQuantity: '0.0000',
      active: true,
    })

    const materialSale = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhmaterial00001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 5,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ material_id: Number(material.id), quantity: 1, unit_price_usd: 5 }],
      })
    materialSale.assertStatus(200)

    const serviceSale = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhservicio00001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 25,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [
          {
            catalog_product_id: Number(service.id),
            quantity: 1,
            unit_price_usd: 25,
            description: 'Ajuste',
          },
        ],
      })
    serviceSale.assertStatus(200)
    assert.equal(serviceSale.body().data.sale.status, 'COMPLETED')
  })

  test('mayorista y fórmula', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    await openShift(user)

    const ingredient = await Material.create({
      code: 'MAT-OFF-F',
      name: 'Insumo fórmula',
      category: 'INSUMO',
      unit: 'UND',
      minimumStock: '0',
      lastPurchasePriceUsd: '1.0000',
      active: true,
    })

    const formula = await Formula.create({
      name: 'Fórmula offline',
      active: true,
    })
    await FormulaMaterial.create({
      formulaId: formula.id,
      materialId: ingredient.id,
      quantity: '2.0000',
    })

    // Seed stock for formula material via inventory movement if needed — offline allows short stock.
    const formulaProduct = await CatalogProduct.create({
      name: 'Prod fórmula',
      category: 'Uniforme',
      salePriceUsd: '40.0000',
      costUsd: '2.0000',
      stockQuantity: '0.0000',
      formulaId: formula.id,
      active: true,
    })

    const wholesale = await CatalogProduct.create({
      name: 'Prod mayorista',
      category: 'Uniforme',
      salePriceUsd: '8.0000',
      costUsd: '3.0000',
      stockQuantity: '100.0000',
      wholesaleEnabled: true,
      wholesaleUnitsPerPack: '10',
      wholesaleSalePriceUsd: '70.0000',
      wholesaleCostUsd: '25.0000',
      active: true,
    })

    const formulaSale = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhformula000001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 40,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ catalog_product_id: Number(formulaProduct.id), quantity: 1, unit_price_usd: 40 }],
      })
    formulaSale.assertStatus(200)

    const wholesaleSale = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhmayorista0001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 70,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [
          {
            catalog_product_id: Number(wholesale.id),
            quantity: 1,
            unit_price_usd: 70,
            is_wholesale: true,
          },
        ],
      })
    wholesaleSale.assertStatus(200)
    assert.equal(wholesaleSale.body().data.sale.status, 'COMPLETED')
  })

  test('stock insuficiente queda marcada para revisar', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    await openShift(user)
    const product = await CatalogProduct.create({
      name: 'Prod sin stock',
      category: 'Uniforme',
      salePriceUsd: '9.0000',
      costUsd: '3.0000',
      stockQuantity: '0.0000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhstocklow00001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 18,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ catalog_product_id: Number(product.id), quantity: 2, unit_price_usd: 9 }],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.needs_stock_review, true)
    const sale = await Sale.findOrFail(response.body().data.sale.id)
    assert.isTrue(Boolean(sale.needsStockReview))
  })

  test('acepta venta con turno ya cerrado', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    const shift = await SalesShift.create({
      openedAt: DateTime.now().minus({ hours: 2 }),
      closedAt: DateTime.now().minus({ hours: 1 }),
      openedByUserId: user.id,
      closedByUserId: user.id,
      status: 'CLOSED',
    })
    const product = await CatalogProduct.create({
      name: 'Prod turno cerrado',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '20.0000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhclosedshift01',
        sold_at: DateTime.now().minus({ hours: 1, minutes: 30 }).toISO(),
        sales_shift_id: Number(shift.id),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 10,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ catalog_product_id: Number(product.id), quantity: 1, unit_price_usd: 10 }],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.status, 'COMPLETED')
    const sale = await Sale.findOrFail(response.body().data.sale.id)
    assert.equal(Number(sale.salesShiftId), Number(shift.id))
  })

  test('devolución de venta ya sincronizada', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const method = await PaymentMethod.query().where('isActive', true).firstOrFail()
    await openShift(user)
    const product = await CatalogProduct.create({
      name: 'Prod devol',
      category: 'Uniforme',
      salePriceUsd: '16.0000',
      costUsd: '6.0000',
      stockQuantity: '40.0000',
      active: true,
    })

    const created = await client
      .post('/api/v1/sales/offline')
      .loginAs(user)
      .json({
        offline_client_id: 'exhdevolsync0001',
        sold_at: DateTime.now().toISO(),
        payment_type: 'CASH',
        billing_mode: 'FAST',
        discount_usd: 0,
        payments: [
          {
            payment_method_code: method.code,
            amount_usd: 16,
            currency_code: method.currencyCode,
            usd_rate: 1,
          },
        ],
        lines: [{ catalog_product_id: Number(product.id), quantity: 1, unit_price_usd: 16 }],
      })
    created.assertStatus(200)
    const saleId = created.body().data.sale.id
    const lineId = created.body().data.sale.lines[0].id

    const returned = await client
      .post('/api/v1/sales/offline/returns')
      .loginAs(user)
      .json({
        sale_id: saleId,
        lines: [{ line_id: lineId, quantity: 1 }],
      })

    returned.assertStatus(200)
    assert.equal(returned.body().data.sale.status, 'RETURNED')
  })

  test('cierre de turno offline', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const shift = await openShift(user)

    const response = await client
      .post('/api/v1/sales/offline/close-shift')
      .loginAs(user)
      .json({ sales_shift_id: Number(shift.id) })

    response.assertStatus(200)
    assert.equal(response.body().data.shift.status, 'CLOSED')
  })

  test('offline-catalog incluye clientes con crédito y métodos activos', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await Customer.create({
      name: 'Cliente catálogo offline',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })

    const response = await client.get('/api/v1/sales/offline-catalog').loginAs(user)
    response.assertStatus(200)
    const catalog = response.body().data.catalog
    assert.isAbove(catalog.customers.length, 0)
    assert.isAbove(catalog.payment_methods.length, 0)
    assert.isAbove(catalog.currencies.length, 0)
  })
})
