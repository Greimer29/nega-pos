import PaymentMethod from '#models/payment_method'
import AppSetting from '#models/app_setting'
import CatalogProduct from '#models/catalog_product'
import Currency from '#models/currency'
import Customer from '#models/customer'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Order from '#models/order'
import Sale from '#models/sale'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import { seedOpenSalesShift } from '#tests/helpers/seed_test_sale'

const TEST_EMAIL = 'test-ventas@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('sales_shifts').delete()
  await db.from('order_lines').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('purchase_items').delete()
  await db.from('catalog_products').delete()
  await db.from('order_materials').delete()
  await db.from('purchases').delete()
  await db.from('orders').delete()
  await db.from('machine_expenses').delete()
  await db.from('materials').delete()
  await db.from('machines').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('suppliers').delete()
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
      name: 'Admin Ventas',
      role: 'ADMIN',
      active: true,
    }
  )
}

async function seedCustomer() {
  return Customer.create({
    name: 'Cliente Ventas',
    type: 'CORPORATE',
    creditDays: 30,
    active: true,
  })
}

async function seedMaterial(overrides: Partial<Material> = {}) {
  return Material.create({
    code: 'MAT-001',
    name: 'Tela base',
    category: 'Uniforme',
    unit: 'ROL',
    minimumStock: '1',
    lastPurchasePriceUsd: '5.0000',
    salePriceUsd: '8.0000',
    active: true,
    ...overrides,
  })
}

test.group('Ventas API — catálogo y ventas', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await seedOpenSalesShift(Number(user.id))
  })

  test('PUT catalog product allows sale price below cost', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial()

    const createResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Uniforme escolar',
      category: 'Uniforme',
      sale_price_usd: 20,
    })

    createResponse.assertStatus(200)
    const productId = createResponse.body().data.catalog_product.id

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Fórmula uniforme',
    })

    formulaResponse.assertStatus(200)
    const formulaId = formulaResponse.body().data.formula.id

    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({
        items: [{ material_id: Number(material.id), quantity: 2 }],
      })

    await client.put(`/api/v1/catalog-products/${productId}`).loginAs(user).json({
      name: 'Uniforme escolar',
      category: 'Uniforme',
      sale_price_usd: 20,
      formula_id: formulaId,
    })

    const updateResponse = await client
      .put(`/api/v1/catalog-products/${productId}`)
      .loginAs(user)
      .json({
        name: 'Uniforme escolar',
        category: 'Uniforme',
        sale_price_usd: 5,
      })

    updateResponse.assertStatus(200)
    assert.equal(updateResponse.body().data.catalog_product.sale_price_usd, '5.0000')
  })

  test('PUT catalog product allows manual cost override', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const createResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Camisa básica',
      category: 'Camisa',
      sale_price_usd: 25,
      cost_usd: 10,
    })

    createResponse.assertStatus(200)
    assert.equal(createResponse.body().data.catalog_product.cost_usd, '10.0000')

    const productId = createResponse.body().data.catalog_product.id

    const updateResponse = await client
      .put(`/api/v1/catalog-products/${productId}`)
      .loginAs(user)
      .json({
        name: 'Camisa básica',
        category: 'Camisa',
        sale_price_usd: 25,
        cost_usd: 15,
      })

    updateResponse.assertStatus(200)
    assert.equal(updateResponse.body().data.catalog_product.cost_usd, '15.0000')

    const belowCostResponse = await client
      .put(`/api/v1/catalog-products/${productId}`)
      .loginAs(user)
      .json({
        name: 'Camisa básica',
        category: 'Camisa',
        cost_usd: 30,
      })

    belowCostResponse.assertStatus(200)
    assert.equal(belowCostResponse.body().data.catalog_product.cost_usd, '30.0000')
    assert.lengthOf(belowCostResponse.body().data.cost_warnings, 1)
  })

  test('POST catalog-products/apply-profit-margin updates sale price from cost', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const withCost = await CatalogProduct.create({
      name: 'Producto con costo',
      category: 'Camisa',
      salePriceUsd: '12.0000',
      costUsd: '10.0000',
      stockQuantity: '0',
      active: true,
    })

    const withoutCost = await CatalogProduct.create({
      name: 'Producto sin costo',
      category: 'Camisa',
      salePriceUsd: '5.0000',
      costUsd: '0.0000',
      stockQuantity: '0',
      active: true,
    })

    const response = await client
      .post('/api/v1/catalog-products/apply-profit-margin')
      .loginAs(user)
      .json({
        catalog_product_ids: [Number(withCost.id), Number(withoutCost.id)],
        profit_margin_percent: 60,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        updatedCount: 1,
        skipped: [{ name: 'Producto sin costo', reason: 'NO_COST_PRICE' }],
      },
    })

    await withCost.refresh()
    assert.equal(withCost.salePriceUsd, '16.0000')
    assert.equal(withCost.previousSalePriceUsd, '12.0000')
  })

  test('POST sale with catalog and material lines deducts stock', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-002' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '20',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto terminado',
      category: 'Uniforme',
      salePriceUsd: '15.0000',
      costUsd: '0.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Walk-in Test',
        payment_method_code: 'cash_usd',
        confirm: true,
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 2,
            unit_price_usd: 15,
          },
          {
            material_id: Number(material.id),
            quantity: 3,
            unit_price_usd: 8,
          },
        ],
      })

    response.assertStatus(200)
    assert.match(response.body().data.sale.code, /^\d{10}$/)
    assert.equal(response.body().data.sale.status, 'COMPLETED')

    await catalog.refresh()
    assert.equal(catalog.stockQuantity, '3.000')

    const stockResult = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(stockResult?.$extras.total), 17)

    const saleOut = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .where('type', 'SALE_OUT')
      .first()

    assert.exists(saleOut)
  })

  test('order lines and production expand catalog formulas', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const material = await seedMaterial({ code: 'MAT-003', lastPurchasePriceUsd: '4.0000' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '100',
    })

    const catalog = await CatalogProduct.create({
      name: 'Camisa corporativa',
      category: 'Camisa',
      salePriceUsd: '25.0000',
      costUsd: '8.0000',
      stockQuantity: '15.000',
      active: true,
    })

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Fórmula camisa',
    })

    formulaResponse.assertStatus(200)
    const formulaId = formulaResponse.body().data.formula.id

    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({
        items: [{ material_id: Number(material.id), quantity: 1.5 }],
      })

    await client.put(`/api/v1/catalog-products/${catalog.id}`).loginAs(user).json({
      name: 'Camisa corporativa',
      category: 'Camisa',
      sale_price_usd: 25,
      formula_id: formulaId,
      stock_quantity: 15,
    })

    const orderResponse = await client
      .post('/api/v1/orders')
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'Pedido catálogo',
        total_quantity: 10,
        order_date: '2026-06-01',
      })

    orderResponse.assertStatus(200)
    const orderId = orderResponse.body().data.order.id

    await client
      .post(`/api/v1/orders/${orderId}/lines`)
      .loginAs(user)
      .json({
        catalog_product_id: Number(catalog.id),
        quantity: 10,
      })

    const budgetResponse = await client.get(`/api/v1/orders/${orderId}/budget`).loginAs(user)
    budgetResponse.assertStatus(200)
    assert.equal(budgetResponse.body().data.budget.lines.length, 1)

    await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED' })

    const confirmCheck = await client.get(`/api/v1/orders/${orderId}`).loginAs(user)
    assert.equal(confirmCheck.body().data.order.status, 'CONFIRMED')

    const productionResponse = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    productionResponse.assertStatus(200)

    const stockAfterProduction = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(stockAfterProduction.body().data.material.stockActual, 85)

    const orderOut = await InventoryMovement.query()
      .where('orderId', orderId)
      .where('type', 'ORDER_OUT')
      .where('materialId', Number(material.id))
      .first()

    assert.exists(orderOut)
    assert.equal(Number(orderOut!.quantity), -15)
  })

  test('DELETE catalog blocked when product in active order', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()

    const catalog = await CatalogProduct.create({
      name: 'Pantalón',
      category: 'Pantalón',
      salePriceUsd: '30.0000',
      costUsd: '0.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const order = await Order.create({
      code: 'PED-202606-0001',
      customerId: Number(customer.id),
      modality: 'CORPORATE',
      description: 'Test',
      totalQuantity: 5,
      orderDate: DateTime.fromISO('2026-06-01'),
      status: 'DRAFT',
    })

    await client
      .post(`/api/v1/orders/${order.id}/lines`)
      .loginAs(user)
      .json({
        catalog_product_id: Number(catalog.id),
        quantity: 5,
      })

    const deleteResponse = await client
      .delete(`/api/v1/catalog-products/${catalog.id}`)
      .loginAs(user)

    deleteResponse.assertStatus(409)
    deleteResponse.assertBodyContains({
      error: { code: 'PRODUCTO_CATALOGO_EN_PEDIDOS_ACTIVOS' },
    })
  })

  test('GET catalog product with formula exposes stock derived from materials', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-FORM-STK' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '6',
    })

    const formula = await Formula.create({ name: 'Fórmula stock', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto fórmula stock',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client.get(`/api/v1/catalog-products/${catalog.id}`).loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.catalog_product.stock_quantity, '3.000')
    assert.equal(response.body().data.catalog_product.stock_source, 'formula')
  })

  test('PUT catalog product with formula syncs cost_usd from materials', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-FORM-COST', lastPurchasePriceUsd: '0.4000' })

    const formula = await Formula.create({ name: 'Fórmula costo', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })

    const createResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Producto con costo manual',
      category: 'Camisa',
      sale_price_usd: 12,
      cost_usd: 5,
    })

    createResponse.assertStatus(200)
    const productId = createResponse.body().data.catalog_product.id

    const updateResponse = await client
      .put(`/api/v1/catalog-products/${productId}`)
      .loginAs(user)
      .json({
        name: 'Producto con costo manual',
        category: 'Camisa',
        sale_price_usd: 12,
        formula_id: Number(formula.id),
      })

    updateResponse.assertStatus(200)
    assert.equal(updateResponse.body().data.catalog_product.cost_usd, '0.8000')

    const listResponse = await client.get('/api/v1/catalog-products').loginAs(user)

    listResponse.assertStatus(200)
    const listed = listResponse
      .body()
      .data.catalog_products.find((item: { id: number }) => item.id === productId)
    assert.equal(listed.cost_usd, '0.8000')
  })

  test('GET catalog products exposes formula cost without persisting on read', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-FORM-READ', lastPurchasePriceUsd: '0.5000' })

    const formula = await Formula.create({ name: 'Fórmula lectura', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '1.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto costo stale',
      category: 'Camisa',
      formulaId: Number(formula.id),
      salePriceUsd: '12.0000',
      costUsd: '0.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client.get('/api/v1/catalog-products').loginAs(user)

    response.assertStatus(200)
    const listed = response
      .body()
      .data.catalog_products.find((item: { id: number }) => item.id === Number(catalog.id))
    assert.equal(listed.cost_usd, '0.5000')

    await catalog.refresh()
    assert.equal(catalog.costUsd, '0.0000')
  })

  test('POST sale rejects catalog product without stock on confirm', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const catalog = await CatalogProduct.create({
      name: 'Sin stock manual',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente sin stock',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 10,
          },
        ],
      })

    response.assertStatus(409)
    response.assertBodyContains({
      error: { code: 'STOCK_INSUFICIENTE' },
    })
  })

  test('POST sale with formula product deducts materials not product stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-FORM-SALE' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '6',
    })

    const formula = await Formula.create({ name: 'Fórmula venta', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Venta con fórmula',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '20.0000',
      costUsd: '8.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente fórmula',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 2,
            unit_price_usd: 20,
          },
        ],
      })

    response.assertStatus(200)

    await catalog.refresh()
    assert.equal(catalog.stockQuantity, '0.000')

    const materialStock = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(materialStock?.$extras.total), 2)
  })

  test('POST sale with custom formula omits material from stock deduction', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const materialA = await seedMaterial({ code: 'MAT-CUSTOM-A', name: 'Material A' })
    const materialB = await seedMaterial({ code: 'MAT-CUSTOM-B', name: 'Material B' })

    for (const material of [materialA, materialB]) {
      await InventoryMovement.create({
        materialId: Number(material.id),
        type: 'PURCHASE_IN',
        quantity: '20',
      })
    }

    const formula = await Formula.create({ name: 'Fórmula custom omit', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(materialA.id),
      quantity: '1.000',
    })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(materialB.id),
      quantity: '1.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto receta custom',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '25.0000',
      costUsd: '10.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente receta custom',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 2,
            unit_price_usd: 25,
            formula_materials: [{ material_id: Number(materialA.id), quantity_per_unit: 1 }],
          },
        ],
      })

    response.assertStatus(200)

    const saleLine = response.body().data.sale.lines[0]
    assert.equal(Number(saleLine.unit_price_usd), 25)

    const stockA = await InventoryMovement.query()
      .where('materialId', Number(materialA.id))
      .sum('quantity as total')
      .first()
    const stockB = await InventoryMovement.query()
      .where('materialId', Number(materialB.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(stockA?.$extras.total), 18)
    assert.equal(Number(stockB?.$extras.total), 20)
  })

  test('POST sale with custom formula doubles material consumption', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-CUSTOM-DBL' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '20',
    })

    const formula = await Formula.create({ name: 'Fórmula custom double', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '1.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto doble material',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '18.0000',
      costUsd: '6.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente doble',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 2,
            unit_price_usd: 18,
            formula_materials: [{ material_id: Number(material.id), quantity_per_unit: 2 }],
          },
        ],
      })

    response.assertStatus(200)

    assert.equal(Number(response.body().data.sale.lines[0].unit_price_usd), 18)

    const materialStock = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(materialStock?.$extras.total), 16)
  })

  test('POST sale with custom formula can add material outside base formula', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const baseMaterial = await seedMaterial({ code: 'MAT-CUSTOM-BASE' })
    const extraMaterial = await seedMaterial({ code: 'MAT-CUSTOM-EXTRA' })

    for (const material of [baseMaterial, extraMaterial]) {
      await InventoryMovement.create({
        materialId: Number(material.id),
        type: 'PURCHASE_IN',
        quantity: '10',
      })
    }

    const formula = await Formula.create({ name: 'Fórmula base simple', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(baseMaterial.id),
      quantity: '1.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto material extra',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '30.0000',
      costUsd: '12.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente extra material',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 30,
            formula_materials: [
              { material_id: Number(baseMaterial.id), quantity_per_unit: 1 },
              { material_id: Number(extraMaterial.id), quantity_per_unit: 0.5 },
            ],
          },
        ],
      })

    response.assertStatus(200)

    const saleLine = response.body().data.sale.lines[0]
    assert.equal(Number(saleLine.unit_price_usd), 30)
    assert.equal(Number(response.body().data.sale.total_usd), 30)

    const baseStock = await InventoryMovement.query()
      .where('materialId', Number(baseMaterial.id))
      .sum('quantity as total')
      .first()
    const extraStock = await InventoryMovement.query()
      .where('materialId', Number(extraMaterial.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(baseStock?.$extras.total), 9)
    assert.equal(Number(extraStock?.$extras.total), 9.5)
  })

  test('POST sale keeps client unit price when custom formula adds material', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const baseMaterial = await seedMaterial({ code: 'MAT-PRICE-BASE' })
    const extraMaterial = await seedMaterial({ code: 'MAT-PRICE-EXTRA' })

    for (const material of [baseMaterial, extraMaterial]) {
      await InventoryMovement.create({
        materialId: Number(material.id),
        type: 'PURCHASE_IN',
        quantity: '10',
      })
    }

    const formula = await Formula.create({ name: 'Fórmula precio extra', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(baseMaterial.id),
      quantity: '1.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto precio extra',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '30.0000',
      costUsd: '12.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente precio recalculado',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 30,
            formula_materials: [
              { material_id: Number(baseMaterial.id), quantity_per_unit: 1 },
              { material_id: Number(extraMaterial.id), quantity_per_unit: 0.5 },
            ],
          },
        ],
      })

    response.assertStatus(200)
    assert.equal(Number(response.body().data.sale.lines[0].unit_price_usd), 30)
    assert.equal(Number(response.body().data.sale.total_usd), 30)
  })

  test('POST sale applies invoice discount without changing line prices', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const catalog = await CatalogProduct.create({
      name: 'Producto descuento factura',
      category: 'Uniforme',
      salePriceUsd: '40.0000',
      costUsd: '10.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente descuento factura',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        discount_usd: 10,
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 2,
            unit_price_usd: 40,
          },
        ],
      })

    response.assertStatus(200)
    assert.equal(Number(response.body().data.sale.lines[0].unit_price_usd), 40)
    assert.equal(Number(response.body().data.sale.discount_usd), 10)
    assert.equal(Number(response.body().data.sale.total_usd), 70)
  })

  test('draft sale persists and reloads custom formula materials', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-DRAFT-CUSTOM' })
    const formula = await Formula.create({ name: 'Fórmula borrador', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '1.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto borrador custom',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '14.0000',
      costUsd: '4.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Borrador custom',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 14,
            formula_materials: [{ material_id: Number(material.id), quantity_per_unit: 3 }],
          },
        ],
      })

    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id

    const detailResponse = await client.get(`/api/v1/sales/${saleId}`).loginAs(user)
    detailResponse.assertStatus(200)

    const line = detailResponse.body().data.sale.lines[0]
    assert.isTrue(line.has_custom_formula)
    assert.equal(Number(line.unit_price_usd), 14)
    assert.lengthOf(line.formula_materials, 1)
    assert.equal(line.formula_materials[0].material_id, Number(material.id))
    assert.equal(line.formula_materials[0].quantity_per_unit, '3.000')
    assert.equal(line.effective_formula_materials[0].quantity_per_unit, '3.000')
  })

  test('draft sale persists and reloads kitchen_note', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const catalog = await CatalogProduct.create({
      name: 'Combo de perros',
      category: 'Comidas',
      salePriceUsd: '8.0000',
      costUsd: '3.0000',
      stockQuantity: '20.000',
      active: true,
    })

    const note =
      '1 sin cebolla, sin mayonesa, sin zanahoria\n2 sin mostaza\n1 sin cebolla'

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Comanda notes',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 3,
            unit_price_usd: 8,
            kitchen_note: note,
          },
        ],
      })

    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id as number
    assert.equal(createResponse.body().data.sale.lines[0].kitchen_note, note)

    const getResponse = await client.get(`/api/v1/sales/${saleId}`).loginAs(user)
    getResponse.assertStatus(200)
    assert.equal(getResponse.body().data.sale.lines[0].kitchen_note, note)
  })

  test('POST sale return with custom formula reverts effective material consumption', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'MAT-RETURN-CUSTOM' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '10',
    })

    const formula = await Formula.create({ name: 'Fórmula devolución', active: true })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '1.000',
    })

    const catalog = await CatalogProduct.create({
      name: 'Producto devolución custom',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '16.0000',
      costUsd: '5.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const saleResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Cliente devolución',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 2,
            unit_price_usd: 16,
            formula_materials: [{ material_id: Number(material.id), quantity_per_unit: 2 }],
          },
        ],
      })

    saleResponse.assertStatus(200)
    const saleId = saleResponse.body().data.sale.id
    const lineId = saleResponse.body().data.sale.lines[0].id

    const returnResponse = await client
      .post(`/api/v1/sales/${saleId}/return`)
      .loginAs(user)
      .json({ lines: [{ line_id: lineId, quantity: 1 }] })

    returnResponse.assertStatus(200)

    const materialStock = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .sum('quantity as total')
      .first()

    assert.equal(Number(materialStock?.$extras.total), 8)
  })

  test('POST catalog product adjustment blocked when product has formula', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const formula = await Formula.create({ name: 'Fórmula bloqueo', active: true })

    const catalog = await CatalogProduct.create({
      name: 'Producto bloqueado',
      category: 'Uniforme',
      formulaId: Number(formula.id),
      salePriceUsd: '15.0000',
      costUsd: '5.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const response = await client
      .post(`/api/v1/catalog-products/${catalog.id}/adjustment`)
      .loginAs(user)
      .json({ mode: 'CARGO', quantity: 5 })

    response.assertStatus(409)
    response.assertBodyContains({
      error: { code: 'PRODUCTO_CON_FORMULA_SIN_STOCK_MANUAL' },
    })
  })

  test('GET catalog product image requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/catalog-products/1/image')
    response.assertStatus(401)
  })

  test('GET catalog product image clears stale image_path when file is missing', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const catalog = await CatalogProduct.create({
      name: 'Producto imagen huérfana',
      category: 'Uniforme',
      salePriceUsd: '12.0000',
      costUsd: '1.0000',
      stockQuantity: '10.000',
      active: true,
      imagePath: 'catalog-products/999999/missing.webp',
    })

    const imageResponse = await client
      .get(`/api/v1/catalog-products/${catalog.id}/image`)
      .loginAs(user)

    imageResponse.assertStatus(404)
    imageResponse.assertBodyContains({
      error: { code: 'IMAGE_NOT_AVAILABLE' },
    })

    await catalog.refresh()
    assert.isNull(catalog.imagePath)

    const detailResponse = await client.get(`/api/v1/catalog-products/${catalog.id}`).loginAs(user)

    detailResponse.assertStatus(200)
    assert.isNull(detailResponse.body().data.catalog_product.image_path)
  })

  test('GET /api/v1/sales/next-code returns 10-digit preview without incrementing', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const first = await client.get('/api/v1/sales/next-code').loginAs(user)
    first.assertStatus(200)
    assert.match(first.body().data.next_code, /^\d{10}$/)

    const second = await client.get('/api/v1/sales/next-code').loginAs(user)
    second.assertStatus(200)
    assert.equal(second.body().data.next_code, first.body().data.next_code)
  })

  test('POST sale draft then confirm assigns sequential invoice codes', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const catalog = await CatalogProduct.create({
      name: 'Producto borrador',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '4.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const draftResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Borrador',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 10,
          },
        ],
      })

    draftResponse.assertStatus(200)
    assert.equal(draftResponse.body().data.sale.status, 'DRAFT')
    assert.isNull(draftResponse.body().data.sale.code)

    const confirmResponse = await client
      .post(`/api/v1/sales/${draftResponse.body().data.sale.id}/confirm`)
      .loginAs(user)
      .json({ payment_method_code: 'cash_usd' })

    confirmResponse.assertStatus(200)
    assert.match(confirmResponse.body().data.sale.code, /^0000000001$/)
    assert.equal(confirmResponse.body().data.sale.sold_by.id, Number(user.id))
    assert.equal(confirmResponse.body().data.sale.sold_by.name, user.name)

    const secondDraft = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Directa',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 10,
          },
        ],
      })

    secondDraft.assertStatus(200)
    assert.match(secondDraft.body().data.sale.code, /^0000000002$/)
  })

  test('GET sale detail includes catalog product category on lines', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const catalog = await CatalogProduct.create({
      name: 'Producto categorizado',
      category: 'Uniforme',
      salePriceUsd: '12.0000',
      costUsd: '4.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Categoría',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 12,
          },
        ],
      })

    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id

    const detailResponse = await client.get(`/api/v1/sales/${saleId}`).loginAs(user)
    detailResponse.assertStatus(200)

    const line = detailResponse.body().data.sale.lines[0]
    assert.equal(line.catalog_product.category, 'Uniforme')
  })

  test('POST sale ORDER mode keeps PENDING status and allows transitions', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const catalog = await CatalogProduct.create({
      name: 'Producto pedido',
      category: 'Uniforme',
      salePriceUsd: '15.0000',
      costUsd: '5.0000',
      stockQuantity: '3.000',
      active: true,
    })

    const createResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Pedido',
        payment_method_code: 'cash_usd',
        billing_mode: 'ORDER',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 15,
          },
        ],
      })

    createResponse.assertStatus(200)
    const saleId = createResponse.body().data.sale.id
    assert.equal(createResponse.body().data.sale.billing_mode, 'ORDER')
    assert.equal(createResponse.body().data.sale.order_status, 'PENDING')

    await catalog.refresh()
    assert.equal(catalog.stockQuantity, '2.000')

    const toProcess = await client
      .post(`/api/v1/sales/${saleId}/transition`)
      .loginAs(user)
      .json({ order_status: 'IN_PROCESS' })

    toProcess.assertStatus(200)
    assert.equal(toProcess.body().data.sale.order_status, 'IN_PROCESS')

    const toDelivered = await client
      .post(`/api/v1/sales/${saleId}/transition`)
      .loginAs(user)
      .json({ order_status: 'DELIVERED' })

    toDelivered.assertStatus(200)
    assert.equal(toDelivered.body().data.sale.order_status, 'DELIVERED')

    await catalog.refresh()
    assert.equal(catalog.stockQuantity, '2.000')
  })

  test('POST sale CREDIT leaves balance_usd pending', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await seedCustomer()
    const catalog = await CatalogProduct.create({
      name: 'Producto crédito',
      category: 'Uniforme',
      salePriceUsd: '50.0000',
      costUsd: '20.0000',
      stockQuantity: '2.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        customer_id: Number(customer.id),
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CREDIT',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 50,
          },
        ],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.payment_type, 'CREDIT')
    assert.equal(response.body().data.sale.balance_usd, '50.0000')
    assert.equal(response.body().data.sale.amount_paid_usd, '0.0000')
  })

  test('POST /sales/:id/confirm rejects cash sale without payment method', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const catalog = await CatalogProduct.create({
      name: 'Producto sin método',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const draftResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Sin método',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 10,
          },
        ],
      })

    draftResponse.assertStatus(200)

    const confirmResponse = await client
      .post(`/api/v1/sales/${draftResponse.body().data.sale.id}/confirm`)
      .loginAs(user)
      .json({})

    confirmResponse.assertStatus(422)
    confirmResponse.assertBodyContains({
      error: { code: 'METODO_PAGO_REQUERIDO' },
    })
  })

  test('POST /sales/:id/confirm snapshots rate for non-USD payment method', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await PaymentMethod.query().where('code', 'cash_bs').update({ isActive: true })
    await db.from('currencies').where('code', 'VES').update({ rate_per_usd: '40.0000' })

    const catalog = await CatalogProduct.create({
      name: 'Producto Bs',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const draftResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente Bs',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 10,
          },
        ],
      })

    draftResponse.assertStatus(200)

    const confirmResponse = await client
      .post(`/api/v1/sales/${draftResponse.body().data.sale.id}/confirm`)
      .loginAs(user)
      .json({ payment_method_code: 'cash_bs' })

    confirmResponse.assertStatus(200)
    assert.equal(confirmResponse.body().data.sale.payment_method_code, 'cash_bs')
    assert.equal(confirmResponse.body().data.sale.usd_rate, '40.0000')
    assert.equal(confirmResponse.body().data.sale.total_bs, '400.00')
    assert.equal(confirmResponse.body().data.sale.payment_method.name, 'Efectivo Bs')
  })

  test('POST /sales/:id/confirm allows currency_code and usd_rate override without changing catalog', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await PaymentMethod.query().where('code', 'cash_bs').update({ isActive: true })
    await db.from('currencies').where('code', 'VES').update({ rate_per_usd: '40.0000' })

    const catalog = await CatalogProduct.create({
      name: 'Producto override tasa',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const draftResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente override',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 10,
          },
        ],
      })

    draftResponse.assertStatus(200)

    const confirmResponse = await client
      .post(`/api/v1/sales/${draftResponse.body().data.sale.id}/confirm`)
      .loginAs(user)
      .json({
        payment_method_code: 'cash_bs',
        currency_code: 'VES',
        usd_rate: 50,
      })

    confirmResponse.assertStatus(200)
    assert.equal(confirmResponse.body().data.sale.payment_method_code, 'cash_bs')
    assert.equal(confirmResponse.body().data.sale.usd_rate, '50.0000')
    assert.equal(confirmResponse.body().data.sale.total_bs, '500.00')

    const ves = await Currency.findByOrFail('code', 'VES')
    assert.equal(ves.ratePerUsd, '40.0000')
  })

  test('POST /sales/:id/confirm snapshots XAU total when paying in base', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Currency.updateOrCreate(
      { code: 'XAU' },
      { name: 'Oro', ratePerUsd: '1.0000', isActive: true }
    )
    await PaymentMethod.updateOrCreate(
      { code: 'gold_xau' },
      {
        name: 'Oro XAU',
        currencyCode: 'XAU',
        isActive: true,
        sortOrder: 99,
      }
    )

    const catalog = await CatalogProduct.create({
      name: 'Producto oro',
      category: 'Uniforme',
      salePriceUsd: '0.5000',
      costUsd: '0.2000',
      stockQuantity: '5.000',
      active: true,
    })

    const draftResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente oro',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 0.5,
          },
        ],
      })

    draftResponse.assertStatus(200)

    const confirmResponse = await client
      .post(`/api/v1/sales/${draftResponse.body().data.sale.id}/confirm`)
      .loginAs(user)
      .json({ payment_method_code: 'gold_xau' })

    confirmResponse.assertStatus(200)
    assert.equal(confirmResponse.body().data.sale.payment_method_code, 'gold_xau')
    assert.equal(confirmResponse.body().data.sale.usd_rate, '1.0000')
    assert.equal(confirmResponse.body().data.sale.total_bs, '0.5000')
  })

  test('POST /sales/:id/confirm converts base XAU to USD with rate 100', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await db.from('currencies').where('code', 'USD').update({ rate_per_usd: '100.0000' })
    await PaymentMethod.query().where('code', 'cash_usd').update({ isActive: true })

    const catalog = await CatalogProduct.create({
      name: 'Producto base',
      category: 'Uniforme',
      salePriceUsd: '1.0000',
      costUsd: '0.4000',
      stockQuantity: '5.000',
      active: true,
    })

    const draftResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente USD',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [
          {
            catalog_product_id: Number(catalog.id),
            quantity: 1,
            unit_price_usd: 1,
          },
        ],
      })

    draftResponse.assertStatus(200)

    const confirmResponse = await client
      .post(`/api/v1/sales/${draftResponse.body().data.sale.id}/confirm`)
      .loginAs(user)
      .json({ payment_method_code: 'cash_usd' })

    confirmResponse.assertStatus(200)
    assert.equal(confirmResponse.body().data.sale.payment_method_code, 'cash_usd')
    assert.equal(confirmResponse.body().data.sale.usd_rate, '100.0000')
    assert.equal(confirmResponse.body().data.sale.total_bs, '100.00')
  })

  test('GET /sales with invalid id returns 422 without SQL error', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    for (const invalidId of ['NaN', 'abc', '0']) {
      const response = await client.get(`/api/v1/sales/${invalidId}`).loginAs(user)
      response.assertStatus(422)
      assert.equal(response.body().error.code, 'INVALID_ID')
      assert.notInclude(JSON.stringify(response.body()), 'select')
    }
  })

  test('POST /sales/:id/confirm with invalid id returns 422', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/sales/NaN/confirm').loginAs(user).json({})
    response.assertStatus(422)
    assert.equal(response.body().error.code, 'INVALID_ID')
  })

  test('GET /sales filters by date_from and date_to', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const catalog = await CatalogProduct.create({
      name: 'Producto filtro fecha',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '5.000',
      active: true,
    })

    const first = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Venta enero',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [{ catalog_product_id: Number(catalog.id), quantity: 1, unit_price_usd: 10 }],
      })

    first.assertStatus(200)
    const firstId = first.body().data.sale.id

    const second = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        confirm: true,
        guest_name: 'Venta febrero',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [{ catalog_product_id: Number(catalog.id), quantity: 1, unit_price_usd: 10 }],
      })

    second.assertStatus(200)
    const secondId = second.body().data.sale.id

    await Sale.query().where('id', firstId).update({ soldAt: DateTime.fromISO('2026-01-15T10:00:00') })
    await Sale.query()
      .where('id', secondId)
      .update({ soldAt: DateTime.fromISO('2026-02-10T10:00:00') })

    const januaryOnly = await client
      .get('/api/v1/sales')
      .loginAs(user)
      .qs({ date_from: '2026-01-01', date_to: '2026-01-31', exclude_status: 'DRAFT' })

    januaryOnly.assertStatus(200)
    const januaryIds = januaryOnly.body().data.sales.map((sale: { id: number }) => sale.id)
    assert.include(januaryIds, firstId)
    assert.notInclude(januaryIds, secondId)

    const februaryOnly = await client
      .get('/api/v1/sales')
      .loginAs(user)
      .qs({ date_from: '2026-02-01', date_to: '2026-02-28', exclude_status: 'DRAFT' })

    februaryOnly.assertStatus(200)
    const februaryIds = februaryOnly.body().data.sales.map((sale: { id: number }) => sale.id)
    assert.include(februaryIds, secondId)
    assert.notInclude(februaryIds, firstId)
  })
})
