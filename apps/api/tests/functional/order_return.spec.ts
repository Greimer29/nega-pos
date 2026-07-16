import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import ProductInventoryMovement from '#models/product_inventory_movement'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-order-return@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('order_lines').delete()
  await db.from('order_materials').delete()
  await db.from('orders').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('catalog_products').delete()
  await db.from('materials').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('users').delete()
}

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
    await resetDatabase()
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
})
