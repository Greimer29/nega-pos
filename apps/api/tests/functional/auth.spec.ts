import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { test } from '@japa/runner'

const TEST_EMAIL = 'test-auth@negapos.local'
const TEST_PASSWORD = 'password123'

test.group('Auth API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
    await User.updateOrCreate(
      { email: TEST_EMAIL },
      {
        password: TEST_PASSWORD,
        name: 'Usuario Test',
        role: 'ADMIN',
        active: true,
      }
    )
  })

  group.teardown(async () => {
    await testUtils.db().truncate()
  })

  test('GET /api/v1/csrf returns csrf payload', async ({ client }) => {
    const response = await client.get('/api/v1/csrf')

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        csrf_token: null,
      },
    })
  })

  test('POST /api/v1/auth/login returns user and session cookie', async ({ client, assert }) => {
    const response = await client.post('/api/v1/auth/login').json({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        user: {
          email: TEST_EMAIL,
          name: 'Usuario Test',
          role: 'ADMIN',
          active: true,
        },
      },
    })

    const setCookie = response.headers()['set-cookie']
    assert.isDefined(setCookie)
  })

  test('POST /api/v1/auth/login rejects invalid credentials', async ({ client }) => {
    const response = await client.post('/api/v1/auth/login').json({
      email: TEST_EMAIL,
      password: 'wrong-password',
    })

    response.assertStatus(401)
    response.assertBodyContains({
      error: {
        code: 'INVALID_CREDENTIALS',
      },
    })
  })

  test('GET /api/v1/auth/me returns current user when authenticated', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const response = await client.get('/api/v1/auth/me').loginAs(user)

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        user: {
          email: TEST_EMAIL,
        },
      },
    })
  })

  test('GET /api/v1/auth/me returns 401 without session', async ({ client }) => {
    const response = await client.get('/api/v1/auth/me')
    response.assertStatus(401)
  })

  test('POST /api/v1/auth/logout clears session', async ({ client }) => {
    const user = await User.findByOrFail('email', TEST_EMAIL)

    const logoutResponse = await client.post('/api/v1/auth/logout').loginAs(user)
    logoutResponse.assertStatus(200)

    const meResponse = await client.get('/api/v1/auth/me')
    meResponse.assertStatus(401)
  })

  test('POST /api/v1/auth/login rate limits repeated attempts from same IP', async ({ client }) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await client.post('/api/v1/auth/login').json({
        email: TEST_EMAIL,
        password: 'wrong-password',
      })
    }

    const response = await client.post('/api/v1/auth/login').json({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

    response.assertStatus(429)
    response.assertBodyContains({
      error: {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
      },
    })
  })
})
