import Purchase from '#models/purchase'
import Supplier from '#models/supplier'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-suppliers@negapos.local'
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

test.group('Suppliers API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/suppliers requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/suppliers')
    response.assertStatus(401)
  })

  test('POST /api/v1/suppliers creates supplier with normalized RIF and phone', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/suppliers').loginAs(user).json({
      name: 'El Castillo',
      rif: 'J-12345678-9',
      phone: '04128332238',
      email: 'castillo@example.com',
      notes: 'Supplier principal',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        supplier: {
          name: 'El Castillo',
          rif: 'J123456789',
          phone: '+584128332238',
          email: 'castillo@example.com',
          active: true,
        },
      },
    })

    const body = response.body() as { data: { supplier: { id: number } } }
    assert.exists(body.data.supplier.id)
  })

  test('POST /api/v1/suppliers rejects duplicate RIF after normalization', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Supplier.create({
      name: 'Existente',
      rif: 'J123456789',
      active: true,
    })

    const response = await client.post('/api/v1/suppliers').loginAs(user).json({
      name: 'Duplicado',
      rif: 'J-12345678-9',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'RIF_DUPLICADO',
      },
    })
  })

  test('POST /api/v1/suppliers rejects invalid phone', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.post('/api/v1/suppliers').loginAs(user).json({
      name: 'Supplier Mal Tel',
      phone: '123',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      error: {
        code: 'TELEFONO_INVALIDO',
      },
    })
  })

  test('GET /api/v1/suppliers/:id returns supplier', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Supplier Detalle',
      active: true,
    })

    const response = await client.get(`/api/v1/suppliers/${supplier.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        supplier: {
          id: Number(supplier.id),
          name: 'Supplier Detalle',
        },
      },
    })
  })

  test('PUT /api/v1/suppliers/:id updates supplier', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Antes',
      active: true,
    })

    const response = await client.put(`/api/v1/suppliers/${supplier.id}`).loginAs(user).json({
      name: 'Después',
      notes: 'Actualizado',
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        supplier: {
          name: 'Después',
          notes: 'Actualizado',
        },
      },
    })
  })

  test('DELETE /api/v1/suppliers/:id hard deletes when no relations', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Para Borrar',
      active: true,
    })

    const response = await client.delete(`/api/v1/suppliers/${supplier.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'hard',
      },
    })

    const deleted = await Supplier.find(supplier.id)
    assert.isNull(deleted)
  })

  test('DELETE /api/v1/suppliers/:id soft deletes when has purchases', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Con Purchases',
      active: true,
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now(),
      totalBs: '100.00',
      status: 'DRAFT',
    })

    const response = await client.delete(`/api/v1/suppliers/${supplier.id}`).loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        eliminado: true,
        modo: 'soft',
      },
    })

    await supplier.refresh()
    assert.isFalse(Boolean(supplier.active))
  })

  test('GET /api/v1/suppliers lists suppliers with pagination', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    await Supplier.create({ name: 'Listado Alpha', active: true })
    await Supplier.create({ name: 'Listado Beta', active: true })

    const response = await client.get('/api/v1/suppliers?search=Listado').loginAs(user)

    response.assertStatus(200)

    const body = response.body()
    assert.equal(body.data.meta.total, 2)
    assert.lengthOf(body.data.suppliers, 2)
    assert.equal(body.data.suppliers[0].saldoPendienteUsd, '0.0000')
  })

  test('GET /api/v1/suppliers includes pending credit balance per supplier', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({ name: 'Listado Saldo Cred', active: true })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now().minus({ days: 5 }),
      invoiceNumber: 'F-LIST-CRED',
      totalUsd: '90.0000',
      totalBs: '3240.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: DateTime.now().minus({ days: 1 }),
      balanceUsd: '90.0000',
      amountPaidUsd: '0.0000',
    })

    const response = await client.get('/api/v1/suppliers?search=Listado%20Saldo').loginAs(user)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        suppliers: Array<{
          id: number
          saldoPendienteUsd: string
          tieneSaldoVencido: boolean
        }>
      }
    }
    const row = body.data.suppliers.find((item) => item.id === Number(supplier.id))
    assert.exists(row)
    assert.equal(row!.saldoPendienteUsd, '90.0000')
    assert.isTrue(row!.tieneSaldoVencido)
  })

  test('GET /api/v1/suppliers/:id/account-statement lists all purchases for supplier', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const supplier = await Supplier.create({
      name: 'Proveedor Cuenta',
      active: true,
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now().minus({ days: 10 }),
      totalUsd: '10.0000',
      totalBs: '360.00',
      status: 'DRAFT',
      isCredit: false,
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now().minus({ days: 5 }),
      invoiceNumber: 'F-001',
      totalUsd: '25.0000',
      totalBs: '900.00',
      status: 'CONFIRMED',
      isCredit: false,
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now().minus({ days: 3 }),
      invoiceNumber: 'F-CRED',
      totalUsd: '50.0000',
      totalBs: '1800.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: DateTime.now().plus({ days: 15 }),
      balanceUsd: '50.0000',
      amountPaidUsd: '0.0000',
    })

    await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now().minus({ days: 1 }),
      invoiceNumber: 'F-VOID',
      totalUsd: '15.0000',
      totalBs: '540.00',
      status: 'VOIDED',
      isCredit: false,
    })

    const response = await client
      .get(`/api/v1/suppliers/${supplier.id}/account-statement`)
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        purchases: Array<{ status: string; isCredit: boolean }>
        saldoPendienteUsd: string
      }
    }

    assert.lengthOf(body.data.purchases, 4)
    assert.exists(body.data.purchases.find((purchase) => purchase.status === 'DRAFT'))
    assert.exists(body.data.purchases.find((purchase) => purchase.status === 'VOIDED'))
    assert.exists(
      body.data.purchases.find((purchase) => purchase.status === 'CONFIRMED' && !purchase.isCredit)
    )
    assert.exists(
      body.data.purchases.find((purchase) => purchase.status === 'CONFIRMED' && purchase.isCredit)
    )
    assert.equal(body.data.saldoPendienteUsd, '50.0000')
  })

  test('POST /api/v1/suppliers/:id/payments rejects overpayment on specific purchase', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const supplier = await Supplier.create({
      name: 'Proveedor Sobrepago',
      active: true,
    })

    const purchase = await Purchase.create({
      supplierId: supplier.id,
      date: DateTime.now().minus({ days: 2 }),
      invoiceNumber: 'F-SOBRE',
      totalUsd: '10.0000',
      totalBs: '360.00',
      status: 'CONFIRMED',
      isCredit: true,
      creditDueDate: DateTime.fromISO('2026-06-20'),
      balanceUsd: '10.0000',
      amountPaidUsd: '0.0000',
    })

    const response = await client
      .post(`/api/v1/suppliers/${supplier.id}/payments`)
      .loginAs(user)
      .json({
        purchase_id: purchase.id,
        account_id: null,
        amount_usd: 15,
        date: '2026-06-20',
      })

    response.assertStatus(422)
    assert.equal(response.body().error.code, 'PAGO_PROVEEDOR_EXCEDE_SALDO')

    await purchase.refresh()
    assert.equal(purchase.balanceUsd, '10.0000')
    assert.equal(purchase.amountPaidUsd, '0.0000')
  })
})
