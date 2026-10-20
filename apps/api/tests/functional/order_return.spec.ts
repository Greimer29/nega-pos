import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Customer from '#models/customer'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import ProductInventoryMovement from '#models/product_inventory_movement'
import User from '#models/user'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-order-return@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Return',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Order devolución venta API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('POST /api/v1/orders/:id/return reintegrates material and marks RETURNED', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente devolución',
      type: 'CORPORATE',
      active: true,
    })
    const material = await Material.create({
      code: 'TEL-DEV',
      name: 'Tela devolución',
      category: 'Uniforme',
      unit: 'ROL',
      minimumStock: '1',
      active: true,
    })
    const formula = await Formula.create({ name: 'Formula dev', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })
    const product = await CatalogProduct.create({
      name: 'Producto dev',
      category: 'UNIFORM',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '0.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202606-0100',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta a devolver',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'IN_PRODUCTION',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '5.000',
      unitPriceUsd: '20.0000',
      subtotalUsd: '100.0000',
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '100',
    })
    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'ORDER_OUT',
      quantity: '-10.000',
      orderId: Number(order.id),
    })

    const response = await client.post(`/api/v1/orders/${order.id}/return`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        order: {
          status: 'RETURNED',
        },
      },
    })

    await order.refresh()
    assert.isNotNull(order.returnedAt)
    assert.equal(order.status, 'RETURNED')

    const reversiones = await InventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'REVERSAL_ADJUSTMENT')

    assert.lengthOf(reversiones, 1)
    assert.equal(reversiones[0].quantity, '10.000')

    const stockResult = await db
      .from('inventory_movements')
      .where('material_id', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(stockResult?.total), 100)
  })

  test('POST /api/v1/orders/:id/return on DRAFT returns 422', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente borrador',
      type: 'CORPORATE',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202606-0101',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Borrador',
      totalQuantity: 1,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'DRAFT',
    })

    const response = await client.post(`/api/v1/orders/${order.id}/return`).loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'ORDER_NOT_RETURNABLE',
      },
    })
  })

  test('POST /api/v1/orders/:id/return on CONFIRMED without stock movement marks RETURNED', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente confirmado',
      type: 'CORPORATE',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202606-0102',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Confirmado sin producción',
      totalQuantity: 3,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'CONFIRMED',
    })

    const response = await client.post(`/api/v1/orders/${order.id}/return`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        order: {
          status: 'RETURNED',
        },
      },
    })

    const movimientos = await InventoryMovement.query().where('orderId', Number(order.id))
    assert.lengthOf(movimientos, 0)
  })

  test('POST /api/v1/orders/:id/return reverts product and material stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente mixto',
      type: 'CORPORATE',
      active: true,
    })
    const material = await Material.create({
      code: 'TEL-MIX',
      name: 'Tela mixta',
      category: 'Uniforme',
      unit: 'ROL',
      minimumStock: '1',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto mixto',
      category: 'UNIFORM',
      salePriceUsd: '25.0000',
      costUsd: '10.0000',
      stockQuantity: '10.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202606-0103',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta mixta',
      totalQuantity: 4,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'IN_PRODUCTION',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '4.000',
      unitPriceUsd: '25.0000',
      subtotalUsd: '100.0000',
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '50',
    })
    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'ORDER_OUT',
      quantity: '-8.000',
      orderId: Number(order.id),
    })
    await ProductInventoryMovement.create({
      catalogProductId: Number(product.id),
      type: 'SALE_OUT',
      quantity: '-4.000',
      orderId: Number(order.id),
    })
    await product.merge({ stockQuantity: '6.000' }).save()

    const response = await client.post(`/api/v1/orders/${order.id}/return`).loginAs(user)

    response.assertStatus(200)

    await product.refresh()
    assert.equal(product.stockQuantity, '10.000')

    const materialStock = await db
      .from('inventory_movements')
      .where('material_id', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(materialStock?.total), 50)

    const productReversals = await ProductInventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'REVERSAL_ADJUSTMENT')

    assert.lengthOf(productReversals, 1)
    assert.equal(productReversals[0].quantity, '4.000')
  })

  test('partial return followed by full return does not duplicate material stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente devolución parcial',
      type: 'CORPORATE',
      active: true,
    })
    const material = await Material.create({
      code: 'TEL-PARCIAL',
      name: 'Tela parcial',
      category: 'Uniforme',
      unit: 'ROL',
      minimumStock: '1',
      active: true,
    })
    const formula = await Formula.create({ name: 'Formula parcial', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })
    const product = await CatalogProduct.create({
      name: 'Producto parcial',
      category: 'UNIFORM',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '0.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202606-0200',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta parcial + total',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'IN_PRODUCTION',
    })
    const line = await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '5.000',
      unitPriceUsd: '20.0000',
      subtotalUsd: '100.0000',
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '100',
    })
    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'ORDER_OUT',
      quantity: '-10.000',
      orderId: Number(order.id),
    })

    const partialResponse = await client
      .post(`/api/v1/orders/${order.id}/return`)
      .loginAs(user)
      .json({
        lines: [{ line_id: Number(line.id), quantity: 2 }],
      })

    partialResponse.assertStatus(200)

    const fullResponse = await client.post(`/api/v1/orders/${order.id}/return`).loginAs(user)

    fullResponse.assertStatus(200)
    fullResponse.assertBodyContains({
      data: {
        order: {
          status: 'RETURNED',
        },
      },
    })

    const materialStock = await db
      .from('inventory_movements')
      .where('material_id', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(materialStock?.total), 100)
  })

  async function seedProductOrder(options: {
    code: string
    status: 'CONFIRMED' | 'IN_PRODUCTION' | 'DELIVERED'
    paymentType?: 'CASH' | 'CREDIT'
    quantity: number
    unitPriceUsd: number
    sizeStock?: number
  }) {
    const customer = await Customer.create({
      name: `Cliente ${options.code}`,
      type: 'CORPORATE',
      creditDays: options.paymentType === 'CREDIT' ? 30 : 0,
      active: true,
    })
    const product = await CatalogProduct.create({
      name: `Producto ${options.code}`,
      category: 'UNIFORM',
      salePriceUsd: options.unitPriceUsd.toFixed(4),
      costUsd: '5.0000',
      stockQuantity: '0.000',
      active: true,
    })
    const size =
      options.sizeStock !== undefined
        ? await CatalogProductSize.create({
            catalogProductId: Number(product.id),
            size: 'M',
            stockQuantity: options.sizeStock.toFixed(3),
          })
        : null

    const total = options.quantity * options.unitPriceUsd
    const isCredit = options.paymentType === 'CREDIT'
    const order = await Order.create({
      code: options.code,
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: `Pedido ${options.code}`,
      totalQuantity: options.quantity,
      totalPrice: total.toFixed(4),
      paymentType: options.paymentType ?? 'CASH',
      amountPaidUsd: isCredit ? '0.0000' : total.toFixed(4),
      balanceUsd: isCredit ? total.toFixed(4) : '0.0000',
      orderDate: DateTime.fromISO('2026-06-01'),
      status: options.status,
    })
    const line = await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      catalogProductSizeId: size ? Number(size.id) : null,
      size: size ? 'M' : null,
      quantity: options.quantity.toFixed(3),
      unitPriceUsd: options.unitPriceUsd.toFixed(4),
      subtotalUsd: total.toFixed(4),
    })
    await ProductInventoryMovement.create({
      catalogProductId: Number(product.id),
      type: 'SALE_OUT',
      quantity: (-options.quantity).toFixed(3),
      orderId: Number(order.id),
    })

    return { order, line, product, size }
  }

  test('partial cash return updates totals and stock; excess quantity rolls back', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const { order, line, product } = await seedProductOrder({
      code: 'PED-202606-0300',
      status: 'DELIVERED',
      quantity: 5,
      unitPriceUsd: 20,
    })

    const partial = await client
      .post(`/api/v1/orders/${order.id}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: Number(line.id), quantity: 2 }] })
    partial.assertStatus(200)

    await order.refresh()
    assert.equal(order.status, 'DELIVERED')
    assert.equal(Number(order.totalPrice), 60)
    assert.equal(order.totalQuantity, 3)
    assert.equal(order.amountPaidUsd, '60.0000')
    assert.equal(order.balanceUsd, '0.0000')

    await product.refresh()
    assert.equal(product.stockQuantity, '2.000')

    const excess = await client
      .post(`/api/v1/orders/${order.id}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: Number(line.id), quantity: 4 }] })
    excess.assertStatus(422)

    await line.refresh()
    assert.equal(Number(line.returnedQuantity), 2)
    await product.refresh()
    assert.equal(product.stockQuantity, '2.000')

    const reversals = await ProductInventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'REVERSAL_ADJUSTMENT')
    assert.lengthOf(reversals, 1)
    assert.equal(reversals[0].note, `Devolución venta ${order.code}`)
  })

  test('partial return on a credit order lowers the outstanding balance', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const { order, line } = await seedProductOrder({
      code: 'PED-202606-0301',
      status: 'DELIVERED',
      paymentType: 'CREDIT',
      quantity: 5,
      unitPriceUsd: 20,
    })

    const partial = await client
      .post(`/api/v1/orders/${order.id}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: Number(line.id), quantity: 2 }] })
    partial.assertStatus(200)

    await order.refresh()
    assert.equal(Number(order.totalPrice), 60)
    assert.equal(order.balanceUsd, '60.0000')
    assert.equal(order.amountPaidUsd, '0.0000')
  })

  test('sized product return restores size stock and caps product stock at what was sold', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const { order, line, product, size } = await seedProductOrder({
      code: 'PED-202606-0302',
      status: 'DELIVERED',
      quantity: 3,
      unitPriceUsd: 30,
      sizeStock: 1,
    })

    const partial = await client
      .post(`/api/v1/orders/${order.id}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: Number(line.id), quantity: 1 }] })
    partial.assertStatus(200)

    await size!.refresh()
    assert.equal(Number(size!.stockQuantity), 2)

    const full = await client.post(`/api/v1/orders/${order.id}/return`).loginAs(user)
    full.assertStatus(200)

    await order.refresh()
    assert.equal(order.status, 'RETURNED')
    assert.equal(Number(order.totalPrice), 0)
    assert.equal(order.totalQuantity, 0)

    await size!.refresh()
    assert.equal(Number(size!.stockQuantity), 4)

    const reversals = await ProductInventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'REVERSAL_ADJUSTMENT')
    assert.equal(
      reversals.reduce((sum, movement) => sum + Number(movement.quantity), 0),
      3
    )
    await product.refresh()
    assert.equal(product.stockQuantity, '3.000')
  })

  test('cancelling a confirmed order puts back product and size stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const { order, product, size } = await seedProductOrder({
      code: 'PED-202606-0303',
      status: 'CONFIRMED',
      quantity: 2,
      unitPriceUsd: 15,
      sizeStock: 0,
    })

    const cancel = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'CANCELLED' })
    cancel.assertStatus(200)

    await order.refresh()
    assert.equal(order.status, 'CANCELLED')

    await product.refresh()
    assert.equal(product.stockQuantity, '2.000')
    await size!.refresh()
    assert.equal(Number(size!.stockQuantity), 2)

    const reversal = await ProductInventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'REVERSAL_ADJUSTMENT')
      .firstOrFail()
    assert.equal(reversal.note, `Cancelación pedido ${order.code}`)
  })
})
