import CatalogProduct from '#models/catalog_product'
import Customer from '#models/customer'
import InventoryMovement from '#models/inventory_movement'
import Material from '#models/material'
import Supplier from '#models/supplier'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-inventory-flow@negapos.local'
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
      name: 'Admin Inventory Flow',
      role: 'ADMIN',
      active: true,
    }
  )
}

async function seedSupplier() {
  return Supplier.create({
    name: 'Proveedor integral',
    rif: 'J555555555',
    active: true,
  })
}

async function seedMaterial(overrides: Partial<Material> = {}) {
  return Material.create({
    code: 'INT-001',
    name: 'Tela integral',
    category: 'FABRIC',
    unit: 'ROL',
    minimumStock: '1',
    lastPurchasePriceUsd: '5.0000',
    salePriceUsd: '8.0000',
    active: true,
    ...overrides,
  })
}

async function crearCompraConfirmada(
  client: { post: Function },
  user: User,
  supplier: Supplier,
  material: Material,
  quantity: number,
  invoiceNumber = 'F-INT-001'
) {
  const purchaseResponse = await client
    .post('/api/v1/purchases')
    .loginAs(user)
    .json({
      supplier_id: Number(supplier.id),
      date: '2026-06-01',
      invoice_number: invoiceNumber,
      usd_rate: 40,
    })

  purchaseResponse.assertStatus(200)
  const purchaseId = purchaseResponse.body().data.purchase.id

  await client
    .post(`/api/v1/purchases/${purchaseId}/items`)
    .loginAs(user)
    .json({
      material_id: Number(material.id),
      quantity,
      unit_price_usd: 5,
    })

  const confirmResponse = await client.post(`/api/v1/purchases/${purchaseId}/confirm`).loginAs(user)

  confirmResponse.assertStatus(200)
  return purchaseId
}

test.group('Inventory flow integration — compras, ventas, fórmulas, materiales', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('purchase confirm increases material stock reflected in detail and list APIs', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial({ code: 'STK-PUR' })

    const beforeDetail = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    beforeDetail.assertStatus(200)
    assert.equal(beforeDetail.body().data.material.stockActual, 0)

    await crearCompraConfirmada(client, user, supplier, material, 25)

    const detail = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    detail.assertStatus(200)
    assert.equal(detail.body().data.material.stockActual, 25)

    const list = await client.get('/api/v1/materials').loginAs(user)
    list.assertStatus(200)
    const row = list.body().data.materials.find((m: { id: number }) => m.id === Number(material.id))
    assert.exists(row)
    assert.equal(row.stockActual, 25)
  })

  test('multiple purchases accumulate material stock correctly', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial({ code: 'STK-ACC' })

    await crearCompraConfirmada(client, user, supplier, material, 10, 'F-ACC-1')
    await crearCompraConfirmada(client, user, supplier, material, 15, 'F-ACC-2')

    const detail = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(detail.body().data.material.stockActual, 25)
  })

  test('walk-in sale deducts product and material stock via API', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial({ code: 'STK-SALE-M' })

    await crearCompraConfirmada(client, user, supplier, material, 50)

    const product = await CatalogProduct.create({
      name: 'Producto venta directa',
      category: 'Uniforme',
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '12.000',
      active: true,
    })

    const materialBefore = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(materialBefore.body().data.material.stockActual, 50)

    const productBefore = await client.get(`/api/v1/catalog-products/${product.id}`).loginAs(user)
    assert.equal(productBefore.body().data.catalog_product.stock_quantity, '12.000')

    const saleResponse = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente walk-in',
        confirm: true,
        payment_type: 'CASH',
        billing_mode: 'FAST',
        payment_method_code: 'cash_usd',
        lines: [
          {
            catalog_product_id: Number(product.id),
            quantity: 4,
            unit_price_usd: 20,
          },
          {
            material_id: Number(material.id),
            quantity: 8,
            unit_price_usd: 8,
          },
        ],
      })

    saleResponse.assertStatus(200)

    const materialAfter = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(materialAfter.body().data.material.stockActual, 42)

    const productAfter = await client.get(`/api/v1/catalog-products/${product.id}`).loginAs(user)
    assert.equal(productAfter.body().data.catalog_product.stock_quantity, '8.000')
  })

  test('sale rejects insufficient product stock with 409', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const product = await CatalogProduct.create({
      name: 'Producto sin stock',
      category: 'Camisa',
      salePriceUsd: '15.0000',
      costUsd: '5.0000',
      stockQuantity: '2.000',
      active: true,
    })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente sin stock',
        confirm: true,
        payment_type: 'CASH',
        billing_mode: 'FAST',
        payment_method_code: 'cash_usd',
        lines: [
          {
            catalog_product_id: Number(product.id),
            quantity: 5,
            unit_price_usd: 15,
          },
        ],
      })

    response.assertStatus(409)
    response.assertBodyContains({
      error: { code: 'STOCK_INSUFICIENTE' },
    })
  })

  test('sale rejects insufficient material stock with 409', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'STK-LOW' })

    const response = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente material bajo',
        confirm: true,
        payment_type: 'CASH',
        billing_mode: 'FAST',
        payment_method_code: 'cash_usd',
        lines: [
          {
            material_id: Number(material.id),
            quantity: 3,
            unit_price_usd: 8,
          },
        ],
      })

    response.assertStatus(409)
    response.assertBodyContains({
      error: { code: 'STOCK_INSUFICIENTE' },
    })
  })

  test('order CONFIRMED deducts product stock visible in catalog API', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const customer = await Customer.create({
      name: 'Cliente pedido',
      type: 'CORPORATE',
      active: true,
    })

    const product = await CatalogProduct.create({
      name: 'Camisa stock pedido',
      category: 'Camisa',
      salePriceUsd: '30.0000',
      costUsd: '12.0000',
      stockQuantity: '20.000',
      active: true,
    })

    const orderResponse = await client
      .post('/api/v1/orders')
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'Pedido stock producto',
        total_quantity: 6,
        order_date: '2026-06-02',
      })

    orderResponse.assertStatus(200)
    const orderId = orderResponse.body().data.order.id

    await client
      .post(`/api/v1/orders/${orderId}/lines`)
      .loginAs(user)
      .json({
        catalog_product_id: Number(product.id),
        quantity: 6,
      })

    const confirmResponse = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED' })

    confirmResponse.assertStatus(200)

    const productDetail = await client.get(`/api/v1/catalog-products/${product.id}`).loginAs(user)
    assert.equal(productDetail.body().data.catalog_product.stock_quantity, '14.000')
  })

  test('order IN_PRODUCTION deducts materials per catalog formula via API', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const customer = await Customer.create({
      name: 'Cliente fórmula',
      type: 'CORPORATE',
      active: true,
    })
    const material = await seedMaterial({ code: 'STK-FORM' })

    await crearCompraConfirmada(client, user, supplier, material, 100)

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Fórmula integral',
    })
    formulaResponse.assertStatus(200)
    const formulaId = formulaResponse.body().data.formula.id

    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({
        items: [{ material_id: Number(material.id), quantity: 2.5 }],
      })

    const productResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Uniforme fórmula',
      category: 'Uniforme',
      sale_price_usd: 35,
      stock_quantity: 20,
      formula_id: formulaId,
    })
    productResponse.assertStatus(200)
    const productId = productResponse.body().data.catalog_product.id

    const orderResponse = await client
      .post('/api/v1/orders')
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'Pedido con fórmula',
        total_quantity: 8,
        order_date: '2026-06-02',
      })
    const orderId = orderResponse.body().data.order.id

    await client.post(`/api/v1/orders/${orderId}/lines`).loginAs(user).json({
      catalog_product_id: productId,
      quantity: 8,
    })

    const stockBeforeProduction = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(stockBeforeProduction.body().data.material.stockActual, 100)

    const confirmResponse = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED' })

    confirmResponse.assertStatus(200)

    const productionResponse = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    productionResponse.assertStatus(200)

    const stockAfterProduction = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(stockAfterProduction.body().data.material.stockActual, 80)

    const availability = await client
      .get(`/api/v1/orders/${orderId}/material-availability`)
      .loginAs(user)
    availability.assertStatus(200)
    assert.isTrue(availability.body().data.sufficient)
  })

  test('full E2E: purchase → formula → order → confirm → production → sale walk-in', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const customer = await Customer.create({
      name: 'Cliente E2E',
      type: 'CORPORATE',
      active: true,
    })
    const material = await seedMaterial({ code: 'E2E-TELA' })

    // 1. Compra confirma stock de material
    await crearCompraConfirmada(client, user, supplier, material, 200)
    const materialStockResponse = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    let matStock = materialStockResponse.body().data.material.stockActual
    assert.equal(matStock, 200)

    // 2. Fórmula y producto con stock derivado de materiales (200 / 3 ≈ 66 unidades)
    const formulaResponse = await client
      .post('/api/v1/formulas')
      .loginAs(user)
      .json({ name: 'E2E Formula' })
    const formulaId = formulaResponse.body().data.formula.id

    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({
        items: [{ material_id: Number(material.id), quantity: 3 }],
      })

    const productResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Producto E2E',
      category: 'Uniforme',
      sale_price_usd: 40,
      formula_id: formulaId,
    })
    const productId = productResponse.body().data.catalog_product.id

    // 3. Pedido: confirmar valida capacidad; producción descuenta material (no stock manual del producto)
    const orderResponse = await client
      .post('/api/v1/orders')
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'E2E pedido',
        total_quantity: 10,
        order_date: '2026-06-02',
      })
    const orderId = orderResponse.body().data.order.id

    await client.post(`/api/v1/orders/${orderId}/lines`).loginAs(user).json({
      catalog_product_id: productId,
      quantity: 10,
    })

    await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'CONFIRMED' })

    const productAfterConfirm = await client
      .get(`/api/v1/catalog-products/${productId}`)
      .loginAs(user)
    assert.equal(productAfterConfirm.body().data.catalog_product.stock_quantity, '56.000')
    assert.equal(productAfterConfirm.body().data.catalog_product.stock_source, 'formula')

    await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'IN_PRODUCTION' })

    const materialAfterProductionResponse = await client
      .get(`/api/v1/materials/${material.id}`)
      .loginAs(user)
    matStock = materialAfterProductionResponse.body().data.material.stockActual
    assert.equal(matStock, 170) // 200 - (10 líneas × 3 material/unidad)

    // 4. Venta walk-in adicional sobre el mismo material y producto
    await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Venta E2E extra',
        confirm: true,
        payment_type: 'CASH',
        billing_mode: 'FAST',
        payment_method_code: 'cash_usd',
        lines: [
          { catalog_product_id: productId, quantity: 5, unit_price_usd: 40 },
          { material_id: Number(material.id), quantity: 10, unit_price_usd: 8 },
        ],
      })

    const materialAfterSaleResponse = await client
      .get(`/api/v1/materials/${material.id}`)
      .loginAs(user)
    matStock = materialAfterSaleResponse.body().data.material.stockActual
    assert.equal(matStock, 145)

    const productFinal = await client.get(`/api/v1/catalog-products/${productId}`).loginAs(user)
    assert.equal(productFinal.body().data.catalog_product.stock_quantity, '48.000')
  })

  test('manual adjustment cargo and descargo update stock in material API', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await seedMaterial({ code: 'STK-MAN' })

    const cargo = await client
      .post(`/api/v1/materials/${material.id}/adjustment`)
      .loginAs(user)
      .json({ mode: 'CARGO', quantity: 15, note: 'Inventario inicial' })

    cargo.assertStatus(200)
    assert.equal(cargo.body().data.stockActual, 15)

    const descargo = await client
      .post(`/api/v1/materials/${material.id}/adjustment`)
      .loginAs(user)
      .json({ mode: 'DESCARGO', quantity: 4 })

    descargo.assertStatus(200)
    assert.equal(descargo.body().data.stockActual, 11)

    const ajuste = await client
      .post(`/api/v1/materials/${material.id}/adjustment`)
      .loginAs(user)
      .json({ mode: 'AJUSTE', quantity: 20 })

    ajuste.assertStatus(200)
    assert.equal(ajuste.body().data.stockActual, 20)

    const detail = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(detail.body().data.material.stockActual, 20)
  })

  test('1 — compra de 2 MTS de material refleja stock físico en API', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial({ code: 'ATL-NEGRA', name: 'Atletica negra', unit: 'MTS' })

    await crearCompraConfirmada(client, user, supplier, material, 2, 'F-ATL-2')

    const detail = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(detail.body().data.material.stockActual, 2)

    const movementCount = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .where('type', 'PURCHASE_IN')
      .count('* as total')
    assert.equal(Number(movementCount[0].$extras.total), 1)
  })

  test('2 — fórmula 1.5 MTS expone 1 unidad disponible del producto catálogo', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial({ code: 'ATL-FORM', name: 'Atletica negra', unit: 'MTS' })

    await crearCompraConfirmada(client, user, supplier, material, 2, 'F-ATL-FORM')

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Camisa Atletica',
    })
    formulaResponse.assertStatus(200)
    const formulaId = formulaResponse.body().data.formula.id

    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({
        items: [{ material_id: Number(material.id), quantity: 1.5 }],
      })

    const productResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Camisa con logo',
      category: 'Camisa',
      sale_price_usd: 25,
      formula_id: formulaId,
      stock_quantity: 0,
    })
    productResponse.assertStatus(200)
    const productId = productResponse.body().data.catalog_product.id

    const detail = await client.get(`/api/v1/catalog-products/${productId}`).loginAs(user)
    assert.equal(detail.body().data.catalog_product.stock_source, 'formula')
    assert.equal(detail.body().data.catalog_product.stock_quantity, '1.000')
  })

  test('3 — pedido DRAFT con 1 camisa se entrega y descuenta 1.5 MTS', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const customer = await Customer.create({
      name: 'Cliente atletica',
      type: 'CORPORATE',
      active: true,
    })
    const material = await seedMaterial({ code: 'ATL-ORD', name: 'Atletica negra', unit: 'MTS' })

    await crearCompraConfirmada(client, user, supplier, material, 2, 'F-ATL-ORD')

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Camisa Atletica',
    })
    const formulaId = formulaResponse.body().data.formula.id

    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({
        items: [{ material_id: Number(material.id), quantity: 1.5 }],
      })

    const productResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Camisa con logo',
      category: 'Camisa',
      sale_price_usd: 25,
      formula_id: formulaId,
      stock_quantity: 0,
    })
    const productId = productResponse.body().data.catalog_product.id

    const orderResponse = await client
      .post('/api/v1/orders')
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'Camisa con logo',
        total_quantity: 1,
        order_date: '2026-06-17',
        guest_name: null,
      })
    const orderId = orderResponse.body().data.order.id

    await client.post(`/api/v1/orders/${orderId}/lines`).loginAs(user).json({
      catalog_product_id: productId,
      quantity: 1,
    })

    const availability = await client
      .get(`/api/v1/orders/${orderId}/material-availability`)
      .loginAs(user)
    availability.assertStatus(200)
    assert.isTrue(availability.body().data.sufficient)

    const delivered = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'DELIVERED', payment_type: 'CASH' })

    delivered.assertStatus(200)
    assert.equal(delivered.body().data.order.status, 'DELIVERED')

    const materialAfter = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(materialAfter.body().data.material.stockActual, 0.5)

    const orderOut = await InventoryMovement.query()
      .where('orderId', orderId)
      .where('type', 'ORDER_OUT')
      .where('materialId', Number(material.id))
      .first()
    assert.exists(orderOut)
    assert.equal(Number(orderOut!.quantity), -1.5)
  })

  test('4 — venta de 2 camisas con solo 2 MTS rechaza sin descontar material', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const customer = await Customer.create({
      name: 'Cliente rechazo',
      type: 'CORPORATE',
      active: true,
    })
    const material = await seedMaterial({ code: 'ATL-REJ', name: 'Atletica negra', unit: 'MTS' })

    await crearCompraConfirmada(client, user, supplier, material, 2, 'F-ATL-REJ')

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Camisa Atletica',
    })
    const formulaId = formulaResponse.body().data.formula.id

    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({
        items: [{ material_id: Number(material.id), quantity: 1.5 }],
      })

    const productResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Camisa con logo',
      category: 'Camisa',
      sale_price_usd: 25,
      formula_id: formulaId,
      stock_quantity: 0,
    })
    const productId = productResponse.body().data.catalog_product.id

    const orderResponse = await client
      .post('/api/v1/orders')
      .loginAs(user)
      .json({
        customer_id: Number(customer.id),
        modality: 'CORPORATE',
        description: 'Pedido exceso',
        total_quantity: 2,
        order_date: '2026-06-17',
      })
    const orderId = orderResponse.body().data.order.id

    await client.post(`/api/v1/orders/${orderId}/lines`).loginAs(user).json({
      catalog_product_id: productId,
      quantity: 2,
    })

    const rejected = await client
      .post(`/api/v1/orders/${orderId}/transition`)
      .loginAs(user)
      .json({ new_status: 'DELIVERED', payment_type: 'CASH' })

    rejected.assertStatus(409)
    rejected.assertBodyContains({ error: { code: 'STOCK_INSUFICIENTE' } })

    const materialAfter = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(materialAfter.body().data.material.stockActual, 2)

    const salidas = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .whereIn('type', ['ORDER_OUT', 'SALE_OUT'])
    assert.lengthOf(salidas, 0)
  })

  test('5 — venta walk-in con fórmula descuenta material y deja stock coherente', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial({ code: 'ATL-SALE', name: 'Atletica negra', unit: 'MTS' })

    await crearCompraConfirmada(client, user, supplier, material, 2, 'F-ATL-SALE')

    const formulaResponse = await client.post('/api/v1/formulas').loginAs(user).json({
      name: 'Camisa Atletica',
    })
    const formulaId = formulaResponse.body().data.formula.id

    await client
      .put(`/api/v1/formulas/${formulaId}/materials`)
      .loginAs(user)
      .json({
        items: [{ material_id: Number(material.id), quantity: 1.5 }],
      })

    const productResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Camisa walk-in',
      category: 'Camisa',
      sale_price_usd: 25,
      formula_id: formulaId,
      stock_quantity: 0,
    })
    const productId = productResponse.body().data.catalog_product.id

    const before = await client.get(`/api/v1/catalog-products/${productId}`).loginAs(user)
    assert.equal(before.body().data.catalog_product.stock_quantity, '1.000')

    const sale = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente walk-in',
        confirm: true,
        payment_type: 'CASH',
        billing_mode: 'FAST',
        payment_method_code: 'cash_usd',
        lines: [{ catalog_product_id: productId, quantity: 1, unit_price_usd: 25 }],
      })
    sale.assertStatus(200)

    const materialAfter = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(materialAfter.body().data.material.stockActual, 0.5)

    const productAfter = await client.get(`/api/v1/catalog-products/${productId}`).loginAs(user)
    assert.equal(productAfter.body().data.catalog_product.stock_quantity, '0.000')

    const rejected = await client
      .post('/api/v1/sales')
      .loginAs(user)
      .json({
        guest_name: 'Cliente sin stock',
        confirm: true,
        payment_type: 'CASH',
        billing_mode: 'FAST',
        payment_method_code: 'cash_usd',
        lines: [{ catalog_product_id: productId, quantity: 1, unit_price_usd: 25 }],
      })
    rejected.assertStatus(409)
    const materialFinalResponse = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    assert.equal(materialFinalResponse.body().data.material.stockActual, 0.5)
  })
})
