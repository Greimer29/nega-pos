import Purchase from '#models/purchase'
import PurchaseItem from '#models/purchase_item'
import CatalogProduct from '#models/catalog_product'
import Material from '#models/material'
import InventoryMovement from '#models/inventory_movement'
import Supplier from '#models/supplier'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { rm } from 'node:fs/promises'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-purchases-confirmar@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('inventory_movements').delete()
  await db.from('order_lines').delete()
  await db.from('formula_materials').delete()
  await db.from('formulas').delete()
  await db.from('purchase_items').delete()
  await db.from('catalog_products').delete()
  await db.from('purchases').delete()
  await db.from('order_materials').delete()
  await db.from('orders').delete()
  await db.from('machine_expenses').delete()
  await db.from('expenses').delete()
  await db.from('app_settings').delete()
  await db.from('materials').delete()
  await db.from('machines').delete()
  await db.from('customers').delete()
  await db.from('counters').delete()
  await db.from('suppliers').delete()
  await db.from('sales_shifts').delete()
  await db.from('users').delete()
}

async function resetStorage() {
  await rm('storage/uploads/purchases', { recursive: true, force: true })
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

async function seedSupplier() {
  return Supplier.create({
    name: 'El Castillo',
    rif: 'J123456789',
    active: true,
  })
}

async function seedMaterial(overrides: Partial<Material> = {}) {
  return Material.create({
    code: '5810',
    name: 'Atlética negra',
    category: 'Uniforme',
    unit: 'ROL',
    minimumStock: '1',
    active: true,
    ...overrides,
  })
}

async function seedPurchaseBorrador(options: {
  supplier: Supplier
  material: Material
  usdRate?: string | null
  invoiceNumber?: string | null
  withItem?: boolean
}) {
  const purchase = await Purchase.create({
    supplierId: options.supplier.id,
    date: DateTime.fromISO('2026-05-20'),
    invoiceNumber: options.invoiceNumber !== undefined ? options.invoiceNumber : 'F-001',
    usdRate: options.usdRate ?? null,
    totalBs: '0.00',
    status: 'DRAFT',
  })

  if (options.withItem !== false) {
    await PurchaseItem.create({
      purchaseId: purchase.id,
      materialId: options.material.id,
      quantity: '9.00',
      unitPriceUsd: '22.1452',
      unitPriceBs: '808.30',
      subtotalUsd: '199.3068',
      subtotalBs: '7274.70',
    })
    purchase.totalUsd = '199.3068'
    purchase.totalBs = '7274.70'
    await purchase.save()
  }

  return purchase
}

test.group('Purchases confirmar API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetStorage()
    await resetDatabase()
    await seedAdminUser()
  })

  test('POST /api/v1/purchases/:id/confirm with usd_rate persists USD snapshots and stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()
    const purchase = await seedPurchaseBorrador({
      supplier,
      material,
      usdRate: '36.5000',
    })

    const response = await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        purchase: {
          id: Number(purchase.id),
          status: 'CONFIRMED',
          totalBs: '7274.70',
          totalUsd: '199.3068',
        },
      },
    })

    const item = await PurchaseItem.query().where('purchaseId', Number(purchase.id)).firstOrFail()
    assert.equal(item.unitPriceUsd, '22.1452')
    assert.equal(item.subtotalUsd, '199.3068')

    const movimientos = await InventoryMovement.query().where('materialId', Number(material.id))
    assert.lengthOf(movimientos, 1)
    assert.equal(movimientos[0].type, 'PURCHASE_IN')
    assert.equal(movimientos[0].quantity, '9.000')

    await material.refresh()
    assert.equal(material.lastPurchasePrice, '808.30')
    assert.equal(material.lastPurchasePriceUsd, '22.1452')
    assert.equal(material.lastPurchaseDate?.toISODate(), '2026-05-20')
  })

  test('POST /api/v1/purchases/:id/confirm without usd_rate still snapshots USD from items', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()
    const purchase = await seedPurchaseBorrador({
      supplier,
      material,
      usdRate: null,
    })

    const response = await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        purchase: {
          status: 'CONFIRMED',
          totalUsd: '199.3068',
        },
      },
    })

    const item = await PurchaseItem.query().where('purchaseId', Number(purchase.id)).firstOrFail()
    assert.equal(item.unitPriceUsd, '22.1452')
    assert.equal(item.subtotalUsd, '199.3068')

    await material.refresh()
    assert.equal(material.lastPurchasePrice, '808.30')
    assert.equal(material.lastPurchasePriceUsd, '22.1452')
  })

  test('confirm without usd_rate still updates material USD from item price', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial({
      lastPurchasePriceUsd: '1.5600',
      lastPurchasePrice: '500.00',
    })
    const purchase = await seedPurchaseBorrador({
      supplier,
      material,
      usdRate: null,
    })

    const response = await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)

    response.assertStatus(200)

    await material.refresh()
    assert.equal(material.lastPurchasePrice, '808.30')
    assert.equal(material.lastPurchasePriceUsd, '22.1452')
  })

  test('POST /api/v1/purchases/:id/confirm without invoice_number returns 422 and rolels back', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()
    const purchase = await seedPurchaseBorrador({
      supplier,
      material,
      invoiceNumber: null,
    })

    const response = await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'NUMERO_FACTURA_REQUERIDO',
      },
    })

    await purchase.refresh()
    assert.equal(purchase.status, 'DRAFT')

    const movimientos = await InventoryMovement.query().where('materialId', Number(material.id))
    assert.lengthOf(movimientos, 0)
  })

  test('POST /api/v1/purchases/:id/confirm without items returns 422 and rolels back', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()
    const purchase = await seedPurchaseBorrador({
      supplier,
      material,
      withItem: false,
    })

    const response = await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'COMPRA_SIN_ITEMS',
      },
    })

    await purchase.refresh()
    assert.equal(purchase.status, 'DRAFT')
    assert.lengthOf(await InventoryMovement.all(), 0)
  })

  test('POST /api/v1/purchases/:id/confirm on confirmed purchase returns 409', async ({
    client,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()
    const purchase = await seedPurchaseBorrador({ supplier, material, usdRate: '36.5000' })

    await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)

    const response = await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)

    response.assertStatus(409)
    response.assertBodyContains({
      error: {
        code: 'COMPRA_YA_CONFIRMED',
      },
    })
  })

  test('POST and GET /api/v1/purchases/:id/invoice upload and download file', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()
    const purchase = await seedPurchaseBorrador({ supplier, material })

    const uploadResponse = await client
      .post(`/api/v1/purchases/${purchase.id}/invoice`)
      .loginAs(user)
      .file('factura', Buffer.from('%PDF-1.4 test'), {
        filename: 'factura.pdf',
        contentType: 'application/pdf',
      })

    uploadResponse.assertStatus(200)
    uploadResponse.assertBodyContains({
      data: {
        purchase: {
          tieneFactura: true,
        },
      },
    })

    await purchase.refresh()
    assert.isNotNull(purchase.invoiceFile)

    const downloadResponse = await client
      .get(`/api/v1/purchases/${purchase.id}/invoice`)
      .loginAs(user)

    downloadResponse.assertStatus(200)
    downloadResponse.assertHeader('content-type', 'application/pdf')
  })

  test('GET /api/v1/materials/:id/price-history returns confirmed purchases', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()
    const purchase = await seedPurchaseBorrador({
      supplier,
      material,
      usdRate: '36.5000',
    })

    await client.post(`/api/v1/purchases/${purchase.id}/confirm`).loginAs(user)

    const response = await client
      .get(`/api/v1/materials/${material.id}/price-history`)
      .loginAs(user)

    response.assertStatus(200)
    const body = response.body()
    assert.lengthOf(body.data.historial, 1)
    assert.equal(body.data.historial[0].unitPriceBs, '808.30')
    assert.equal(body.data.historial[0].unitPriceUsd, '22.1452')
    assert.equal(body.data.historial[0].supplier.name, 'El Castillo')
  })

  test('GET /api/v1/catalog-products/:id/purchase-history returns confirmed product purchases', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const product = await CatalogProduct.create({
      name: 'Camisa polo',
      category: 'UNIFORM',
      salePriceUsd: '20.0000',
      costUsd: '10.0000',
      stockQuantity: '0.000',
      active: true,
    })
    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      invoiceNumber: 'F-PROD-1',
      usdRate: '36.5000',
      totalBs: '0.00',
      status: 'DRAFT',
    })
    await PurchaseItem.create({
      purchaseId: purchase.id,
      catalogProductId: product.id,
      quantity: '3.00',
      unitPriceUsd: '10.0000',
      unitPriceBs: '365.00',
      subtotalUsd: '30.0000',
      subtotalBs: '1095.00',
    })
    purchase.totalUsd = '30.0000'
    purchase.totalBs = '1095.00'
    await purchase.save()

    const confirmResponse = await client
      .post(`/api/v1/purchases/${purchase.id}/confirm`)
      .loginAs(user)
    confirmResponse.assertStatus(200)

    const monthResponse = await client
      .get(`/api/v1/catalog-products/${product.id}/purchase-history`)
      .qs({ month: '2026-05' })
      .loginAs(user)

    monthResponse.assertStatus(200)
    const monthBody = monthResponse.body()
    assert.lengthOf(monthBody.data.historial, 1)
    assert.equal(monthBody.data.historial[0].supplier.code, 'J123456789')
    assert.equal(monthBody.data.historial[0].supplier.name, 'El Castillo')
    assert.equal(Number(monthBody.data.historial[0].quantity), 3)
    assert.equal(monthBody.data.historial[0].unitPriceUsd, '10.0000')
    assert.equal(monthBody.data.historial[0].subtotalUsd, '30.0000')
    assert.equal(monthBody.data.historial[0].date, '2026-05-20')

    const otherMonth = await client
      .get(`/api/v1/catalog-products/${product.id}/purchase-history`)
      .qs({ month: '2026-06' })
      .loginAs(user)

    otherMonth.assertStatus(200)
    assert.lengthOf(otherMonth.body().data.historial, 0)

    const rangeResponse = await client
      .get(`/api/v1/catalog-products/${product.id}/purchase-history`)
      .qs({ from: '2026-05-01', to: '2026-05-31' })
      .loginAs(user)

    rangeResponse.assertStatus(200)
    assert.lengthOf(rangeResponse.body().data.historial, 1)

    const missing = await client
      .get('/api/v1/catalog-products/999999/purchase-history')
      .loginAs(user)

    missing.assertStatus(404)
  })
})
