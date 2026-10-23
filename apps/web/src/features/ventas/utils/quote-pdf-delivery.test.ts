import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ElectronBridge } from '@/lib/electron-bridge'

const isNativePlatform = vi.fn(() => false)
const writeFile = vi.fn()
const share = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: (...args: unknown[]) => writeFile(...args) },
}))
vi.mock('@capacitor/share', () => ({
  Share: { share: (...args: unknown[]) => share(...args) },
}))

import {
  blobToBase64,
  deliverQuotePdf,
  isShareCancelled,
  quoteDeliveryTarget,
} from './quote-pdf-delivery'

const pdf = () => new Blob(['%PDF-1.7 demo'], { type: 'application/pdf' })

function setDesktopBridge(bridge: Partial<ElectronBridge> | undefined) {
  ;(globalThis.window as { negaPos?: unknown }).negaPos = bridge
}

beforeEach(() => {
  vi.stubGlobal('window', {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  isNativePlatform.mockReset().mockReturnValue(false)
  writeFile.mockReset()
  share.mockReset()
})

describe('quoteDeliveryTarget', () => {
  it('prefers the Android share sheet, then the desktop app, then the browser', () => {
    expect(quoteDeliveryTarget()).toBe('browser')

    setDesktopBridge({ files: { isAvailable: true, saveQuotePdf: vi.fn() } })
    expect(quoteDeliveryTarget()).toBe('desktop')

    isNativePlatform.mockReturnValue(true)
    expect(quoteDeliveryTarget()).toBe('android')
  })
})

describe('blobToBase64', () => {
  it('encodes the PDF bytes', async () => {
    expect(await blobToBase64(pdf())).toBe(btoa('%PDF-1.7 demo'))
  })
})

describe('isShareCancelled', () => {
  it('recognises the plugin cancel error only', () => {
    expect(isShareCancelled(new Error('Share canceled'))).toBe(true)
    expect(isShareCancelled(new Error('No apps available'))).toBe(false)
  })
})

describe('deliverQuotePdf', () => {
  it('writes the PDF to the cache and opens the Android share sheet', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({ uri: 'file:///cache/Presupuesto-25.pdf' })
    share.mockResolvedValue({})

    const result = await deliverQuotePdf(pdf(), 'Presupuesto-25.pdf')

    expect(result).toEqual({ kind: 'shared' })
    expect(writeFile).toHaveBeenCalledWith({
      path: 'Presupuesto-25.pdf',
      data: btoa('%PDF-1.7 demo'),
      directory: 'CACHE',
    })
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ['file:///cache/Presupuesto-25.pdf'] })
    )
  })

  it('reports a cancelled share without failing', async () => {
    isNativePlatform.mockReturnValue(true)
    writeFile.mockResolvedValue({ uri: 'file:///cache/p.pdf' })
    share.mockRejectedValue(new Error('Share canceled'))

    expect(await deliverQuotePdf(pdf(), 'p.pdf')).toEqual({ kind: 'cancelled' })
  })

  it('saves through the desktop bridge', async () => {
    const saveQuotePdf = vi.fn().mockResolvedValue({
      path: 'C:\\Users\\a\\Downloads\\Presupuestos\\Presupuesto-25.pdf',
      fileName: 'Presupuesto-25.pdf',
    })
    setDesktopBridge({ files: { isAvailable: true, saveQuotePdf } })

    const result = await deliverQuotePdf(pdf(), 'Presupuesto-25.pdf')

    expect(result).toEqual({
      kind: 'saved',
      path: 'C:\\Users\\a\\Downloads\\Presupuestos\\Presupuesto-25.pdf',
    })
    const [name, bytes] = saveQuotePdf.mock.calls[0] as [string, Uint8Array]
    expect(name).toBe('Presupuesto-25.pdf')
    expect(new TextDecoder().decode(bytes)).toBe('%PDF-1.7 demo')
  })
})
