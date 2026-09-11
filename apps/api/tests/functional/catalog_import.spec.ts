import CatalogProduct from '#models/catalog_product'
import Category from '#models/category'
import Material from '#models/material'
import User from '#models/user'
import { TEST_MATERIAL_CATEGORY } from '#tests/helpers/test_material_defaults'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { seedReferenceData } from '#tests/helpers/seed_reference_data'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-catalog-import@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Import',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Catalog and materials bulk import', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedReferenceData()
    await seedAdminUser()
  })

  test('POST /catalog-products/import creates products and a missing category', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .post('/api/v1/catalog-products/import')
      .loginAs(user)
      .json({
        item_kind: 'PRODUCT',
        rows: [
          {
            row: 4,
            name: 'Camisa importada',
            category: 'Importados test',
            sale_price_usd: 15,
            cost_usd: 8,
            stock_quantity: 3,
          },
          {
            row: 5,
            name: '',
            category: TEST_MATERIAL_CATEGORY,
            sale_price_usd: 10,
          },
        ],
      })

    response.assertStatus(200)
    const body = response.body().data
    assert.equal(body.created, 1)
    assert.equal(body.failed, 1)

    const product = await CatalogProduct.findByOrFail('name', 'Camisa importada')
    assert.equal(product.itemKind, 'PRODUCT')
    assert.equal(Number(product.salePriceUsd), 15)
    assert.equal(Number(product.stockQuantity), 3)

    const category = await Category.findByOrFail('name', 'Importados test')
    assert.equal(Number(category.active), 1)
  })

  test('POST /catalog-products/import creates services with default category', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .post('/api/v1/catalog-products/import')
      .loginAs(user)
      .json({
        item_kind: 'SERVICE',
        rows: [{ row: 2, name: 'Instalación importada', sale_price_usd: 25 }],
      })

    response.assertStatus(200)
    assert.equal(response.body().data.created, 1)

    const service = await CatalogProduct.findByOrFail('name', 'Instalación importada')
    assert.equal(service.itemKind, 'SERVICE')
    assert.equal(service.category, 'Servicios')
    assert.equal(Number(service.stockQuantity), 0)
  })

  test('POST /materials/import creates materials and skips invalid unit', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client
      .post('/api/v1/materials/import')
      .loginAs(user)
      .json({
        rows: [
          {
            row: 4,
            code: 'IMP-01',
            name: 'Tela importada',
            category: TEST_MATERIAL_CATEGORY,
            unit: 'ROL',
            stock_quantity: 12,
            last_purchase_price_usd: 4.5,
          },
          {
            row: 5,
            code: 'IMP-02',
            name: 'Tela mala unidad',
            category: TEST_MATERIAL_CATEGORY,
            unit: 'LITROS',
          },
        ],
      })

    response.assertStatus(200)
    const body = response.body().data
    assert.equal(body.created, 1)
    assert.equal(body.failed, 1)

    const material = await Material.findByOrFail('code', 'IMP-01')
    assert.equal(material.name, 'Tela importada')
    assert.equal(material.unit, 'ROL')
    assert.isNull(await Material.findBy('code', 'IMP-02'))

    const detail = await client.get(`/api/v1/materials/${material.id}`).loginAs(user)
    detail.assertStatus(200)
    assert.equal(detail.body().data.material.stockActual, 12)
    assert.equal(detail.body().data.material.movimientos[0].type, 'MANUAL_CARGO')
    assert.equal(detail.body().data.material.movimientos[0].note, 'Stock inicial (importación)')
  })
})
