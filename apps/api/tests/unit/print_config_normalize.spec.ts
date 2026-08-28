import {
  createDefaultStoredPrintConfig,
  mergePrintConfigPatch,
} from '#utils/print_config_normalize'
import { BUILTIN_FORMAT_IDS } from '#utils/print_format_defaults'
import { test } from '@japa/runner'

test.group('print_config_normalize merge', () => {
  test('devices scope updates comanda without wiping formats', ({ assert }) => {
    const current = createDefaultStoredPrintConfig()
    const customHtml = '<div class="custom">comanda</div>'
    current.formats = current.formats.map((format) =>
      format.id === BUILTIN_FORMAT_IDS.comanda ? { ...format, bodyHtml: customHtml } : format
    )

    const next = mergePrintConfigPatch(
      current,
      {
        scope: 'devices',
        documents: {
          ...current.documents,
          comanda: {
            ...current.documents.comanda,
            enabled: true,
            deviceName: 'Kitchen Printer',
          },
        },
        behavior: {
          ...current.behavior,
          printComandaOnConfirm: true,
        },
      },
      'devices'
    )

    assert.isTrue(next.documents.comanda.enabled)
    assert.equal(next.documents.comanda.deviceName, 'Kitchen Printer')
    assert.isTrue(next.behavior.printComandaOnConfirm)
    const comandaFormat = next.formats.find((format) => format.id === BUILTIN_FORMAT_IDS.comanda)
    assert.equal(comandaFormat?.bodyHtml, customHtml)
  })

  test('formats scope updates bodyHtml without wiping device settings', ({ assert }) => {
    const current = createDefaultStoredPrintConfig()
    current.documents.comanda.enabled = true
    current.documents.comanda.deviceName = 'Kitchen Printer'
    current.behavior.printComandaOnConfirm = true

    const customHtml = '<div class="edited">factura</div>'
    const next = mergePrintConfigPatch(
      current,
      {
        scope: 'formats',
        formats: current.formats.map((format) =>
          format.id === BUILTIN_FORMAT_IDS.invoice ? { ...format, bodyHtml: customHtml } : format
        ),
        documents: current.documents,
      },
      'formats'
    )

    assert.isTrue(next.documents.comanda.enabled)
    assert.equal(next.documents.comanda.deviceName, 'Kitchen Printer')
    assert.isTrue(next.behavior.printComandaOnConfirm)
    const invoiceFormat = next.formats.find((format) => format.id === BUILTIN_FORMAT_IDS.invoice)
    assert.equal(invoiceFormat?.bodyHtml, customHtml)
  })
})
