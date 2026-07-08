import CatalogProduct from '#models/catalog_product'
import Material from '#models/material'
import InventoryMovement from '#models/inventory_movement'
import User from '#models/user'
import { formatCatalogProductCode } from '#utils/catalog_product_code'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-materials@negapos.local'
const TEST_PASSWORD = 'password123'

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

async function createMaterial(overrides: Partial<Material> = {}) {
  return Material.create({
    code: '5810',
    name: 'Atlética',
    category: 'FABRIC',
    unit: 'ROL',
    minimumStock: '1',
    active: true,
    ...overrides,
  })
}

test.group('Materials API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/materials/:id returns stock 0 with no movements', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await createMaterial()

    const response = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        material: {
          id: Number(material.id),
          code: '5810',
          stockActual: 0,
        },
      },
    })

    const body = response.body()
    assert.lengthOf(body.data.material.movimientos, 0)
  })

  test('stock sums entries and exits correctly', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await createMaterial({ code: '3039', name: 'Microdurazno' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'PURCHASE_IN',
      quantity: '10',
    })
    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'ORDER_OUT',
      quantity: '-3',
    })

    const response = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.material.stockActual, 7)
  })

  test('POST /api/v1/materials/:id/adjustment creates manual movement with note', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await createMaterial({ code: '2919' })

    const response = await client
      .post(`/api/v1/materials/${material.id}/adjustment`)
      .loginAs(user)
      .json({
        mode: 'CARGO',
        quantity: 2.5,
        note: 'Conteo físico mensual',
      })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        movimiento: {
          type: 'MANUAL_CARGO',
          quantity: '2.5',
          note: 'Conteo físico mensual',
        },
        stockActual: 2.5,
      },
    })

    const movimiento = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .firstOrFail()

    assert.equal(movimiento.type, 'MANUAL_CARGO')
    assert.equal(movimiento.note, 'Conteo físico mensual')
  })

  test('POST /api/v1/materials/:id/adjustment supports descargo and ajuste modes', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await createMaterial({ code: '2920' })

    await client
      .post(`/api/v1/materials/${material.id}/adjustment`)
      .loginAs(user)
      .json({ mode: 'CARGO', quantity: 10 })

    const descargo = await client
      .post(`/api/v1/materials/${material.id}/adjustment`)
      .loginAs(user)
      .json({ mode: 'DESCARGO', quantity: 3 })

    descargo.assertStatus(200)
    assert.equal(descargo.body().data.stockActual, 7)

    const ajuste = await client
      .post(`/api/v1/materials/${material.id}/adjustment`)
      .loginAs(user)
      .json({ mode: 'AJUSTE', quantity: 5 })

    ajuste.assertStatus(200)
    assert.equal(ajuste.body().data.stockActual, 5)
    assert.equal(ajuste.body().data.movimiento.type, 'MANUAL_ADJUSTMENT')
    assert.equal(ajuste.body().data.movimiento.quantity, '-2')
  })

  test('POST /api/v1/materials rejects duplicate code', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await createMaterial({ code: '5236' })

    const response = await client.post('/api/v1/materials').loginAs(user).json({
      code: '5236',
      name: 'Duplicado',
      category: 'THREAD',
      unit: 'UND',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'CODIGO_DUPLICADO',
      },
    })
  })

  test('POST /api/v1/materials rejects code used by catalog product', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Producto catálogo',
      category: 'OTHER',
      saleUnit: 'UND',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '0',
      minimumStock: '0',
      active: true,
    })

    const response = await client
      .post('/api/v1/materials')
      .loginAs(user)
      .json({
        code: formatCatalogProductCode(Number(product.id)),
        name: 'Material conflicto',
        category: 'THREAD',
        unit: 'UND',
      })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'CODIGO_DUPLICADO',
      },
    })
  })

  test('POST /api/v1/catalog-products rejects auto code already used by material', async ({
    client,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const probe = await CatalogProduct.create({
      name: 'Producto reservado',
      category: 'OTHER',
      saleUnit: 'UND',
      salePriceUsd: '10.0000',
      costUsd: '5.0000',
      stockQuantity: '0',
      minimumStock: '0',
      active: true,
    })
    const reservedId = Number(probe.id)
    const reservedCode = formatCatalogProductCode(reservedId)
    await probe.delete()
    await db.rawQuery(`ALTER TABLE catalog_products AUTO_INCREMENT = ${reservedId}`)
    await createMaterial({ code: reservedCode })

    const response = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Producto conflicto',
      category: 'Uniforme',
      sale_price_usd: 10,
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'CODIGO_DUPLICADO',
      },
    })
  })

  test('GET /api/v1/materials search matches code and name', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await createMaterial({
      code: 'AAA-001',
      name: 'Tela especial',
    })
    await createMaterial({
      code: 'BBB-002',
      name: 'Hilo negro',
      category: 'THREAD',
      unit: 'UND',
    })

    const byCodigo = await client.get('/api/v1/materials?search=AAA-001').loginAs(user)
    byCodigo.assertStatus(200)
    assert.equal(byCodigo.body().data.meta.total, 1)

    const byNombre = await client.get('/api/v1/materials?search=Hilo').loginAs(user)
    byNombre.assertStatus(200)
    assert.equal(byNombre.body().data.meta.total, 1)
  })

  test('GET /api/v1/materials?low_stock=true filters materials below minimum', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const bajo = await createMaterial({ code: 'LOW-1', minimumStock: '5' })
    const ok = await createMaterial({ code: 'OK-1', minimumStock: '1' })

    await InventoryMovement.create({
      materialId: Number(bajo.id),
      type: 'MANUAL_ADJUSTMENT',
      quantity: '2',
    })
    await InventoryMovement.create({
      materialId: Number(ok.id),
      type: 'MANUAL_ADJUSTMENT',
      quantity: '3',
    })

    const response = await client.get('/api/v1/materials?low_stock=true').loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.meta.total, 1)
    assert.equal(response.body().data.materials[0].code, 'LOW-1')
  })

  test('DELETE /api/v1/materials/:id soft deletes when has movements', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await createMaterial({ code: 'DEL-SOFT' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'MANUAL_ADJUSTMENT',
      quantity: '1',
    })

    const response = await client.delete(`/api/v1/materials/${material.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'soft',
      },
    })

    await material.refresh()
    assert.isFalse(Boolean(material.active))
  })

  test('GET /api/v1/materials?status=out_of_stock filters zero stock', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const sinStock = await createMaterial({ code: 'OUT-1', name: 'Sin stock test' })
    const conStock = await createMaterial({ code: 'IN-1', name: 'Con stock test' })

    await InventoryMovement.create({
      materialId: Number(conStock.id),
      type: 'MANUAL_ADJUSTMENT',
      quantity: '5',
    })

    const response = await client.get('/api/v1/materials?status=out_of_stock').loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.meta.total, 1)
    assert.equal(response.body().data.materials[0].code, 'OUT-1')
    assert.equal(Number(sinStock.id), response.body().data.materials[0].id)
  })

  test('GET /api/v1/materials returns rating and ranking metrics', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await createMaterial({ code: 'RANK-1' })

    await InventoryMovement.create({
      materialId: Number(material.id),
      type: 'ORDER_OUT',
      quantity: '-4',
    })

    const response = await client.get('/api/v1/materials?sort_by=most_used').loginAs(user)

    response.assertStatus(200)
    const item = response.body().data.materials.find((m: { code: string }) => m.code === 'RANK-1')
    assert.exists(item)
    assert.equal(item.usedQty, 4)
    assert.isAbove(item.rating, 0)
  })

  test('PUT /api/v1/materials/:id stores previous purchase price on cost change', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await createMaterial({
      code: 'PRICE-1',
      lastPurchasePriceUsd: '10.0000',
    })

    const response = await client.put(`/api/v1/materials/${material.id}`).loginAs(user).json({
      code: 'PRICE-1',
      name: material.name,
      category: 'FABRIC',
      unit: 'ROL',
      last_purchase_price_usd: 15,
    })

    response.assertStatus(200)
    assert.equal(response.body().data.material.lastPurchasePriceUsd, '15.0000')
    assert.equal(response.body().data.material.previousPurchasePriceUsd, '10.0000')
  })

  test('PUT /api/v1/materials/:id ignores reference price fields', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await createMaterial({ code: 'REF-1' })

    const response = await client.put(`/api/v1/materials/${material.id}`).loginAs(user).json({
      code: 'REF-1',
      name: material.name,
      category: 'FABRIC',
      unit: 'ROL',
      reference_sale_price_usd: 9.99,
      reference_cost_usd: 4.5,
    })

    response.assertStatus(200)
    const body = response.body()
    assert.notProperty(body.data.material, 'referenceSalePriceUsd')
    assert.notProperty(body.data.material, 'referenceCostUsd')

    await material.refresh()
    assert.isNull(material.referenceSalePriceUsd)
    assert.isNull(material.referenceCostUsd)
  })
})
