import Customer from '#models/customer'
import Material from '#models/material'
import InventoryMovement from '#models/inventory_movement'
import Order from '#models/order'
import OrderMaterial from '#models/order_material'
import OrderLine from '#models/order_line'
import CatalogProduct from '#models/catalog_product'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import User from '#models/user'
import { NOTA_FORZADO_SIN_STOCK, RECETA_VACIA_WARNING } from '#services/order_stock'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-order-receta@negapos.local'
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
  await db.from('machine_expenses').delete()
  await db.from('materials').delete()
  await db.from('machines').delete()
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
      name: 'Admin Test',
      role: 'ADMIN',
      active: true,
    }
  )
}

async function seedCustomer() {
  return Customer.create({
    name: 'Customer Receta',
    type: 'CORPORATE',
    active: true,
  })
}

async function seedMaterial(overrides: Partial<Material> = {}) {
  return Material.create({
    code: 'TEL-REC',
    name: 'Tela receta',
    category: 'FABRIC',
    unit: 'ROL',
    minimumStock: '1',
    active: true,
    ...overrides,
  })
}

async function seedOrderConfirmado(customer: Customer, totalQuantity = 100) {
  return Order.create({
    code: 'PED-202605-0200',
    customerId: customer.id,
    modality: 'CORPORATE',
    description: 'Camisetas receta',
    totalQuantity,
    orderDate: DateTime.fromISO('2026-05-01'),
    status: 'CONFIRMED',
  })
}

test.group('Order receta y stock API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('POST /api/v1/orders/:id/materials adds recipe item in DRAFT', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial()
    const order = await Order.create({
      code: 'PED-202605-0201',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Polos',
      totalQuantity: 50,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/materials`)
      .loginAs(user)
      .json({
        material_id: Number(material.id),
        quantity_per_garment: 2.5,
        notes: 'Tela principal',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        orderMaterial: {
          materialId: Number(material.id),
          quantityPerGarment: '2.500',
          consumoProyectado: '125.000',
          notes: 'Tela principal',
        },
      },
    })
  })

  test('GET /api/v1/orders/:id includes recipe materials', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial()
    const order = await Order.create({
      code: 'PED-202605-0202',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Polos',
      totalQuantity: 40,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '1.500',
    })

    const response = await client.get(`/api/v1/orders/${order.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        order: {
          materials: [
            {
              quantityPerGarment: '1.500',
              consumoProyectado: '60.000',
            },
          ],
        },
      },
    })
  })

  test('POST materials rejects duplicate material in recipe', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial()
    const order = await Order.create({
      code: 'PED-202605-0203',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Polos',
      totalQuantity: 10,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '1.000',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/materials`)
      .loginAs(user)
      .json({
        material_id: Number(material.id),
        quantity_per_garment: 2,
      })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'MATERIAL_DUPLICADO_EN_RECETA',
      },
    })
  })

  test('DRAFT to CONFIRMED does not deduct stock', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'STK-CNF' })
    const order = await Order.create({
      code: 'PED-202605-0210',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Camisetas receta',
      totalQuantity: 50,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '200',
    })

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '2.000',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED' })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        order: {
          status: 'CONFIRMED',
        },
      },
    })

    const salidas = await InventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')

    assert.lengthOf(salidas, 0)
  })

  test('CONFIRMED to IN_PRODUCTION with enough stock creates ORDER_OUT', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'STK-OK' })
    const order = await seedOrderConfirmado(customer, 100)

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '300',
    })

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '2.000',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        order: {
          status: 'IN_PRODUCTION',
        },
      },
    })

    const movimientos = await InventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')

    assert.lengthOf(movimientos, 1)
    assert.equal(movimientos[0].quantity, '-200.000')
    assert.isNull(movimientos[0].note)
  })

  test('CONFIRMED to IN_PRODUCTION without stock returns 409', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'STK-NO' })
    const order = await seedOrderConfirmado(customer, 100)

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '50',
    })

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '2.000',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    response.assertStatus(409)
    response.assertBodyContains({
      error: {
        code: 'STOCK_INSUFICIENTE',
        details: [
          {
            material_id: Number(material.id),
            name: 'Tela receta',
            stock_actual: 50,
            consumo_proyectado: 200,
            faltante: 150,
          },
        ],
      },
    })

    const salidas = await InventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')

    assert.lengthOf(salidas, 0)
  })

  test('CONFIRMED to IN_PRODUCTION with force creates movement with forced note', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'STK-FZ' })
    const order = await seedOrderConfirmado(customer, 10)

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '5.000',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION', force: true })

    response.assertStatus(200)

    const movimiento = await InventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')
      .firstOrFail()

    assert.equal(movimiento.quantity, '-50.000')
    assert.equal(movimiento.note, NOTA_FORZADO_SIN_STOCK)
  })

  test('CONFIRMED to IN_PRODUCTION with empty recipe returns RECETA_VACIA warning', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const order = await seedOrderConfirmado(customer)

    const response = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        order: {
          status: 'IN_PRODUCTION',
          warnings: [RECETA_VACIA_WARNING],
        },
      },
    })

    const movimientos = await InventoryMovement.query().where('orderId', Number(order.id))
    assert.lengthOf(movimientos, 0)
  })

  test('IN_PRODUCTION to CANCELLED reverts stock with REVERSAL_ADJUSTMENT', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'STK-RV' })
    const order = await seedOrderConfirmado(customer, 20)

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '100',
    })

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '3.000',
    })

    await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    const cancelar = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'CANCELLED' })

    cancelar.assertStatus(200)
    cancelar.assertBodyContains({
      data: {
        order: {
          status: 'CANCELLED',
        },
      },
    })

    const reversiones = await InventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'REVERSAL_ADJUSTMENT')

    assert.lengthOf(reversiones, 1)
    assert.equal(reversiones[0].quantity, '60.000')

    const stockResult = await db
      .from('inventory_movements')
      .where('material_id', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(stockResult?.total), 100)
  })

  test('CONFIRMED to IN_PRODUCTION does not double-count legacy recipe with formula lines', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'DEDUP-1' })
    const formula = await Formula.create({ name: 'Formula dedupe', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })
    const product = await CatalogProduct.create({
      name: 'Producto dedupe',
      category: 'UNIFORM',
      formulaId: Number(formula.id),
      salePriceUsd: '15.0000',
      costUsd: '6.0000',
      stockQuantity: '0.000',
      active: true,
    })
    const order = await Order.create({
      code: 'PED-202605-0298',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Pedido mixto legacy + formula',
      totalQuantity: 10,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'CONFIRMED',
    })
    await OrderLine.create({
      orderId: Number(order.id),
      catalogProductId: Number(product.id),
      quantity: '10.000',
      unitPriceUsd: '15.0000',
      subtotalUsd: '150.0000',
    })
    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '3.000',
    })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '100',
    })

    const response = await client
      .post(`/api/v1/orders/${order.id}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    response.assertStatus(200)

    const salidas = await InventoryMovement.query()
      .where('orderId', Number(order.id))
      .where('type', 'ORDER_OUT')

    assert.lengthOf(salidas, 1)
    assert.equal(salidas[0].quantity, '-20.000')
  })

  test('GET /api/v1/orders/:id/material-availability reports missing stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'CHK-1' })
    const order = await Order.create({
      code: 'PED-202605-0299',
      customerId: customer.id,
      modality: 'CORPORATE',
      description: 'Pedido sin stock',
      totalQuantity: 10,
      orderDate: DateTime.fromISO('2026-05-01'),
      status: 'DRAFT',
    })

    await OrderMaterial.create({
      orderId: Number(order.id),
      materialId: Number(material.id),
      quantityPerGarment: '5.000',
    })

    const response = await client
      .get(`/api/v1/orders/${order.id}/material-availability`)
      .loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        sufficient: false,
        has_recipe: true,
      },
    })

    assert.lengthOf(response.body().data.missing, 1)
    assert.equal(response.body().data.missing[0].material_id, Number(material.id))
    assert.equal(response.body().data.missing[0].faltante, 50)
  })
})
