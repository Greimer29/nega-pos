import CatalogProduct from '#models/catalog_product'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import InventoryMovement from '#models/inventory_movement'
import Machine from '#models/machine'
import Material from '#models/material'
import ProductInventoryMovement from '#models/product_inventory_movement'
import Purchase from '#models/purchase'
import Supplier from '#models/supplier'
import User from '#models/user'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { nowInAppZone } from '#utils/app_timezone'

const TEST_EMAIL = 'test-purchases-inventory-balance@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    { password: TEST_PASSWORD, name: 'Admin Compras', role: 'ADMIN', active: true }
  )
}

async function materialStock(materialId: number) {
  const result = await InventoryMovement.query()
    .where('materialId', materialId)
    .sum('quantity as total')
    .first()
  return Number(result?.$extras.total ?? 0)
}

test.group('Purchases inventory and balance', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  async function createDraft(client: any, user: User, supplierId: number | null) {
    const response = await client
      .post('/api/v1/purchases')
      .loginAs(user)
      .json({
        ...(supplierId ? { supplier_id: supplierId } : {}),
        date: '2026-10-15',
        invoice_number: `F-${Date.now()}`,
      })
    response.assertStatus(200)
    return Number(response.body().data.purchase.id)
  }

  async function addItem(client: any, user: User, purchaseId: number, item: object) {
    const response = await client
      .post(`/api/v1/purchases/${purchaseId}/items`)
      .loginAs(user)
      .json(item)
    response.assertStatus(200)
  }

  test('cash purchase marks the total as paid and leaves no payable', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Contado SA', rif: 'J000000001', active: true })
    const material = await Material.create({
      code: 'CONT-1',
      name: 'Hilo contado',
      category: 'Uniforme',
      unit: 'ROL',
      minimumStock: '1',
      active: true,
    })

    const purchaseId = await createDraft(client, user, Number(supplier.id))
    await addItem(client, user, purchaseId, {
      material_id: Number(material.id),
      quantity: 4,
      unit_price_usd: 2.5,
    })

    const confirm = await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .json({ is_credit: false })
    confirm.assertStatus(200)

    const purchase = await Purchase.findOrFail(purchaseId)
    assert.equal(purchase.status, 'CONFIRMED')
    assert.isFalse(Boolean(purchase.isCredit))
    assert.equal(purchase.totalUsd, '10.0000')
    assert.equal(purchase.amountPaidUsd, '10.0000')
    assert.equal(purchase.balanceUsd, '0.0000')
    assert.isNull(purchase.creditDueDate)
    assert.equal(await materialStock(Number(material.id)), 4)
  })

  test('credit purchase keeps the total payable with the explicit due date', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Crédito SA', rif: 'J000000002', active: true })
    const material = await Material.create({
      code: 'CRED-1',
      name: 'Tela crédito',
      category: 'Uniforme',
      unit: 'MTS',
      minimumStock: '1',
      active: true,
    })

    const purchaseId = await createDraft(client, user, Number(supplier.id))
    await addItem(client, user, purchaseId, {
      material_id: Number(material.id),
      quantity: 10,
      unit_price_usd: 3,
    })

    const confirm = await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .json({ is_credit: true, credit_due_date: '2026-11-15' })
    confirm.assertStatus(200)

    const purchase = await Purchase.findOrFail(purchaseId)
    assert.isTrue(Boolean(purchase.isCredit))
    assert.equal(purchase.balanceUsd, '30.0000')
    assert.equal(purchase.amountPaidUsd, '0.0000')
    assert.equal(purchase.creditDueDate?.toISODate(), '2026-11-15')
  })

  test('credit purchase without due date uses supplier credit days on the Caracas calendar', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Plazo 15',
      rif: 'J000000003',
      creditDays: 15,
      active: true,
    })
    const material = await Material.create({
      code: 'PLAZO-1',
      name: 'Botones',
      category: 'Uniforme',
      unit: 'UND',
      minimumStock: '1',
      active: true,
    })

    const purchaseId = await createDraft(client, user, Number(supplier.id))
    await addItem(client, user, purchaseId, {
      material_id: Number(material.id),
      quantity: 100,
      unit_price_usd: 0.1,
    })

    const confirm = await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .json({ is_credit: true })
    confirm.assertStatus(200)

    const purchase = await Purchase.findOrFail(purchaseId)
    assert.isTrue(Boolean(purchase.isCredit))
    assert.equal(purchase.creditDueDate?.toISODate(), nowInAppZone().plus({ days: 15 }).toISODate())
    assert.equal(purchase.balanceUsd, '10.0000')
  })

  test('credit purchase without due date nor supplier credit days rolls back', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Sin plazo', rif: 'J000000004', active: true })
    const material = await Material.create({
      code: 'SINPLAZO-1',
      name: 'Cierres',
      category: 'Uniforme',
      unit: 'UND',
      minimumStock: '1',
      active: true,
    })

    const purchaseId = await createDraft(client, user, Number(supplier.id))
    await addItem(client, user, purchaseId, {
      material_id: Number(material.id),
      quantity: 5,
      unit_price_usd: 1,
    })

    const confirm = await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .json({ is_credit: true })
    confirm.assertStatus(422)

    const purchase = await Purchase.findOrFail(purchaseId)
    assert.equal(purchase.status, 'DRAFT')
    assert.equal(await materialStock(Number(material.id)), 0)
  })

  test('product and wholesale material purchase enters stock and costs, return reverses it', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Mayorista', rif: 'J000000005', active: true })
    const product = await CatalogProduct.create({
      name: 'Gorra',
      category: 'Uniforme',
      salePriceUsd: '12.0000',
      costUsd: '5.0000',
      stockQuantity: '2.000',
      active: true,
    })
    const material = await Material.create({
      code: 'PACK-1',
      name: 'Cinta por paquete',
      category: 'Uniforme',
      unit: 'UND',
      minimumStock: '1',
      active: true,
      lastPurchasePriceUsd: '0.5000',
      wholesaleEnabled: true,
      wholesaleUnitsPerPack: '12.000',
      wholesaleCostUsd: '5.0000',
      wholesaleSalePriceUsd: '9.0000',
    })

    const purchaseId = await createDraft(client, user, Number(supplier.id))
    await addItem(client, user, purchaseId, {
      catalog_product_id: Number(product.id),
      quantity: 3,
      unit_price_usd: 6,
    })
    await addItem(client, user, purchaseId, {
      material_id: Number(material.id),
      quantity: 2,
      unit_price_usd: 6,
      is_wholesale: true,
    })

    const confirm = await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .json({})
    confirm.assertStatus(200)

    await product.refresh()
    assert.equal(product.stockQuantity, '5.000')
    assert.equal(product.costUsd, '6.0000')

    await material.refresh()
    assert.equal(await materialStock(Number(material.id)), 24)
    assert.equal(material.wholesaleCostUsd, '6.0000')
    assert.equal(material.lastPurchasePriceUsd, '0.5000')
    assert.equal(material.lastPurchaseDate?.toISODate(), '2026-10-15')

    const productIn = await ProductInventoryMovement.query()
      .where('catalogProductId', Number(product.id))
      .where('type', 'PURCHASE_IN')
      .firstOrFail()
    assert.equal(productIn.note, `Compra #${purchaseId}`)

    const returned = await client.post(`/api/v1/purchases/${purchaseId}/return`).loginAs(user)
    returned.assertStatus(200)

    await product.refresh()
    assert.equal(product.stockQuantity, '2.000')
    assert.equal(await materialStock(Number(material.id)), 0)

    const materialReversal = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .where('type', 'REVERSAL_ADJUSTMENT')
      .firstOrFail()
    assert.equal(materialReversal.quantity, '-24.000')
    assert.equal(materialReversal.note, `Devolución compra #${purchaseId}`)

    const purchase = await Purchase.findOrFail(purchaseId)
    assert.equal(purchase.status, 'VOIDED')
    assert.equal(purchase.balanceUsd, '0.0000')
  })

  test('return is blocked when a purchased product was already sold', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Bloqueo', rif: 'J000000006', active: true })
    const product = await CatalogProduct.create({
      name: 'Chaqueta',
      category: 'Uniforme',
      salePriceUsd: '40.0000',
      stockQuantity: '0.000',
      active: true,
    })

    const purchaseId = await createDraft(client, user, Number(supplier.id))
    await addItem(client, user, purchaseId, {
      catalog_product_id: Number(product.id),
      quantity: 4,
      unit_price_usd: 20,
    })
    await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .json({})
      .then((response: any) => response.assertStatus(200))

    await CatalogProduct.query().where('id', Number(product.id)).update({ stockQuantity: '1.000' })

    const returned = await client.post(`/api/v1/purchases/${purchaseId}/return`).loginAs(user)
    returned.assertStatus(422)
    assert.equal(returned.body().error.code, 'INSUFFICIENT_STOCK_FOR_RETURN')
    assert.equal(returned.body().error.details[0].material_id, Number(product.id))

    const purchase = await Purchase.findOrFail(purchaseId)
    assert.equal(purchase.status, 'CONFIRMED')
    const reversals = await ProductInventoryMovement.query().where('type', 'REVERSAL_ADJUSTMENT')
    assert.lengthOf(reversals, 0)
  })

  test('material purchase recalculates formula product cost and warns once per product', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Insumos', rif: 'J000000007', active: true })
    const materialA = await Material.create({
      code: 'FORM-A',
      name: 'Insumo A',
      category: 'Uniforme',
      unit: 'UND',
      minimumStock: '1',
      active: true,
      lastPurchasePriceUsd: '4.0000',
    })
    const materialB = await Material.create({
      code: 'FORM-B',
      name: 'Insumo B',
      category: 'Uniforme',
      unit: 'UND',
      minimumStock: '1',
      active: true,
      lastPurchasePriceUsd: '3.0000',
    })
    const formula = await Formula.create({ name: 'Receta costo' })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(materialA.id),
      quantity: '2',
    })
    await FormulaMaterial.create({
      formulaId: Number(formula.id),
      materialId: Number(materialB.id),
      quantity: '1',
    })
    const product = await CatalogProduct.create({
      name: 'Producto con receta',
      category: 'Uniforme',
      salePriceUsd: '10.0000',
      formulaId: Number(formula.id),
      active: true,
    })

    const purchaseId = await createDraft(client, user, Number(supplier.id))
    await addItem(client, user, purchaseId, {
      material_id: Number(materialA.id),
      quantity: 1,
      unit_price_usd: 4,
    })
    await addItem(client, user, purchaseId, {
      material_id: Number(materialB.id),
      quantity: 1,
      unit_price_usd: 3,
    })

    const confirm = await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .json({})
    confirm.assertStatus(200)

    const warnings = confirm.body().data.cost_warnings as Array<{
      product_id: number
      cost_usd: string
    }>
    assert.lengthOf(warnings, 1)
    assert.equal(warnings[0].product_id, Number(product.id))
    assert.equal(warnings[0].cost_usd, '11.0000')

    await product.refresh()
    assert.equal(product.costUsd, '11.0000')
  })

  test('machine purchase sets acquisition cost and return clears it', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Máquinas', rif: 'J000000008', active: true })

    const purchaseId = await createDraft(client, user, Number(supplier.id))
    await addItem(client, user, purchaseId, {
      new_machine: { name: 'Recta', type: 'RECTA' },
      quantity: 1,
      unit_price_usd: 350,
    })

    const confirm = await client
      .post(`/api/v1/purchases/${purchaseId}/confirm`)
      .loginAs(user)
      .json({})
    confirm.assertStatus(200)

    const machine = await Machine.query().where('name', 'Recta').firstOrFail()
    assert.equal(machine.acquisitionCost, '350.00')
    assert.equal(machine.amountPaidUsd, '350.0000')
    assert.equal(machine.balanceUsd, '0.0000')
    assert.equal(machine.acquisitionDate?.toISODate(), '2026-10-15')

    const purchase = await Purchase.findOrFail(purchaseId)
    assert.equal(purchase.totalUsd, '350.0000')

    const returned = await client.post(`/api/v1/purchases/${purchaseId}/return`).loginAs(user)
    returned.assertStatus(200)

    await machine.refresh()
    assert.isNull(machine.acquisitionCost)
    assert.equal(machine.amountPaidUsd, '0.0000')
  })
})
