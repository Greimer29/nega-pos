import { describe, expect, it } from 'vitest'
import {
  createBlankFormat,
  createBuiltinFormats,
  duplicateFormat,
  normalizeFormats,
  removeFormat,
} from '@/features/printing/utils/print-formats'

describe('print formats CRUD utils', () => {
  it('keeps builtin formats after normalize', () => {
    const normalized = normalizeFormats([])
    expect(normalized).toHaveLength(3)
    expect(normalized.every((format) => format.isBuiltin)).toBe(true)
  })

  it('creates a custom format with unique id', () => {
    const custom = createBlankFormat('invoice')
    expect(custom.isBuiltin).toBe(false)
    expect(custom.documentKind).toBe('invoice')
    expect(custom.bodyHtml.length).toBeGreaterThan(0)
  })

  it('duplicates format with copy suffix', () => {
    const [invoice] = createBuiltinFormats()
    const copy = duplicateFormat(invoice, createBuiltinFormats())
    expect(copy.id).not.toBe(invoice.id)
    expect(copy.name).toContain('copia')
    expect(copy.isBuiltin).toBe(false)
  })

  it('removes only non-builtin formats', () => {
    const builtins = createBuiltinFormats()
    const custom = createBlankFormat('deliveryNote')
    const all = [...builtins, custom]
    const removedCustom = removeFormat(all, custom.id)
    expect(removedCustom.removed).toBe(true)
    expect(removedCustom.formats).toHaveLength(3)

    const removedBuiltin = removeFormat(all, builtins[0].id)
    expect(removedBuiltin.removed).toBe(false)
  })

  it('migrates legacy 80 mm width to 78 mm', () => {
    const [invoice] = createBuiltinFormats()
    const normalized = normalizeFormats([
      { ...invoice, paperWidthMm: 80 },
    ])
    expect(normalized.find((format) => format.id === invoice.id)?.paperWidthMm).toBe(78)
  })

  it('preserves custom edits on builtin invoice formats', () => {
    const [invoice] = createBuiltinFormats()
    const customized = `${invoice.bodyHtml.replace('MESERO:', 'ATENDIDO POR:')}<div>CUSTOM MARKER</div>`
    const normalized = normalizeFormats([{ ...invoice, bodyHtml: customized }])
    const saved = normalized.find((format) => format.id === invoice.id)
    expect(saved?.bodyHtml).toContain('ATENDIDO POR:')
    expect(saved?.bodyHtml).toContain('CUSTOM MARKER')
    expect(saved?.bodyHtml).not.toBe(invoice.bodyHtml)
  })

  it('preserves custom edits on builtin comanda formats without cmd-note', () => {
    const formats = createBuiltinFormats()
    const comanda = formats.find((format) => format.documentKind === 'comanda')!
    const customized = comanda.bodyHtml
      .replaceAll('cmd-note', 'cmd-custom-note')
      .replace('Correlativo de comanda', 'Pedido cocina')
    const normalized = normalizeFormats([{ ...comanda, bodyHtml: customized }])
    const saved = normalized.find((format) => format.id === comanda.id)
    expect(saved?.bodyHtml).toContain('Pedido cocina')
    expect(saved?.bodyHtml).toContain('cmd-custom-note')
    expect(saved?.bodyHtml).not.toContain('cmd-note')
  })

  it('preserves intentionally legacy-looking custom body html', () => {
    const [invoice] = createBuiltinFormats()
    const custom = `<style>.x{}</style><div class="center">VENDEDOR: demo</div><div>CUSTOM KEEP</div>`
    const normalized = normalizeFormats([{ ...invoice, bodyHtml: custom }])
    expect(normalized.find((format) => format.id === invoice.id)?.bodyHtml).toBe(custom)
  })
})
