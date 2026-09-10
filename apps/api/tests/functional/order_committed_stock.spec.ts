import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-committed-stock@negapos.local'
const TEST_PASSWORD = 'password123'

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
  await db.from('materials').delete()
  await db.from('customers').delete()
  await db.from('sales_shifts').delete()
  await db.from('users').delete()
}

test.group('Material availability with committed stock', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await User.updateOrCreate(
      { email: TEST_EMAIL },
      { password: TEST_PASSWORD, name: 'Admin', role: 'ADMIN', active: true }
    )
  })

  test('GET material-availability subtracts other pending orders', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente stock',
      type: 'CORPORATE',
      active: true,
    })
    const material = await Material.create({
      code: 'TEL-COM',
      name: 'Tela comprometida',
      category: 'Uniforme',
      unit: 'ROL',
      minimumStock: '1',
      active: true,
    })
    const formula = await Formula.create({ name: 'Fórmula com', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '10.000',
    })
    const product = await CatalogProduct.create({
      name: 'Producto com',
      category: 'UNIFORM',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '0.000',
      active: true,
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '100',
    })

    const pendingOrder = await Order.create({
      code: 'PED-202606-0200',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Pedido pendiente',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'CONFIRMED',
    })
    await OrderLine.create({
      orderId: Number(pendingOrder.id),
      catalogProductId: Number(product.id),
      quantity: '6.000',
      unitPriceUsd: '20.0000',
      subtotalUsd: '120.0000',
    })

    const newOrder = await Order.create({
      code: 'PED-202606-0201',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Nueva venta',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-06-02'),
      status: 'DRAFT',
    })
    await OrderLine.create({
      orderId: Number(newOrder.id),
      catalogProductId: Number(product.id),
      quantity: '5.000',
      unitPriceUsd: '20.0000',
      subtotalUsd: '100.0000',
    })

    const response = await client
      .get(`/api/v1/orders/${newOrder.id}/material-availability`)
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        sufficient: false,
        has_recipe: true,
      },
    })

    assert.lengthOf(response.body().data.missing, 1)
    assert.equal(response.body().data.missing[0].stock_actual, 40)
    assert.equal(response.body().data.missing[0].consumo_proyectado, 50)
  })
})
