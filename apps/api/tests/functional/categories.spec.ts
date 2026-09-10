import Category from '#models/category'
import Material from '#models/material'
import User from '#models/user'
import { seedReferenceData } from '../helpers/seed_reference_data.js'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

const SETTINGS_EMAIL = 'settings-categories@negapos.local'
const VIEW_ONLY_EMAIL = 'view-categories@negapos.local'

test.group('Categories API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await db.from('sale_lines').delete()
    await db.from('sales').delete()
    await db.from('catalog_products').delete()
    await db.from('categories').delete()
    await db.from('sales_shifts').delete()
    await db.from('users').delete()
    await seedReferenceData()

    await User.create({
      email: SETTINGS_EMAIL,
      password: 'password123',
      name: 'Settings Editor',
      role: 'OPERATOR',
      permissions: ['settings.view', 'settings.edit'],
      active: true,
    })

    await User.create({
      email: VIEW_ONLY_EMAIL,
      password: 'password123',
      name: 'Settings Viewer',
      role: 'OPERATOR',
      permissions: ['settings.view'],
      active: true,
    })
  })

  test('GET categories allows settings.view without catalog.view', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', VIEW_ONLY_EMAIL)

    const response = await client.get('/api/v1/categories').loginAs(user)

    response.assertStatus(200)
    assert.isAbove(response.body().data.categories.length, 0)
  })

  test('PUT category allows settings.edit without catalog.edit', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', SETTINGS_EMAIL)
    const category = await Category.findByOrFail('name', 'Uniforme')

    const response = await client
      .put(`/api/v1/categories/${category.id}`)
      .loginAs(user)
      .json({ name: 'Uniformes', sort_order: 1 })

    response.assertStatus(200)
    assert.equal(response.body().data.category.name, 'Uniformes')

    await category.refresh()
    assert.equal(category.name, 'Uniformes')
  })

  test('PUT category rejects user with only settings.view', async ({ client }) => {
    const user = await User.findByOrFail('email', VIEW_ONLY_EMAIL)
    const category = await Category.findByOrFail('name', 'Uniforme')

    const response = await client
      .put(`/api/v1/categories/${category.id}`)
      .loginAs(user)
      .json({ name: 'Bloqueado', sort_order: 1 })

    response.assertStatus(403)
  })

  test('DELETE category rejects when materials use it', async ({ client }) => {
    const user = await User.findByOrFail('email', SETTINGS_EMAIL)
    const category = await Category.findByOrFail('name', 'Uniforme')

    await Material.create({
      code: 'MAT-CAT-BLOCK',
      name: 'Material bloqueo categoría',
      category: category.name,
      unit: 'UND',
      minimumStock: '1',
      active: true,
    })

    const response = await client.delete(`/api/v1/categories/${category.id}`).loginAs(user)

    response.assertStatus(409)
  })
})
