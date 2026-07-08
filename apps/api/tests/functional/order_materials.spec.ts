import Customer from '#models/customer'
import Material from '#models/material'
import Order from '#models/order'
import OrderMaterial from '#models/order_material'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

async function resetDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('order_lines').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('catalog_products').delete()
  await db.from('purchase_items').delete()
  await db.from('purchases').delete()
  await db.from('order_materials').delete()
  await db.from('orders').delete()
  await db.from('machine_expenses').delete()
  await db.from('materials').delete()
  await db.from('machines').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('suppliers').delete()
  await db.from('users').delete()
}

async function seedOrder() {
  const customer = await Customer.create({
    name: 'Customer Receta',
    type: 'CORPORATE',
    active: true,
  })

  return Order.create({
    code: 'PED-202605-0001',
    customerId: Number(customer.id),
    modality: 'CORPORATE',
    description: 'Camisetas',
    totalQuantity: 100,
    orderDate: DateTime.fromISO('2026-05-01'),
    status: 'DRAFT',
  })
}

async function seedMaterial() {
  return Material.create({
    code: 'TEL-001',
    name: 'Jersey',
    category: 'FABRIC',
    unit: 'ROL',
    minimumStock: '5',
    active: true,
  })
}

test.group('OrderMaterial model', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
  })

  test('creates order material with order and material relations', async ({ assert }) => {
    const order = await seedOrder()
    const material = await seedMaterial()

    const orderMaterial = await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '2.500',
      notes: 'Tela principal',
    })

    await orderMaterial.load('order')
    await orderMaterial.load('material')

    assert.equal(orderMaterial.orderId, order.id)
    assert.equal(orderMaterial.materialId, material.id)
    assert.equal(orderMaterial.quantityPerGarment, '2.500')
    assert.equal(orderMaterial.order.code, 'PED-202605-0001')
    assert.equal(orderMaterial.material.code, 'TEL-001')
  })

  test('order hasMany orderMaterials', async ({ assert }) => {
    const order = await seedOrder()
    const materialA = await seedMaterial()
    const materialB = await Material.create({
      code: 'HIL-001',
      name: 'Hilo poliéster',
      category: 'THREAD',
      unit: 'UND',
      minimumStock: '2',
      active: true,
    })

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(materialA.id),
      quantityPerGarment: '2.000',
    })
    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(materialB.id),
      quantityPerGarment: '0.150',
    })

    await order.load('orderMaterials')

    assert.lengthOf(order.orderMaterials, 2)
  })

  test('rejects duplicate material on same order', async ({ assert }) => {
    const order = await seedOrder()
    const material = await seedMaterial()

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '1.000',
    })

    await assert.rejects(
      () =>
        OrderMaterial.create({
          orderId: Number(order.id),
          materialId: Number(material.id),
          quantityPerGarment: '3.000',
        }),
      /duplicate|unique|Duplicate entry/i
    )
  })

  test('cascades delete when order is removed', async ({ assert }) => {
    const order = await seedOrder()
    const material = await seedMaterial()

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '1.500',
    })

    await order.delete()

    const remaining = await OrderMaterial.query().where('orderId', Number(order.id))
    assert.lengthOf(remaining, 0)
  })
})
