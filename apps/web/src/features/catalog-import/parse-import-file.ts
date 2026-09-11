import { getImportColumns } from '@/features/catalog-import/columns'
import {
  MAX_IMPORT_ROWS,
  type CatalogImportKind,
  type CatalogProductImportRow,
  type MaterialImportRow,
} from '@/features/catalog-import/types'

const XLSX_HINT =
  'Excel guardó el archivo en formato .xlsx. Volvé a descargar la plantilla de Nega POS (.xls) o guardá la hoja como CSV UTF-8.'

const OLE_HINT =
  'Este .xls es el formato binario de Excel. Usá la plantilla que genera Nega POS o guardá la hoja como CSV UTF-8.'

const HEADER_ALIASES: Record<string, string> = {
  nombre: 'name',
  name: 'name',
  categoria: 'category',
  category: 'category',
  descripcion: 'description',
  description: 'description',
  unidad: 'sale_unit',
  unidad_venta: 'sale_unit',
  sale_unit: 'sale_unit',
  unit: 'unit',
  precio_venta: 'sale_price_usd',
  precio: 'sale_price_usd',
  precio_de_venta: 'sale_price_usd',
  sale_price_usd: 'sale_price_usd',
  costo: 'cost_usd',
  costo_usd: 'cost_usd',
  cost_usd: 'cost_usd',
  stock: 'stock_quantity',
  stock_inicial: 'stock_quantity',
  cantidad: 'stock_quantity',
  stock_quantity: 'stock_quantity',
  stock_minimo: 'minimum_stock',
  minimo: 'minimum_stock',
  minimum_stock: 'minimum_stock',
  codigo: 'code',
  code: 'code',
  ubicacion: 'location',
  location: 'location',
  precio_compra: 'last_purchase_price_usd',
  precio_compra_usd: 'last_purchase_price_usd',
  last_purchase_price_usd: 'last_purchase_price_usd',
}

export type ParsedImportFile = {
  rows: Array<CatalogProductImportRow | MaterialImportRow>
}

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportFileError'
  }
}

export function normalizeImportHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/\*+$/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function parseImportNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const normalized = trimmed.replace(/\s/g, '')
  let candidate = normalized
  if (normalized.includes(',') && normalized.includes('.')) {
    candidate =
      normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '')
  } else if (normalized.includes(',')) {
    candidate = normalized.replace(',', '.')
  }

  const parsed = Number(candidate)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function detectDelimiter(headerLine: string) {
  const commas = (headerLine.match(/,/g) ?? []).length
  const semicolons = (headerLine.match(/;/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }
  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function parseCsvMatrix(text: string): string[][] {
  const normalized = text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const firstContent = lines.find((line) => line.trim())
  if (!firstContent) return []
  const delimiter = detectDelimiter(firstContent)
  return lines.map((line) => parseCsvLine(line, delimiter))
}

function parseSpreadsheetRows(xml: string): string[][] {
  const worksheetMatch = xml.match(/<Worksheet\b[^>]*>[\s\S]*?<\/Worksheet>/i)
  const source = worksheetMatch?.[0] ?? xml
  const rows: string[][] = []
  const rowRegex = /<Row\b[^>]*>([\s\S]*?)<\/Row>/gi
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowRegex.exec(source))) {
    const cells: string[] = []
    const cellRegex = /<Cell\b([^>]*)>([\s\S]*?)<\/Cell>/gi
    let cellMatch: RegExpExecArray | null
    let nextIndex = 1

    while ((cellMatch = cellRegex.exec(rowMatch[1] ?? ''))) {
      const attrs = cellMatch[1] ?? ''
      const indexMatch = attrs.match(/\bss:Index="(\d+)"/i)
      const cellIndex = indexMatch ? Number(indexMatch[1]) : nextIndex
      while (cells.length < cellIndex - 1) {
        cells.push('')
      }
      const dataMatch = (cellMatch[2] ?? '').match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i)
      const raw = dataMatch?.[1] ?? ''
      cells.push(decodeXml(raw).trim())
      nextIndex = cellIndex + 1
    }

    rows.push(cells)
  }

  return rows
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

function looksLikeSpreadsheetXml(text: string) {
  return /<Workbook\b/i.test(text) && /ss:Type=/i.test(text)
}

function resolveHeaderKey(header: string, kind: CatalogImportKind) {
  const normalized = normalizeImportHeader(header)
  if (!normalized) return null

  if (kind === 'MATERIAL' && (normalized === 'unidad' || normalized === 'sale_unit')) {
    return 'unit'
  }
  if (kind !== 'MATERIAL' && normalized === 'unit') {
    return 'sale_unit'
  }

  return HEADER_ALIASES[normalized] ?? null
}

function findHeaderIndex(matrix: string[][], kind: CatalogImportKind) {
  const requiredKeys = new Set(
    getImportColumns(kind)
      .filter((column) => column.required)
      .map((column) => column.key)
  )

  for (let index = 0; index < matrix.length; index += 1) {
    const mapped = matrix[index]?.map((cell) => resolveHeaderKey(cell, kind)) ?? []
    const keys = new Set(mapped.filter((key): key is string => Boolean(key)))
    const matchedRequired = [...requiredKeys].filter((key) => keys.has(key)).length
    if (matchedRequired === requiredKeys.size) {
      return index
    }
  }

  return -1
}

function isHintRow(cells: string[], kind: CatalogImportKind) {
  const hints = getImportColumns(kind).map((column) => column.hint.trim())
  const matches = cells.filter((cell, index) => cell.trim() === hints[index]).length
  return matches >= Math.min(2, hints.length)
}

function isRowEmpty(cells: string[]) {
  return cells.every((cell) => !cell.trim())
}

function stringField(value: string | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed || undefined
}

function numberField(value: string | undefined, label: string, row: number) {
  if (!value?.trim()) return undefined
  const parsed = parseImportNumber(value)
  if (Number.isNaN(parsed)) {
    throw new ImportFileError(`Fila ${row}: ${label} no es un número válido`)
  }
  return parsed
}

function mapProductRow(
  values: Record<string, string>,
  row: number
): CatalogProductImportRow {
  return {
    row,
    name: stringField(values.name),
    category: stringField(values.category),
    description: stringField(values.description),
    sale_unit: stringField(values.sale_unit),
    sale_price_usd: numberField(values.sale_price_usd, 'precio_venta', row),
    cost_usd: numberField(values.cost_usd, 'costo', row),
    stock_quantity: numberField(values.stock_quantity, 'stock', row),
    minimum_stock: numberField(values.minimum_stock, 'stock_minimo', row),
  }
}

function mapMaterialRow(values: Record<string, string>, row: number): MaterialImportRow {
  return {
    row,
    code: stringField(values.code),
    name: stringField(values.name),
    category: stringField(values.category),
    unit: stringField(values.unit),
    description: stringField(values.description),
    stock_quantity: numberField(values.stock_quantity, 'stock', row),
    minimum_stock: numberField(values.minimum_stock, 'stock_minimo', row),
    location: stringField(values.location),
    last_purchase_price_usd: numberField(values.last_purchase_price_usd, 'precio_compra', row),
  }
}

export function parseImportMatrix(matrix: string[][], kind: CatalogImportKind): ParsedImportFile {
  const headerIndex = findHeaderIndex(matrix, kind)
  if (headerIndex < 0) {
    throw new ImportFileError(
      'No se encontraron las columnas de la plantilla. Descargá el Excel desde Nega POS y no borres la fila de encabezados.'
    )
  }

  const headerCells = matrix[headerIndex] ?? []
  const keyByIndex = headerCells.map((cell) => resolveHeaderKey(cell, kind))
  const rows: Array<CatalogProductImportRow | MaterialImportRow> = []

  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const cells = matrix[index] ?? []
    if (isRowEmpty(cells)) continue
    if (index === headerIndex + 1 && isHintRow(cells, kind)) continue

    const values: Record<string, string> = {}
    keyByIndex.forEach((key, cellIndex) => {
      if (!key) return
      values[key] = cells[cellIndex] ?? ''
    })

    const hasAnyValue = Object.values(values).some((value) => value.trim())
    if (!hasAnyValue) continue

    const excelRow = index + 1
    rows.push(kind === 'MATERIAL' ? mapMaterialRow(values, excelRow) : mapProductRow(values, excelRow))
  }

  if (rows.length === 0) {
    throw new ImportFileError('El archivo no tiene filas con datos para importar.')
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ImportFileError(
      `El archivo tiene ${rows.length} filas. El máximo por importación es ${MAX_IMPORT_ROWS}.`
    )
  }

  return { rows }
}

export function parseImportText(text: string, kind: CatalogImportKind): ParsedImportFile {
  const matrix = looksLikeSpreadsheetXml(text) ? parseSpreadsheetRows(text) : parseCsvMatrix(text)
  return parseImportMatrix(matrix, kind)
}

export async function parseImportFile(file: File, kind: CatalogImportKind): Promise<ParsedImportFile> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new ImportFileError(XLSX_HINT)
  }
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new ImportFileError(OLE_HINT)
  }

  const text = new TextDecoder('utf-8').decode(bytes)
  return parseImportText(text, kind)
}
