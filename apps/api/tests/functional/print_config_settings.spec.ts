import User from '#models/user'
import { BUILTIN_FORMAT_IDS, createBuiltinFormats } from '#utils/print_format_defaults'
import { createDefaultStoredPrintConfig } from '#utils/print_config_normalize'
import { resetTestDatabase } from '#tests/helpers/reset_test_database'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

const ADMIN_EMAIL = 'test-print-config@negapos.local'
const VIEW_ONLY_EMAIL = 'view-print-config@negapos.local'
const NO_SETTINGS_EMAIL = 'nosettings-print-config@negapos.local'
const PASSWORD = 'password123'

async function seedUsers() {
  await User.updateOrCreate(
    { email: ADMIN_EMAIL },
    {
      password: PASSWORD,
      name: 'Print Admin',
      role: 'ADMIN',
      active: true,
    }
  )

  await User.updateOrCreate(
    { email: VIEW_ONLY_EMAIL },
    {
      password: PASSWORD,
      name: 'Print Viewer',
      role: 'OPERATOR',
      permissions: ['settings.view'],
      active: true,
    }
  )

  await User.updateOrCreate(
    { email: NO_SETTINGS_EMAIL },
    {
      password: PASSWORD,
      name: 'Sales Only',
      role: 'OPERATOR',
      permissions: ['ventas.view'],
      active: true,
    }
  )
}

function devicesPayload(overrides?: {
  comandaEnabled?: boolean
  deviceName?: string
  printComandaOnConfirm?: boolean
}) {
  const base = createDefaultStoredPrintConfig()
  return {
    scope: 'devices' as const,
    ticket: base.ticket,
    documents: {
      ...base.documents,
      comanda: {
        ...base.documents.comanda,
        enabled: overrides?.comandaEnabled ?? true,
        deviceName: overrides?.deviceName ?? 'Kitchen Printer',
      },
    },
    behavior: {
      ...base.behavior,
      printComandaOnConfirm: overrides?.printComandaOnConfirm ?? true,
    },
    categoryRouting: base.categoryRouting,
  }
}

function formatsPayload(bodyHtml: string) {
  const base = createDefaultStoredPrintConfig()
  const formats = createBuiltinFormats().map((format) =>
    format.id === BUILTIN_FORMAT_IDS.comanda ? { ...format, bodyHtml } : format
  )

  return {
    scope: 'formats' as const,
    formats,
    documents: base.documents,
  }
}

test.group('Print config settings API', (group) => {
  group.setup(async () => {
    await testUtils.db().migrate()
  })

  group.each.setup(async () => {
    await resetTestDatabase()
    await seedUsers()
  })

  test('GET returns defaults with persisted=false when empty', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', ADMIN_EMAIL)

    const response = await client.get('/api/v1/settings/printing').loginAs(user)

    response.assertStatus(200)
    assert.equal(response.body().data.persisted, false)
    assert.equal(response.body().data.print_config.documents.comanda.enabled, false)
    assert.isArray(response.body().data.print_config.formats)
    assert.isAbove(response.body().data.print_config.formats.length, 0)
  })

  test('PUT devices: comanda.enabled=true + deviceName → GET keeps values', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', ADMIN_EMAIL)

    const putResponse = await client
      .put('/api/v1/settings/printing')
      .loginAs(user)
      .json(devicesPayload())

    putResponse.assertStatus(200)
    assert.equal(putResponse.body().data.persisted, true)
    assert.equal(putResponse.body().data.print_config.documents.comanda.enabled, true)
    assert.equal(putResponse.body().data.print_config.documents.comanda.deviceName, 'Kitchen Printer')

    const getResponse = await client.get('/api/v1/settings/printing').loginAs(user)
    getResponse.assertStatus(200)
    assert.equal(getResponse.body().data.persisted, true)
    assert.equal(getResponse.body().data.print_config.documents.comanda.enabled, true)
    assert.equal(getResponse.body().data.print_config.documents.comanda.deviceName, 'Kitchen Printer')
    assert.equal(getResponse.body().data.print_config.behavior.printComandaOnConfirm, true)
  })

  test('PUT formats changes bodyHtml and GET keeps devices', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', ADMIN_EMAIL)
    const customHtml = '<div class="custom-comanda">EDITED</div>'

    await client.put('/api/v1/settings/printing').loginAs(user).json(devicesPayload())

    const formatsResponse = await client
      .put('/api/v1/settings/printing')
      .loginAs(user)
      .json(formatsPayload(customHtml))

    formatsResponse.assertStatus(200)
    const comandaFormat = formatsResponse
      .body()
      .data.print_config.formats.find(
        (format: { id: string }) => format.id === BUILTIN_FORMAT_IDS.comanda
      )
    assert.equal(comandaFormat.bodyHtml, customHtml)
    assert.equal(formatsResponse.body().data.print_config.documents.comanda.enabled, true)
    assert.equal(
      formatsResponse.body().data.print_config.documents.comanda.deviceName,
      'Kitchen Printer'
    )

    const getResponse = await client.get('/api/v1/settings/printing').loginAs(user)
    const storedFormat = getResponse
      .body()
      .data.print_config.formats.find(
        (format: { id: string }) => format.id === BUILTIN_FORMAT_IDS.comanda
      )
    assert.equal(storedFormat.bodyHtml, customHtml)
    assert.equal(getResponse.body().data.print_config.documents.comanda.enabled, true)
  })

  test('PUT devices after formats does not reset bodyHtml', async ({ client, assert }) => {
    const user = await User.findByOrFail('email', ADMIN_EMAIL)
    const customHtml = '<div class="keep-me">KEEP</div>'

    await client.put('/api/v1/settings/printing').loginAs(user).json(formatsPayload(customHtml))
    await client
      .put('/api/v1/settings/printing')
      .loginAs(user)
      .json(devicesPayload({ comandaEnabled: true, deviceName: 'Bar Printer' }))

    const getResponse = await client.get('/api/v1/settings/printing').loginAs(user)
    getResponse.assertStatus(200)

    const storedFormat = getResponse
      .body()
      .data.print_config.formats.find(
        (format: { id: string }) => format.id === BUILTIN_FORMAT_IDS.comanda
      )
    assert.equal(storedFormat.bodyHtml, customHtml)
    assert.equal(getResponse.body().data.print_config.documents.comanda.deviceName, 'Bar Printer')
  })

  test('PUT without settings permission returns 403', async ({ client }) => {
    const user = await User.findByOrFail('email', NO_SETTINGS_EMAIL)

    const response = await client
      .put('/api/v1/settings/printing')
      .loginAs(user)
      .json(devicesPayload())

    response.assertStatus(403)
  })

  test('GET without settings.view returns 403', async ({ client }) => {
    const user = await User.findByOrFail('email', NO_SETTINGS_EMAIL)

    const response = await client.get('/api/v1/settings/printing').loginAs(user)

    response.assertStatus(403)
  })

  test('GET allows settings.view', async ({ client }) => {
    const user = await User.findByOrFail('email', VIEW_ONLY_EMAIL)

    const response = await client.get('/api/v1/settings/printing').loginAs(user)

    response.assertStatus(200)
  })

  test('acceptance checklist: comanda + formatos + anti-pisado + browser save via API', async ({
    client,
    assert,
  }) => {
    const user = await User.findByOrFail('email', ADMIN_EMAIL)
    const customHtml = '<div class="acceptance">CUSTOM HTML</div>'

    // 1) Habilitar comanda + deviceName → “reinicio” (GET fresco) sigue habilitado
    const devicesPut = await client
      .put('/api/v1/settings/printing')
      .loginAs(user)
      .json(devicesPayload({ comandaEnabled: true, deviceName: 'Kitchen Printer' }))
    devicesPut.assertStatus(200)

    const afterRestart1 = await client.get('/api/v1/settings/printing').loginAs(user)
    afterRestart1.assertStatus(200)
    assert.equal(afterRestart1.body().data.print_config.documents.comanda.enabled, true)
    assert.equal(
      afterRestart1.body().data.print_config.documents.comanda.deviceName,
      'Kitchen Printer'
    )
    assert.equal(afterRestart1.body().data.print_config.behavior.printComandaOnConfirm, true)

    // 2) Editar formato + guardar → “reinicio” conserva HTML
    const formatsPut = await client
      .put('/api/v1/settings/printing')
      .loginAs(user)
      .json(formatsPayload(customHtml))
    formatsPut.assertStatus(200)

    const afterRestart2 = await client.get('/api/v1/settings/printing').loginAs(user)
    const formatAfterRestart = afterRestart2
      .body()
      .data.print_config.formats.find(
        (format: { id: string }) => format.id === BUILTIN_FORMAT_IDS.comanda
      )
    assert.equal(formatAfterRestart.bodyHtml, customHtml)

    // 3a) Guardar Ventas (devices) no revierte formatos
    await client
      .put('/api/v1/settings/printing')
      .loginAs(user)
      .json(devicesPayload({ comandaEnabled: true, deviceName: 'Bar Printer' }))

    const afterDevices = await client.get('/api/v1/settings/printing').loginAs(user)
    const formatAfterDevices = afterDevices
      .body()
      .data.print_config.formats.find(
        (format: { id: string }) => format.id === BUILTIN_FORMAT_IDS.comanda
      )
    assert.equal(formatAfterDevices.bodyHtml, customHtml)
    assert.equal(afterDevices.body().data.print_config.documents.comanda.deviceName, 'Bar Printer')

    // 3b) Guardar Formatos no revierte impresoras
    await client
      .put('/api/v1/settings/printing')
      .loginAs(user)
      .json(formatsPayload('<div class="acceptance">V2</div>'))

    const afterFormats = await client.get('/api/v1/settings/printing').loginAs(user)
    assert.equal(afterFormats.body().data.print_config.documents.comanda.enabled, true)
    assert.equal(afterFormats.body().data.print_config.documents.comanda.deviceName, 'Bar Printer')
    assert.equal(afterFormats.body().data.print_config.behavior.printComandaOnConfirm, true)
    const formatV2 = afterFormats
      .body()
      .data.print_config.formats.find(
        (format: { id: string }) => format.id === BUILTIN_FORMAT_IDS.comanda
      )
    assert.equal(formatV2.bodyHtml, '<div class="acceptance">V2</div>')

    // 5) “Navegador”: mismo API sin Electron — GET/PUT funcionan (persisted + business desde profile)
    assert.equal(afterFormats.body().data.persisted, true)
    assert.property(afterFormats.body().data.print_config, 'business')
    assert.property(afterFormats.body().data.print_config.business, 'name')
  })
})
