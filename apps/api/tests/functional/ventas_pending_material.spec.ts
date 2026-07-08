import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Order from '#models/order'
import OrderLine from '#models/order_line'
import OrderMaterial from '#models/order_material'
import Purchase from '#models/purchase'
import PurchaseItem from '#models/purchase_item'
import Supplier from '#models/supplier'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-ventas-pending@negapos.local'
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
  await db.from('counters').delete()
  await db.from('suppliers').delete()
  await db.from('users').delete()
}

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Ventas Pending',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Ventas — material pendiente y compra', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('confirm purchase moves pending DRAFT order to IN_PRODUCTION when stock is enough', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente venta pendiente',
      type: 'CORPORATE',
      active: true,
    })
    const supplier = await Supplier.create({
      name: 'Proveedor venta',
      rif: 'J999999999',
      active: true,
    })
    const material = await Material.create({
      code: 'TEL-PEND',
      name: 'Tela pendiente',
      category: 'FABRIC',
      unit: 'ROL',
      minimumStock: '1',
      lastPurchasePriceUsd: '2.0000',
      active: true,
    })
    const formula = await Formula.create({
      name: 'Formula venta',
      active: true,
    })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '5.000',
    })
    const product = await CatalogProduct.create({
      name: 'Conjunto venta',
      category: 'UNIFORM',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '0.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202605-0300',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta pendiente material',
      totalQuantity: 2,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '2.000',
      unitPriceUsd: '20.0000',
      subtotalUsd: '40.0000',
    })
    const purchase = await Purchase.create({
      supplierId: Number(supplier.id),
      date: DateTime.fromISO('2026-05-20'),
      invoiceNumber: 'F-PEND-1',
      status: 'DRAFT',
      totalBs: '0.00',
    })
    await PurchaseItem.create({
      purchaseId: Number(purchase.id),
      materialId: Number(material.id),
      quantity: '10.000',
      unitPriceUsd: '2.0000',
      unitPriceBs: '100.00',
      subtotalUsd: '20.0000',
      subtotalBs: '1000.00',
    })

    const confirmResponse = await client
      .post(`/api/v1/purchases/${purchase.id}/confirm`)
      .loginAs(user)
      .json({})

    confirmResponse.assertStatus(200)
    confirmResponse.assertBodyContains({
      data: {
        fulfilled_orders: [{ id: Number(order.id), code: order.code }],
      },
    })

    await order.refresh()
    assert.equal(order.status, 'IN_PRODUCTION')

    const salidas = await InventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')

    assert.lengthOf(salidas, 1)
    assert.equal(salidas[0].quantity, '-10.000')
  })

  test('confirm purchase auto-produces DRAFT credit order with credit balances', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente crédito pendiente',
      type: 'CORPORATE',
      creditDays: 30,
      active: true,
    })
    const supplier = await Supplier.create({
      name: 'Proveedor crédito venta',
      rif: 'J777777777',
      active: true,
    })
    const material = await Material.create({
      code: 'TEL-CRED',
      name: 'Tela crédito',
      category: 'FABRIC',
      unit: 'ROL',
      minimumStock: '1',
      lastPurchasePriceUsd: '2.0000',
      active: true,
    })
    const formula = await Formula.create({
      name: 'Formula crédito',
      active: true,
    })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '5.000',
    })
    const product = await CatalogProduct.create({
      name: 'Conjunto crédito',
      category: 'UNIFORM',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '0.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202605-0302',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta crédito pendiente material',
      totalQuantity: 2,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
      paymentType: 'CREDIT',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '2.000',
      unitPriceUsd: '20.0000',
      subtotalUsd: '40.0000',
    })
    const purchase = await Purchase.create({
      supplierId: Number(supplier.id),
      date: DateTime.fromISO('2026-05-20'),
      invoiceNumber: 'F-CRED-1',
      status: 'DRAFT',
      totalBs: '0.00',
    })
    await PurchaseItem.create({
      purchaseId: Number(purchase.id),
      materialId: Number(material.id),
      quantity: '10.000',
      unitPriceUsd: '2.0000',
      unitPriceBs: '100.00',
      subtotalUsd: '20.0000',
      subtotalBs: '1000.00',
    })

    const confirmResponse = await client
      .post(`/api/v1/purchases/${purchase.id}/confirm`)
      .loginAs(user)
      .json({})

    confirmResponse.assertStatus(200)
    confirmResponse.assertBodyContains({
      data: {
        fulfilled_orders: [{ id: Number(order.id), code: order.code }],
      },
    })

    await order.refresh()
    assert.equal(order.status, 'IN_PRODUCTION')
    assert.equal(order.paymentType, 'CREDIT')
    assert.equal(order.balanceUsd, '40.0000')
    assert.equal(order.amountPaidUsd, '0.0000')
    assert.isNotNull(order.creditDueDate)
  })

  test('confirm purchase does not auto-produce DRAFT order when manual product stock is insufficient', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente stock producto',
      type: 'CORPORATE',
      active: true,
    })
    const supplier = await Supplier.create({
      name: 'Proveedor stock producto',
      rif: 'J888888888',
      active: true,
    })
    const material = await Material.create({
      code: 'TEL-STK-PROD',
      name: 'Tela stock producto',
      category: 'FABRIC',
      unit: 'ROL',
      minimumStock: '1',
      lastPurchasePriceUsd: '2.0000',
      active: true,
    })
    const product = await CatalogProduct.create({
      name: 'Producto manual bajo stock',
      category: 'UNIFORM',
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '2.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202605-0301',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Venta sin stock de producto',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '5.000',
      unitPriceUsd: '20.0000',
      subtotalUsd: '100.0000',
    })
    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '1.000',
    })
    const purchase = await Purchase.create({
      supplierId: Number(supplier.id),
      date: DateTime.fromISO('2026-05-20'),
      invoiceNumber: 'F-STK-PROD',
      status: 'DRAFT',
      totalBs: '0.00',
    })
    await PurchaseItem.create({
      purchaseId: Number(purchase.id),
      materialId: Number(material.id),
      quantity: '20.000',
      unitPriceUsd: '2.0000',
      unitPriceBs: '100.00',
      subtotalUsd: '40.0000',
      subtotalBs: '2000.00',
    })

    const confirmResponse = await client
      .post(`/api/v1/purchases/${purchase.id}/confirm`)
      .loginAs(user)
      .json({})

    confirmResponse.assertStatus(200)
    assert.deepEqual(confirmResponse.body().data.fulfilled_orders, [])

    await order.refresh()
    assert.equal(order.status, 'DRAFT')
  })
})
