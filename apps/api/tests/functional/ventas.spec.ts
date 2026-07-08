import PaymentMethod from '#models/payment_method'
import CatalogProduct from '#models/catalog_product'
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

const TEST_EMAIL = 'test-ventas@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
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
    category: 'FABRIC',
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
