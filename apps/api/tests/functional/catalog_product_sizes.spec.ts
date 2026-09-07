import CatalogProduct from '#models/catalog_product'
import CatalogProductSize from '#models/catalog_product_size'
import Formula from '#models/formula'
import ProductInventoryMovement from '#models/product_inventory_movement'
import User from '#models/user'
import { seedOpenSalesShift } from '#tests/helpers/seed_test_sale'
import { seedReferenceData } from '../helpers/seed_reference_data.js'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-catalog-sizes@negapos.local'
const TEST_PASSWORD = 'password123'

async function resetDatabase() {
  await db.from('sale_lines').delete()
  await db.from('sales').delete()
  await db.from('sales_shifts').delete()
  await db.from('product_inventory_movements').delete()
  await db.from('catalog_product_sizes').delete()
  await db.from('catalog_products').delete()
  await db.from('formulas').delete()
  await db.from('counters').delete()
  await db.from('users').delete()
}

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Sizes',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('Catalog product sizes', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetDatabase()
    await seedReferenceData()
    await seedAdminUser()
    const user = await User.findByOrFail('email', TEST_EMAIL)
    await seedOpenSalesShift(Number(user.id))
  })

  test('create with sizes sets stock sum and has_sizes', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Jean tallas',
      category: 'Uniforme',
      sale_price_usd: 40,
      cost_usd: 20,
      sizes: [
        { size: '38', stock_quantity: 2 },
        { size: '40', stock_quantity: 3 },
      ],
    })

    response.assertStatus(200)
    const product = response.body().data.catalog_product
    assert.isTrue(product.has_sizes)
    assert.equal(Number(product.stock_quantity), 5)
    assert.lengthOf(product.sizes, 2)
    assert.equal(product.sizes[0].size, '38')
  })

  test('create rejects duplicate sizes case-insensitive', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Duplicado',
      category: 'Uniforme',
      sale_price_usd: 10,
      sizes: [
        { size: '38', stock_quantity: 1 },
        { size: '38', stock_quantity: 2 },
      ],
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: { code: 'PRODUCTO_TALLA_DUPLICADA' },
    })
  })

  test('create rejects sizes with formula', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const formula = await Formula.create({ name: 'Fórmula tallas', active: true })

    const response = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Con fórmula y tallas',
      category: 'Uniforme',
      sale_price_usd: 10,
      formula_id: Number(formula.id),
      sizes: [{ size: 'M', stock_quantity: 1 }],
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: { code: 'PRODUCTO_CON_FORMULA_NO_PERMITE_TALLAS' },
    })
  })

  test('PUT /sizes replaces and recalculates stock', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const createResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Replace sizes',
      category: 'Uniforme',
      sale_price_usd: 15,
      sizes: [
        { size: 'S', stock_quantity: 1 },
        { size: 'M', stock_quantity: 1 },
      ],
    })
    createResponse.assertStatus(200)
    const productId = createResponse.body().data.catalog_product.id

    const response = await client
      .put(`/api/v1/catalog-products/${productId}/sizes`)
      .loginAs(user)
      .json({
        sizes: [
          { size: 'L', stock_quantity: 4 },
          { size: 'XL', stock_quantity: 6 },
        ],
      })

    response.assertStatus(200)
    const product = response.body().data.catalog_product
    assert.equal(Number(product.stock_quantity), 10)
    assert.lengthOf(product.sizes, 2)
    assert.equal(product.sizes[0].size, 'L')
  })

  test('list ?size= returns only products with matching size stock > 0', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Con 38',
      category: 'Uniforme',
      sale_price_usd: 10,
      sizes: [
        { size: '38', stock_quantity: 2 },
        { size: '40', stock_quantity: 0 },
      ],
    })

    await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Sin 38 stock',
      category: 'Uniforme',
      sale_price_usd: 10,
      sizes: [{ size: '38', stock_quantity: 0 }],
    })

    await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Sin tallas',
      category: 'Uniforme',
      sale_price_usd: 10,
      stock_quantity: 5,
    })

    const response = await client.get('/api/v1/catalog-products').loginAs(user).qs({ size: '38' })
    response.assertStatus(200)
    const products = response.body().data.catalog_products as Array<{ name: string }>
    assert.lengthOf(products, 1)
    assert.equal(products[0].name, 'Con 38')
  })

  test('confirm sale sized without size returns 422', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const createResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Venta sin talla',
      category: 'Uniforme',
      sale_price_usd: 25,
      sizes: [{ size: '42', stock_quantity: 3 }],
    })
    const productId = createResponse.body().data.catalog_product.id

    const response = await client.post('/api/v1/sales').loginAs(user).json({
      confirm: true,
      guest_name: 'Cliente',
      payment_method_code: 'cash_usd',
      billing_mode: 'FAST',
      payment_type: 'CASH',
      lines: [
        {
          catalog_product_id: productId,
          quantity: 1,
          unit_price_usd: 25,
        },
      ],
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: { code: 'PRODUCTO_TALLA_REQUERIDA' },
    })
  })

  test('confirm sale with size deducts size + global and notes movement', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const createResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Venta con talla',
      category: 'Uniforme',
      sale_price_usd: 30,
      sizes: [
        { size: '38', stock_quantity: 5 },
        { size: '40', stock_quantity: 2 },
      ],
    })
    const product = createResponse.body().data.catalog_product
    const size38 = product.sizes.find((row: { size: string }) => row.size === '38')

    const response = await client.post('/api/v1/sales').loginAs(user).json({
      confirm: true,
      guest_name: 'Cliente talla',
      payment_method_code: 'cash_usd',
      billing_mode: 'FAST',
      payment_type: 'CASH',
      lines: [
        {
          catalog_product_id: product.id,
          catalog_product_size_id: size38.id,
          size: '38',
          quantity: 2,
          unit_price_usd: 30,
        },
      ],
    })

    response.assertStatus(200)
    assert.equal(response.body().data.sale.lines[0].size, '38')
    assert.equal(Number(response.body().data.sale.lines[0].catalog_product_size_id), size38.id)

    const refreshed = await CatalogProduct.findOrFail(product.id)
    assert.equal(Number(refreshed.stockQuantity), 5)

    const sizeRow = await CatalogProductSize.findOrFail(size38.id)
    assert.equal(Number(sizeRow.stockQuantity), 3)

    const movement = await ProductInventoryMovement.query()
      .where('catalogProductId', product.id)
      .where('type', 'SALE_OUT')
      .firstOrFail()
    assert.match(movement.note ?? '', /talla 38/i)
  })

  test('confirm sale without sizes works without size_id', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const createResponse = await client.post('/api/v1/catalog-products').loginAs(user).json({
      name: 'Sin tallas venta',
      category: 'Uniforme',
      sale_price_usd: 12,
      stock_quantity: 4,
    })
    const productId = createResponse.body().data.catalog_product.id

    const response = await client.post('/api/v1/sales').loginAs(user).json({
      confirm: true,
      guest_name: 'Cliente simple',
      payment_method_code: 'cash_usd',
      billing_mode: 'FAST',
      payment_type: 'CASH',
      lines: [
        {
          catalog_product_id: productId,
          quantity: 1,
          unit_price_usd: 12,
        },
      ],
    })

    response.assertStatus(200)
    assert.isNull(response.body().data.sale.lines[0].catalog_product_size_id)
    assert.isNull(response.body().data.sale.lines[0].size)

    const refreshed = await CatalogProduct.findOrFail(productId)
    assert.equal(Number(refreshed.stockQuantity), 3)
  })
})
