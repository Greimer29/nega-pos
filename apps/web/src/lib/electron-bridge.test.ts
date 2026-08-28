import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getElectronPrintingApi,
  isElectronPrintingAvailable,
} from '@/lib/electron-bridge'

describe('electron-bridge', () => {
  let originalNegaPos: typeof globalThis.window extends undefined
    ? undefined
    : (typeof globalThis.window & { negaPos?: unknown })['negaPos']

  beforeEach(() => {
    originalNegaPos = globalThis.window?.negaPos
  })

  afterEach(() => {
    if (globalThis.window) {
      globalThis.window.negaPos = originalNegaPos
    }
  })

  it('returns false when window.negaPos is missing', () => {
    if (!globalThis.window) {
      expect(isElectronPrintingAvailable()).toBe(false)
      expect(getElectronPrintingApi()).toBeNull()
      return
    }

    globalThis.window.negaPos = undefined
    expect(isElectronPrintingAvailable()).toBe(false)
    expect(getElectronPrintingApi()).toBeNull()
  })

  it('returns the printing API when exposed by Electron preload', () => {
    if (!globalThis.window) {
      expect(getElectronPrintingApi()).toBeNull()
      return
    }

    const mockApi = {
      isAvailable: true as const,
      listPrinters: async () => [],
      getConfig: async () => ({
        business: { name: 'Test', subtitle: '', footer: '' },
        ticket: { station_label: '' },
        formats: [],
        documents: {
          invoice: { enabled: true, deviceName: '', paperWidthMm: 78, formatId: 'builtin-invoice' },
          deliveryNote: {
            enabled: false,
            deviceName: '',
            paperWidthMm: 78,
            formatId: 'builtin-delivery-note',
          },
          comanda: { enabled: false, deviceName: '', paperWidthMm: 78, formatId: 'builtin-comanda' },
        },
        behavior: {
          printInvoiceOnConfirm: true,
          printDeliveryNoteOnConfirm: false,
          printComandaOnConfirm: false,
        },
        categoryRouting: { comanda: { enabled: false, rules: [] } },
      }),
      getLocalConfig: async () => null,
      getConfigPath: async () => 'C:\\Users\\test\\AppData\\Roaming\\desktop\\print-config.json',
      isMigrated: async () => true,
      markMigrated: async () => undefined,
      saveConfig: async (config: Awaited<ReturnType<typeof mockApi.getConfig>>) => config,
      printHtml: async () => undefined,
    }

    globalThis.window.negaPos = { printing: mockApi }
    expect(isElectronPrintingAvailable()).toBe(true)
    expect(getElectronPrintingApi()).toBe(mockApi)
  })
})
