import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-app-updates@negapos.local'
const TEST_PASSWORD = 'password123'

async function seedAdminUser() {
  await User.updateOrCreate(
    { email: TEST_EMAIL },
    {
      password: TEST_PASSWORD,
      name: 'Admin Updates',
      role: 'ADMIN',
      active: true,
    }
  )
}

test.group('App updates API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedAdminUser()
  })

  test('GET /api/v1/app-updates/latest requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/app-updates/latest')
    response.assertStatus(401)
  })

  test('GET /api/v1/app-updates/latest without GitHub token returns 503', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)
    const response = await client
      .get('/api/v1/app-updates/latest')
      .qs({ current: '1.2.1' })
      .loginAs(user)

    response.assertStatus(503)
    assert.equal(response.body().error.code, 'APP_UPDATES_NO_CONFIGURADO')
  })
})
