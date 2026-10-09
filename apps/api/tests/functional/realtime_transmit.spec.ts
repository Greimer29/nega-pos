import { test } from '@japa/runner'

test.group('Realtime Transmit', () => {
  test('POST /__transmit/subscribe sin sesión responde 401', async ({ client }) => {
    const response = await client.post('/__transmit/subscribe').json({
      uid: 'test-uid-unauth',
      channel: 'company/1',
    })

    response.assertStatus(401)
  })
})
