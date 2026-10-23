import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import Material from '#models/material'
import ProductInventoryMovement from '#models/product_inventory_movement'
import User from '#models/user'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { seedTestSale } from '#tests/helpers/seed_test_sale'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-catalog-products@negapos.local'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

test.group('Catalog products API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await db.from('catalog_product_sizes').delete()
    await resetTestDatabase()
    await User.updateOrCreate(
      { email: TEST_EMAIL },
      { password: 'password123', name: 'Admin Catálogo', role: 'ADMIN', active: true }
    )
  })

  test('image upload, download and delete round trip', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const product = await CatalogProduct.create({
      name: 'Gorra con foto',
      category: 'Uniforme',
      salePriceUsd: '8.0000',
      stockQuantity: '1.000',
      active: true,
    })

    const missing = await client.get(`/api/v1/catalog-products/${product.id}/image`).loginAs(user)
    missing.assertStatus(404)

    const upload = await client
      .post(`/api/v1/catalog-products/${product.id}/image`)
      .loginAs(user)
      .file('image', PNG, { filename: 'gorra.png', contentType: 'image/png' })
    upload.assertStatus(200)
    const imagePath = upload.body().data.catalog_product.image_path as string
    assert.match(imagePath, new RegExp(`catalog-products/${product.id}/.+\\.png$`))

    const download = await client.get(`/api/v1/catalog-products/${product.id}/image`).loginAs(user)
    download.assertStatus(200)
    download.assertHeader('content-type', 'image/png')

    const removed = await client
      .delete(`/api/v1/catalog-products/${product.id}/image`)
      .loginAs(user)
    removed.assertStatus(200)
    assert.isNull(removed.body().data.catalog_product.image_path)

    const afterDelete = await client
      .get(`/api/v1/catalog-products/${product.id}/image`)
      .loginAs(user)
    afterDelete.assertStatus(404)
  })

  test('apply profit margin skips missing and costless products and logs the price change', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const withCost = await CatalogProduct.create({
      name: 'Con costo',
      category: 'Uniforme',
      salePriceUsd: '12.0000',
      costUsd: '10.0000',
      stockQuantity: '0',
      active: true,
    })
    const sameResult = await CatalogProduct.create({
      name: 'Ya en precio',
      category: 'Uniforme',
      salePriceUsd: '15.0000',
      costUsd: '10.0000',
      stockQuantity: '0',
      active: true,
    })
    const withoutCost = await CatalogProduct.create({
      name: 'Sin costo',
      category: 'Uniforme',
      salePriceUsd: '5.0000',
      costUsd: '0.0000',
      stockQuantity: '0',
      active: true,
    })

    const response = await client
      .post('/api/v1/catalog-products/apply-profit-margin')
      .loginAs(user)
      .json({
        catalog_product_ids: [
          Number(withCost.id),
          Number(sameResult.id),
          Number(withoutCost.id),
          999999,
        ],
        profit_margin_percent: 50,
      })
    response.assertStatus(200)
    assert.equal(response.body().data.updatedCount, 2)
    assert.deepEqual(response.body().data.skipped, [
      { id: Number(withoutCost.id), name: 'Sin costo', reason: 'NO_COST_PRICE' },
      { id: 999999, name: '#999999', reason: 'NOT_FOUND' },
    ])

    await withCost.refresh()
    assert.equal(withCost.salePriceUsd, '15.0000')
    assert.equal(withCost.previousSalePriceUsd, '12.0000')

    const changes = await ProductInventoryMovement.query().where('type', 'PRICE_CHANGE')
    assert.lengthOf(changes, 1)
    assert.equal(Number(changes[0].catalogProductId), Number(withCost.id))
    assert.equal(changes[0].note, 'Edición de precio: venta $12.0000 → $15.0000 (margen)')
    assert.equal(Number(changes[0].createdByUserId), Number(user.id))
  })

  test('list filters by search, barcode, size stock and kind, sorts by most sold and resolves formula cost', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const material = await Material.create({
      code: 'TELA-COSTO',
      name: 'Tela',
      category: 'Uniforme',
      unit: 'MTS',
      minimumStock: '1',
      lastPurchasePriceUsd: '2.5000',
      active: true,
    })
    const formula = await Formula.create({ name: 'Receta camisa' })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(material.id),
      quantity: '2',
    })

    const shirt = await CatalogProduct.create({
      name: 'Camisa',
      category: 'Uniforme',
      salePriceUsd: '20.0000',
      costUsd: '0.0000',
      formulaId: Number(formula.id),
      stockQuantity: '0',
      active: true,
    })
    const cap = await CatalogProduct.create({
      name: 'Gorra',
      category: 'Uniforme',
      salePriceUsd: '8.0000',
      costUsd: '3.0000',
      supplierCode: 'PROV-GORRA',
      barcode: '7590001112223',
      stockQuantity: '4.000',
      active: true,
    })
    const shoe = await CatalogProduct.create({
      name: 'Zapato',
      category: 'Calzado',
      salePriceUsd: '30.0000',
      costUsd: '12.0000',
      stockQuantity: '2.000',
      active: true,
    })
    await CatalogProductSize.create({
      catalogProductId: Number(shoe.id),
      size: '40',
      stockQuantity: '2.000',
    })
    await CatalogProductSize.create({
      catalogProductId: Number(shoe.id),
      size: '42',
      stockQuantity: '0.000',
    })
    await CatalogProduct.create({
      name: 'Bordado',
      category: 'Servicios',
      salePriceUsd: '4.0000',
      itemKind: 'SERVICE',
      active: true,
    })

    await seedTestSale({
      totalUsd: '24.0000',
      lines: [{ catalogProductId: Number(cap.id), quantity: '3', unitPriceUsd: '8.0000' }],
    })
    await seedTestSale({
      totalUsd: '30.0000',
      lines: [{ catalogProductId: Number(shoe.id), quantity: '1', unitPriceUsd: '30.0000' }],
    })

    async function listProducts(qs: Record<string, string>) {
      const response = await client.get('/api/v1/catalog-products').loginAs(user).qs(qs)
      response.assertStatus(200)
      return response.body().data.catalog_products as Array<{ name: string; cost_usd: string }>
    }

    async function listNames(qs: Record<string, string>) {
      const products = await listProducts(qs)
      return products.map((product) => product.name)
    }

    const all = await listProducts({})
    assert.deepEqual(
      all.map((product) => product.name),
      ['Camisa', 'Gorra', 'Zapato']
    )
    assert.equal(all.find((product) => product.name === 'Camisa')!.cost_usd, '5.0000')
    assert.equal(all.find((product) => product.name === 'Gorra')!.cost_usd, '3.0000')

    assert.deepEqual(await listNames({ search: 'PROV-GORRA' }), ['Gorra'])
    assert.deepEqual(await listNames({ barcode: '7590001112223' }), ['Gorra'])
    assert.deepEqual(await listNames({ size: '40' }), ['Zapato'])
    assert.deepEqual(await listNames({ size: '42' }), [])
    assert.deepEqual(await listNames({ item_kind: 'SERVICE' }), ['Bordado'])
    assert.deepEqual(await listNames({ sort_by: 'most_sold', sort_dir: 'desc' }), [
      'Gorra',
      'Zapato',
      'Camisa',
    ])

    const detail = await client.get(`/api/v1/catalog-products/${shirt.id}`).loginAs(user)
    detail.assertStatus(200)
    assert.equal(detail.body().data.catalog_product.cost_usd, '5.0000')
  })
})
