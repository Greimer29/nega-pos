import type { CatalogImportColumn, CatalogImportKind } from '@/features/catalog-import/types'

const UNITS_HINT = 'UND, PAR, CAJ, ROL, SET, MTS o KG'

export function getImportColumns(kind: CatalogImportKind): CatalogImportColumn[] {
  if (kind === 'SERVICE') {
    return [
      { key: 'name', header: 'nombre*', required: true, hint: 'Nombre del servicio' },
      { key: 'sale_price_usd', header: 'precio_venta*', required: true, hint: 'Precio de lista' },
      { key: 'description', header: 'descripcion', required: false, hint: 'Texto opcional' },
      {
        key: 'category',
        header: 'categoria',
        required: false,
        hint: 'Si se omite se usa Servicios',
      },
    ]
  }

  if (kind === 'MATERIAL') {
    return [
      { key: 'code', header: 'codigo*', required: true, hint: 'Código único' },
      { key: 'name', header: 'nombre*', required: true, hint: 'Nombre del material' },
      { key: 'category', header: 'categoria*', required: true, hint: 'Se crea si no existe' },
      { key: 'unit', header: 'unidad*', required: true, hint: UNITS_HINT },
      { key: 'description', header: 'descripcion', required: false, hint: 'Texto opcional' },
      {
        key: 'stock_quantity',
        header: 'stock',
        required: false,
        hint: 'Cantidad inicial. Por defecto 0',
      },
      { key: 'minimum_stock', header: 'stock_minimo', required: false, hint: 'Por defecto 1' },
      { key: 'location', header: 'ubicacion', required: false, hint: 'Ubicación física' },
      {
        key: 'last_purchase_price_usd',
        header: 'precio_compra',
        required: false,
        hint: 'Último precio de compra',
      },
    ]
  }

  return [
    { key: 'name', header: 'nombre*', required: true, hint: 'Nombre del producto' },
    { key: 'category', header: 'categoria*', required: true, hint: 'Se crea si no existe' },
    { key: 'sale_price_usd', header: 'precio_venta*', required: true, hint: 'Precio de lista' },
    { key: 'description', header: 'descripcion', required: false, hint: 'Texto opcional' },
    { key: 'sale_unit', header: 'unidad', required: false, hint: `${UNITS_HINT}. Por defecto UND` },
    { key: 'cost_usd', header: 'costo', required: false, hint: 'Costo. Por defecto 0' },
    { key: 'stock_quantity', header: 'stock', required: false, hint: 'Stock inicial. Por defecto 0' },
    { key: 'minimum_stock', header: 'stock_minimo', required: false, hint: 'Por defecto 0' },
  ]
}

export function importKindLabel(kind: CatalogImportKind) {
  if (kind === 'SERVICE') return 'servicios'
  if (kind === 'MATERIAL') return 'materiales'
  return 'productos'
}

export function importTemplateFilename(kind: CatalogImportKind) {
  return `plantilla-${importKindLabel(kind)}`
}
