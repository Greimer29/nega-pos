import { describe, expect, it } from 'vitest'
import type { PrintConfig } from '@/features/printing/types'
import { DEFAULT_PRINT_CONFIG } from '@/features/printing/types'
import { BUILTIN_FORMAT_IDS } from '@/features/printing/utils/print-format-defaults'

/**
 * Mirrors use-print-settings-panel buildSavePayload — ensures Ventas/Formatos
 * scopes only send the fields the API merge expects.
 */
function buildSavePayload(scope: 'formats' | 'devices', draft: PrintConfig) {
  if (scope === 'formats') {
    return {
      scope: 'formats' as const,
      formats: draft.formats,
      documents: draft.documents,
    }
  }

  return {
    scope: 'devices' as const,
    ticket: draft.ticket,
    documents: draft.documents,
    behavior: draft.behavior,
    categoryRouting: draft.categoryRouting,
  }
}

describe('print settings save scopes (web)', () => {
  it('devices payload does not include formats', () => {
    const draft: PrintConfig = {
      ...structuredClone(DEFAULT_PRINT_CONFIG),
      documents: {
        ...DEFAULT_PRINT_CONFIG.documents,
        comanda: {
          ...DEFAULT_PRINT_CONFIG.documents.comanda,
          enabled: true,
          deviceName: 'Kitchen',
        },
      },
      behavior: {
        ...DEFAULT_PRINT_CONFIG.behavior,
        printComandaOnConfirm: true,
      },
    }

    const payload = buildSavePayload('devices', draft)
    expect(payload.scope).toBe('devices')
    expect(payload).not.toHaveProperty('formats')
    expect(payload.documents?.comanda.enabled).toBe(true)
    expect(payload.documents?.comanda.deviceName).toBe('Kitchen')
    expect(payload.behavior?.printComandaOnConfirm).toBe(true)
  })

  it('formats payload includes formats and documents but not behavior', () => {
    const draft = structuredClone(DEFAULT_PRINT_CONFIG)
    draft.formats = draft.formats.map((format) =>
      format.id === BUILTIN_FORMAT_IDS.comanda
        ? { ...format, bodyHtml: '<div>custom</div>' }
        : format
    )

    const payload = buildSavePayload('formats', draft)
    expect(payload.scope).toBe('formats')
    expect(payload).not.toHaveProperty('behavior')
    expect(payload).not.toHaveProperty('ticket')
    expect(payload.formats?.find((f) => f.id === BUILTIN_FORMAT_IDS.comanda)?.bodyHtml).toBe(
      '<div>custom</div>'
    )
  })
})
