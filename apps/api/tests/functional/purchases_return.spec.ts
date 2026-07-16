import Purchase from '#models/purchase'
import PurchaseItem from '#models/purchase_item'
import Material from '#models/material'
import InventoryMovement from '#models/inventory_movement'
import Supplier from '#models/supplier'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-purchases-return@negapos.local'
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
  await db.from('expenses').delete()
  await db.from('app_settings').delete()
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

async function seedConfirmedPurchase() {
  const supplier = await Supplier.create({
    name: 'El Castillo',
    rif: 'J123456789',
    active: true,
  })

  const material = await Material.create({
    code: '5810',
    name: 'Atlética negra',
    category: 'Uniforme',
    unit: 'ROL',
    minimumStock: '1',
    active: true,
  })

  const purchase = await Purchase.create({
    supplierId: supplier.id,
    date: DateTime.fromISO('2026-05-20'),
    invoiceNumber: 'F-001',
    usdRate: '36.5000',
    totalBs: '7274.70',
    totalUsd: '199.3068',
    status: 'CONFIRMED',
  })

  const item = await PurchaseItem.create({
    purchaseId: purchase.id,
    materialId: material.id,
    quantity: '9.00',
    unitPriceUsd: '22.1452',
    unitPriceBs: '808.30',
    subtotalUsd: '199.3068',
    subtotalBs: '7274.70',
  })

  await InventoryMovement.create({
    materialId: material.id,
    type: 'PURCHASE_IN',
    quantity: '9.00',
    purchaseItemId: item.id,
  })

  return { purchase, material, item }
}

test.group('Purchases return API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('POST /api/v1/purchases/:id/return voids purchase when stock is sufficient', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const { purchase } = await seedConfirmedPurchase()

    const response = await client.post(`/api/v1/purchases/${purchase.id}/return`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        purchase: {
          id: Number(purchase.id),
          status: 'VOIDED',
        },
      },
    })

    await purchase.refresh()
    assert.isNotNull(purchase.voidedAt)

    const reversals = await InventoryMovement.query().where('type', 'REVERSAL_ADJUSTMENT')
    assert.lengthOf(reversals, 1)
    assert.equal(reversals[0].quantity, '-9.000')
  })

  test('POST /api/v1/purchases/:id/return blocks when stock was consumed', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const { purchase, material } = await seedConfirmedPurchase()

    await InventoryMovement.create({
      materialId: material.id,
      type: 'ORDER_OUT',
      quantity: '-5.00',
    })

    const response = await client.post(`/api/v1/purchases/${purchase.id}/return`).loginAs(user)

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'INSUFFICIENT_STOCK_FOR_RETURN',
      },
    })

    await purchase.refresh()
    assert.equal(purchase.status, 'CONFIRMED')
  })

  test('GET /api/v1/purchases/summary returns KPIs', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await seedConfirmedPurchase()

    const response = await client.get('/api/v1/purchases/summary').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        summary: {
          count: 1,
          confirmedCount: 1,
          confirmedPercent: 100,
        },
      },
    })
  })

  test('POST confirm with batch items replaces draft items', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Proveedor',
      rif: 'J999',
      active: true,
    })
    const material = await Material.create({
      code: '100',
      name: 'Tela',
      category: 'Uniforme',
      unit: 'ROL',
      minimumStock: '1',
      active: true,
    })

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-06-01'),
      invoiceNumber: 'F-BATCH',
      usdRate: '40.0000',
      totalBs: '0.00',
      totalUsd: '0.0000',
      status: 'DRAFT',
    })

    const response = await client
      .post(`/api/v1/purchases/${purchase.id}/confirm`)
      .loginAs(user)
      .json({
        items: [
          {
            material_id: Number(material.id),
            quantity: 2,
            unit_price_usd: 15,
          },
        ],
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        purchase: {
          status: 'CONFIRMED',
          totalUsd: '30.0000',
        },
      },
    })

    const items = await PurchaseItem.query().where('purchaseId', Number(purchase.id))
    assert.lengthOf(items, 1)
    assert.equal(items[0].unitPriceUsd, '15.0000')
  })
})
