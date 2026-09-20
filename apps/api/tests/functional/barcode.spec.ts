import CatalogProduct from '#models/catalog_product'
import Material from '#models/material'
import User from '#models/user'
import { TEST_MATERIAL_CATEGORY } from '#tests/helpers/test_material_defaults'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { seedReferenceData } from '#tests/helpers/seed_reference_data'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-barcode@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Barcode',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Barcode on catalog products and materials', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedReferenceData()
    await seedAdminUser()
  })

  test('POST product with barcode and GET list filters by exact barcode', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const create = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Producto con barras',
      category: TEST_MATERIAL_CATEGORY,
      sale_price_usd: 10,
      cost_usd: 4,
      barcode: ' 7790001234567 ',
    })

    create.assertStatus(200)
    assert.equal(create.body().data.catalog_product.barcode, '7790001234567')

    const found = await client
      .get('/api/v1/catalog-products')
      .qs({ barcode: '7790001234567' })
      .loginAs(user)

    found.assertStatus(200)
    assert.equal(found.body().data.catalog_products.length, 1)
    assert.equal(found.body().data.catalog_products[0].name, 'Producto con barras')

    const miss = await client
      .get('/api/v1/catalog-products')
      .qs({ barcode: '0000000000000' })
      .loginAs(user)

    miss.assertStatus(200)
    assert.equal(miss.body().data.catalog_products.length, 0)
  })

  test('duplicate product barcode returns 422', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await client
      .post('/api/v1/catalog-products')
      .loginAs(user)
      .json({
        name: 'Primero',
        category: TEST_MATERIAL_CATEGORY,
        sale_price_usd: 10,
        barcode: 'DUP-BAR-001',
      })
      .then((r) => r.assertStatus(200))

    const dup = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Segundo',
      category: TEST_MATERIAL_CATEGORY,
      sale_price_usd: 12,
      barcode: 'DUP-BAR-001',
    })

    dup.assertStatus(422)
    assert.equal(dup.body().error.code, 'BARCODE_DUPLICADO')
  })

  test('SERVICE ignores barcode on create', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Servicio sin barras',
      category: 'Servicios',
      item_kind: 'SERVICE',
      sale_price_usd: 20,
      barcode: 'SHOULD-IGNORE',
    })

    response.assertStatus(200)
    assert.isNull(response.body().data.catalog_product.barcode)

    const product = await CatalogProduct.findByOrFail('name', 'Servicio sin barras')
    assert.isNull(product.barcode)
  })

  test('POST material with barcode and GET list filters by exact barcode', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const create = await client.post('/api/v1/materials').loginAs(user).json({
      code: 'MAT-BC-1',
      name: 'Material con barras',
      category: TEST_MATERIAL_CATEGORY,
      unit: 'UND',
      barcode: 'MATBARCODE99',
    })

    create.assertStatus(200)
    assert.equal(create.body().data.material.barcode, 'MATBARCODE99')

    const found = await client
      .get('/api/v1/materials')
      .qs({ barcode: 'MATBARCODE99' })
      .loginAs(user)

    found.assertStatus(200)
    assert.equal(found.body().data.materials.length, 1)
    assert.equal(found.body().data.materials[0].code, 'MAT-BC-1')
  })

  test('duplicate material barcode returns 422', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await client
      .post('/api/v1/materials')
      .loginAs(user)
      .json({
        code: 'MAT-A',
        name: 'Mat A',
        category: TEST_MATERIAL_CATEGORY,
        unit: 'UND',
        barcode: 'SAME-MAT-BC',
      })
      .then((r) => r.assertStatus(200))

    const dup = await client.post('/api/v1/materials').loginAs(user).json({
      code: 'MAT-B',
      name: 'Mat B',
      category: TEST_MATERIAL_CATEGORY,
      unit: 'UND',
      barcode: 'SAME-MAT-BC',
    })

    dup.assertStatus(422)
    assert.equal(dup.body().error.code, 'BARCODE_DUPLICADO')
  })

  test('import product and material with barcode column', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const productImport = await client
      .post('/api/v1/catalog-products/import')
      .loginAs(user)
      .json({
        item_kind: 'PRODUCT',
        rows: [
          {
            row: 4,
            name: 'Import barcode',
            category: TEST_MATERIAL_CATEGORY,
            sale_price_usd: 9,
            barcode: 'IMP-PROD-BC',
          },
        ],
      })

    productImport.assertStatus(200)
    assert.equal(productImport.body().data.created, 1)
    const product = await CatalogProduct.findByOrFail('name', 'Import barcode')
    assert.equal(product.barcode, 'IMP-PROD-BC')

    const materialImport = await client
      .post('/api/v1/materials/import')
      .loginAs(user)
      .json({
        rows: [
          {
            row: 4,
            code: 'IMP-BC-M',
            name: 'Material import BC',
            category: TEST_MATERIAL_CATEGORY,
            unit: 'UND',
            barcode: 'IMP-MAT-BC',
          },
        ],
      })

    materialImport.assertStatus(200)
    assert.equal(materialImport.body().data.created, 1)
    const material = await Material.findByOrFail('code', 'IMP-BC-M')
    assert.equal(material.barcode, 'IMP-MAT-BC')
  })

  test('POST product with supplier_code and GET list search matches it', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const create = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Producto con referencia',
      category: TEST_MATERIAL_CATEGORY,
      sale_price_usd: 10,
      cost_usd: 4,
      supplier_code: '  PROV-88  ',
    })

    create.assertStatus(200)
    assert.equal(create.body().data.catalog_product.supplier_code, 'PROV-88')

    const found = await client
      .get('/api/v1/catalog-products')
      .qs({ search: 'PROV-88' })
      .loginAs(user)

    found.assertStatus(200)
    assert.equal(found.body().data.meta.total, 1)
    assert.equal(found.body().data.catalog_products[0].name, 'Producto con referencia')
  })
})
