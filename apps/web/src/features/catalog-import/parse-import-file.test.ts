import { describe, expect, it } from 'vitest'
import { getImportColumns } from '@/features/catalog-import/columns'
import { buildImportTemplateXml } from '@/features/catalog-import/export-import-template'
import {
  normalizeImportHeader,
  parseImportNumber,
  parseImportText,
} from '@/features/catalog-import/parse-import-file'

describe('normalizeImportHeader', () => {
  it('strips accents, asterisks and spaces', () => {
    expect(normalizeImportHeader('categoría*')).toBe('categoria')
    expect(normalizeImportHeader('Precio venta')).toBe('precio_venta')
  })
})

describe('parseImportNumber', () => {
  it('parses decimal comma used in Venezuela', () => {
    expect(parseImportNumber('12,50')).toBe(12.5)
    expect(parseImportNumber('1.234,56')).toBe(1234.56)
  })

  it('parses dotted decimals', () => {
    expect(parseImportNumber('15.00')).toBe(15)
  })
})

describe('parseImportText', () => {
  it('parses a semicolon CSV of products', () => {
    const csv = [
      'nombre*;categoria*;precio_venta*;descripcion;unidad;costo;stock;stock_minimo',
      'Camisa polo;Uniforme;15,5;Algodón;UND;8;10;2',
    ].join('\n')

    const parsed = parseImportText(csv, 'PRODUCT')
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]).toMatchObject({
      row: 2,
      name: 'Camisa polo',
      category: 'Uniforme',
      sale_price_usd: 15.5,
      sale_unit: 'UND',
      cost_usd: 8,
      stock_quantity: 10,
      minimum_stock: 2,
    })
  })

  it('skips the hint row from the generated template', () => {
    const columns = getImportColumns('PRODUCT')
    const csv = [
      columns.map((column) => column.header).join(','),
      columns.map((column) => column.hint).join(','),
      'Pantalón,Uniforme,20',
    ].join('\n')

    const parsed = parseImportText(csv, 'PRODUCT')
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]).toMatchObject({
      name: 'Pantalón',
      category: 'Uniforme',
      sale_price_usd: 20,
    })
  })

  it('parses the generated SpreadsheetML template headers', () => {
    const xml = buildImportTemplateXml('SERVICE')
    expect(xml).toContain('nombre*')
    expect(xml).toContain('precio_venta*')
    expect(() => parseImportText(xml, 'SERVICE')).toThrow(/no tiene filas con datos/)
  })

  it('parses services and defaults missing category later on the API', () => {
    const csv = 'nombre*;precio_venta*\nInstalación;25'
    const parsed = parseImportText(csv, 'SERVICE')
    expect(parsed.rows[0]).toMatchObject({
      name: 'Instalación',
      sale_price_usd: 25,
    })
  })

  it('parses materials with unit and initial stock', () => {
    const csv = 'codigo*;nombre*;categoria*;unidad*;stock\nT-01;Tela azul;Uniforme;ROL;12,5'
    const parsed = parseImportText(csv, 'MATERIAL')
    expect(parsed.rows[0]).toMatchObject({
      code: 'T-01',
      name: 'Tela azul',
      category: 'Uniforme',
      unit: 'ROL',
      stock_quantity: 12.5,
    })
  })

  it('rejects files without the required headers', () => {
    expect(() => parseImportText('foo;bar\n1;2', 'PRODUCT')).toThrow(/columnas de la plantilla/)
  })
})
