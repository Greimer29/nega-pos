import Purchase from '#models/purchase'
import Material from '#models/material'
import Supplier from '#models/supplier'
import User from '#models/user'
import Currency from '#models/currency'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-purchases@negapos.local'
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
  await db.from('expenses').delete()
  await db.from('app_settings').delete()
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

async function seedSupplier() {
  return Supplier.create({
    name: 'El Castillo',
    rif: 'J123456789',
    active: true,
  })
}

async function seedMaterial() {
  return Material.create({
    code: '5810',
    name: 'Atlética negra',
    category: 'Uniforme',
    unit: 'ROL',
    minimumStock: '1',
    active: true,
  })
}

test.group('Purchases API (borrador)', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/purchases requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/purchases')
    response.assertStatus(401)
  })

  test('POST /api/v1/purchases creates DRAFT purchase with optional tasa and date_recepcion', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()

    const response = await client
      .post('/api/v1/purchases')
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: '2026-05-20',
        date_recepcion: '2026-05-22',
        usd_rate: 36.5,
        notes: 'Purchase de telas',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        purchase: {
          supplierId: Number(supplier.id),
          status: 'DRAFT',
          totalBs: '0.00',
          usdRate: '36.5000',
          notes: 'Purchase de telas',
        },
      },
    })

    const body = response.body() as { data: { purchase: { id: number } } }
    const purchase = await Purchase.findOrFail(body.data.purchase.id)
    assert.equal(purchase.date.toISODate(), '2026-05-20')
    assert.equal(purchase.receivedDate?.toISODate(), '2026-05-22')
  })

  test('POST /api/v1/purchases/:id/items recalculates totals with USD primary', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      usdRate: '36.5000',
      totalBs: '0.00',
      totalUsd: '0.0000',
      status: 'DRAFT',
    })

    const response = await client
      .post(`/api/v1/purchases/${purchase.id}/items`)
      .loginAs(user)
      .json({
        material_id: Number(material.id),
        quantity: 9,
        unit_price_usd: 22.1452,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        item: {
          materialId: Number(material.id),
          quantity: '9.00',
          unitPriceUsd: '22.1452',
          subtotalUsd: '199.3068',
          unitPriceBs: '808.30',
          subtotalBs: '7274.70',
        },
      },
    })

    await purchase.refresh()
    assert.equal(purchase.totalUsd, '199.3068')
    assert.equal(purchase.totalBs, '7274.70')
  })

  test('PUT /api/v1/purchases/:id updates header only in DRAFT', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      totalBs: '0.00',
      status: 'DRAFT',
    })

    const response = await client
      .put(`/api/v1/purchases/${purchase.id}`)
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: '2026-05-21',
        invoice_number: 'F-001',
        usd_rate: 40,
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        purchase: {
          date: '2026-05-21',
          invoiceNumber: 'F-001',
          usdRate: '40.0000',
        },
      },
    })
  })

  test('PUT /api/v1/purchases/:id returns 409 when not DRAFT', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      totalBs: '100.00',
      status: 'CONFIRMED',
      invoiceNumber: 'F-999',
    })

    const response = await client
      .put(`/api/v1/purchases/${purchase.id}`)
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: '2026-05-21',
      })

    response.assertStatus(409)
    response.assertBodyContains({
      error: {
        code: 'COMPRA_NO_EDITABLE',
      },
    })
  })

  test('GET /api/v1/purchases/:id includes items with material summary', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()

    const createResponse = await client
      .post('/api/v1/purchases')
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: '2026-05-20',
        usd_rate: 36.5,
      })

    const purchaseId = createResponse.body().data.purchase.id

    await client
      .post(`/api/v1/purchases/${purchaseId}/items`)
      .loginAs(user)
      .json({
        material_id: Number(material.id),
        quantity: 9,
        unit_price_usd: 22.1452,
      })

    const response = await client.get(`/api/v1/purchases/${purchaseId}`).loginAs(user)

    response.assertStatus(200)
    const body = response.body()
    assert.lengthOf(body.data.purchase.items, 1)
    assert.equal(body.data.purchase.items[0].material.code, '5810')
    assert.equal(body.data.purchase.totalBs, '7274.70')
    assert.equal(body.data.purchase.totalUsd, '199.3068')
  })

  test('DELETE /api/v1/purchases/:id/items/:itemId updates total_bs', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()
    const material = await seedMaterial()

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      totalBs: '0.00',
      status: 'DRAFT',
    })

    const itemResponse = await client
      .post(`/api/v1/purchases/${purchase.id}/items`)
      .loginAs(user)
      .json({
        material_id: Number(material.id),
        quantity: 2,
        unit_price_usd: 10,
      })

    const itemId = itemResponse.body().data.item.id

    const deleteResponse = await client
      .delete(`/api/v1/purchases/${purchase.id}/items/${itemId}`)
      .loginAs(user)

    deleteResponse.assertStatus(200)

    await purchase.refresh()
    assert.equal(purchase.totalBs, '0.00')
  })

  test('DELETE /api/v1/purchases/:id removes DRAFT purchase', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      totalBs: '0.00',
      status: 'DRAFT',
    })

    const response = await client.delete(`/api/v1/purchases/${purchase.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
      },
    })

    const deleted = await Purchase.find(purchase.id)
    assert.isNull(deleted)
  })

  test('PUT /api/v1/purchases/:id persists entry_currency_code without changing global currency rate', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()

    await db.from('currencies').where('code', 'VES').update({ rate_per_usd: '40.0000' })
    const globalRateBefore = (await db.from('currencies').where('code', 'VES').first())!
      .rate_per_usd

    const createResponse = await client
      .post('/api/v1/purchases')
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: '2026-05-20',
        entry_currency_code: 'VES',
        usd_rate: 37.5,
      })

    createResponse.assertStatus(200)
    createResponse.assertBodyContains({
      data: {
        purchase: {
          entryCurrencyCode: 'VES',
          usdRate: '37.5000',
        },
      },
    })

    const purchaseId = (createResponse.body() as { data: { purchase: { id: number } } }).data
      .purchase.id

    const updateResponse = await client
      .put(`/api/v1/purchases/${purchaseId}`)
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: '2026-05-20',
        entry_currency_code: 'VES',
        usd_rate: 38.25,
      })

    updateResponse.assertStatus(200)
    updateResponse.assertBodyContains({
      data: {
        purchase: {
          entryCurrencyCode: 'VES',
          usdRate: '38.2500',
        },
      },
    })

    const globalRateAfter = (await db.from('currencies').where('code', 'VES').first())!.rate_per_usd
    assert.equal(globalRateAfter, globalRateBefore)
  })

  test('PUT /api/v1/purchases/:id rejects inactive entry currency', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await seedSupplier()

    await Currency.updateOrCreate(
      { code: 'EUR' },
      {
        name: 'Euro',
        ratePerUsd: '0.9200',
        isActive: false,
      }
    )

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.fromISO('2026-05-20'),
      entryCurrencyCode: 'USD',
      totalBs: '0.00',
      totalUsd: '0.0000',
      status: 'DRAFT',
    })

    const response = await client
      .put(`/api/v1/purchases/${purchase.id}`)
      .loginAs(user)
      .json({
        supplier_id: Number(supplier.id),
        date: '2026-05-20',
        entry_currency_code: 'EUR',
        usd_rate: 0.92,
      })

    response.assertStatus(404)
  })
})
