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
})
