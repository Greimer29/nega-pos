import { describe, expect, it } from 'vitest'
import {
  buildCatalogProductPayload,
  calcFormulaMaterialsCost,
  deriveRetailCost,
  formatMarginValue,
  sumSizeRowsStock,
  validateCatalogProductForm,
  validateSizeRows,
  type CatalogProductFormValues,
  type SizeRow,
} from './catalog-product-form'

function sizeRow(size: string, stock: string, key = size): SizeRow {
  return { key, size, stock_quantity: stock }
}

function formValues(overrides: Partial<CatalogProductFormValues> = {}): CatalogProductFormValues {
  return {
    name: '  Harina  ',
    description: '  ',
    category: 'Víveres',
    barcode: ' 123 ',
    supplierCode: '',
    saleUnit: 'UND',
    salePrice: '2.5',
    costPrice: '1.25',
    stockQuantity: '7',
    minimumStock: '2',
    useFormula: false,
    useSizes: false,
    sizeRows: [sizeRow('', '0')],
    wholesaleEnabled: false,
    wholesaleUnits: '30',
    wholesaleCost: '',
    wholesaleSale: '',
    ...overrides,
  }
}

const baseContext = {
  selectedFormulaId: undefined,
  hadSizes: false,
  isEditing: false,
  purchaseFlow: false,
}

describe('formatMarginValue', () => {
  it('formats margin with one decimal or empty when not computable', () => {
    expect(formatMarginValue(1, '1.5')).toBe('50.0')
    expect(formatMarginValue(0, '1.5')).toBe('')
  })
})

describe('sumSizeRowsStock', () => {
  it('ignores rows without size and clamps negatives', () => {
    expect(sumSizeRowsStock([sizeRow('S', '3'), sizeRow('', '10'), sizeRow('M', '-2')], 'UND')).toBe(
      3
    )
  })
})

describe('calcFormulaMaterialsCost', () => {
  it('sums last purchase price times quantity', () => {
    expect(calcFormulaMaterialsCost(undefined)).toBe(0)
    expect(
      calcFormulaMaterialsCost([
        {
          id: 1,
          material_id: 1,
          quantity: '2',
          material: { id: 1, code: 'M1', name: 'A', unit: 'UND', last_purchase_price_usd: '1.5' },
        },
        { id: 2, material_id: 2, quantity: '3' },
      ])
    ).toBe(3)
  })
})

describe('deriveRetailCost', () => {
  it('derives unit cost from pack when wholesale has valid units', () => {
    expect(deriveRetailCost(true, '30', '15', '9')).toBeCloseTo(0.5)
    expect(deriveRetailCost(true, '1', '15', '9')).toBe(9)
    expect(deriveRetailCost(false, '30', '15', '9')).toBe(9)
  })
})

describe('validateSizeRows', () => {
  it('rejects long, duplicated, negative or missing sizes', () => {
    expect(validateSizeRows([sizeRow('X'.repeat(21), '1')])).toMatch(/20 caracteres/)
    expect(validateSizeRows([sizeRow('M', '1', 'a'), sizeRow('m', '1', 'b')])).toBe(
      'La talla "m" está duplicada.'
    )
    expect(validateSizeRows([sizeRow('M', '-1')])).toMatch(/negativo/)
    expect(validateSizeRows([sizeRow(' ', '1')])).toMatch(/al menos una talla/)
    expect(validateSizeRows([sizeRow('M', '1')])).toBeNull()
  })
})

describe('validateCatalogProductForm', () => {
  it('checks rules in the same order as the dialog', () => {
    expect(validateCatalogProductForm(formValues({ category: ' ' }), false)).toBe(
      'Elegí una categoría.'
    )
    expect(
      validateCatalogProductForm(formValues({ useFormula: true, useSizes: true }), false)
    ).toMatch(/fórmula no puede usar tallas/)
    expect(
      validateCatalogProductForm(formValues({ wholesaleEnabled: true, useSizes: true }), false)
    ).toMatch(/mayorista no aplica/)
    expect(
      validateCatalogProductForm(formValues({ wholesaleEnabled: true, wholesaleUnits: '1' }), false)
    ).toMatch(/al menos 2 unidades/)
    expect(
      validateCatalogProductForm(
        formValues({ wholesaleEnabled: true, wholesaleCost: '-1', wholesaleSale: '5' }),
        false
      )
    ).toMatch(/costo del paquete/)
    expect(
      validateCatalogProductForm(
        formValues({ wholesaleEnabled: true, wholesaleCost: '5', wholesaleSale: 'x' }),
        false
      )
    ).toMatch(/venta del paquete/)
    expect(validateCatalogProductForm(formValues({ useFormula: true }), false)).toMatch(
      /Elegí o creá una fórmula/
    )
    expect(validateCatalogProductForm(formValues({ minimumStock: '-1' }), false)).toMatch(
      /stock mínimo/
    )
    expect(validateCatalogProductForm(formValues({ useSizes: true }), false)).toMatch(
      /al menos una talla/
    )
    expect(validateCatalogProductForm(formValues(), false)).toBeNull()
    expect(validateCatalogProductForm(formValues({ useFormula: true }), true)).toBeNull()
  })
})

describe('buildCatalogProductPayload', () => {
  it('builds a retail payload with stock and trimmed fields', () => {
    expect(buildCatalogProductPayload(formValues(), baseContext)).toEqual({
      name: 'Harina',
      description: undefined,
      category: 'Víveres',
      barcode: '123',
      supplier_code: null,
      sale_unit: 'UND',
      sale_price_usd: 2.5,
      minimum_stock: 2,
      wholesale_enabled: false,
      wholesale_units_per_pack: null,
      wholesale_cost_usd: null,
      wholesale_sale_price_usd: null,
      cost_usd: 1.25,
      formula_id: null,
      stock_quantity: 7,
    })
  })

  it('sends zero stock when creating from a purchase', () => {
    const payload = buildCatalogProductPayload(formValues(), { ...baseContext, purchaseFlow: true })
    expect(payload.stock_quantity).toBe(0)
    const editing = buildCatalogProductPayload(formValues(), {
      ...baseContext,
      purchaseFlow: true,
      isEditing: true,
    })
    expect(editing.stock_quantity).toBe(7)
  })

  it('derives retail cost from the pack when wholesale is enabled', () => {
    const payload = buildCatalogProductPayload(
      formValues({ wholesaleEnabled: true, wholesaleCost: '15', wholesaleSale: '20' }),
      baseContext
    )
    expect(payload).toMatchObject({
      wholesale_enabled: true,
      wholesale_units_per_pack: 30,
      wholesale_cost_usd: 15,
      wholesale_sale_price_usd: 20,
      formula_id: null,
    })
    expect(payload.cost_usd).toBeCloseTo(0.5)
  })

  it('sends sizes and their total stock', () => {
    const payload = buildCatalogProductPayload(
      formValues({ useSizes: true, sizeRows: [sizeRow(' S ', '2'), sizeRow('', '9'), sizeRow('M', '3')] }),
      baseContext
    )
    expect(payload.sizes).toEqual([
      { size: 'S', stock_quantity: 2 },
      { size: 'M', stock_quantity: 3 },
    ])
    expect(payload.stock_quantity).toBe(5)
  })

  it('clears sizes when a product that had sizes stops using them', () => {
    const payload = buildCatalogProductPayload(formValues(), { ...baseContext, hadSizes: true })
    expect(payload.sizes).toEqual([])
    const withoutPrevious = buildCatalogProductPayload(formValues(), baseContext)
    expect('sizes' in withoutPrevious).toBe(false)
  })

  it('sends only the formula id for formula products', () => {
    const payload = buildCatalogProductPayload(formValues({ useFormula: true }), {
      ...baseContext,
      selectedFormulaId: 4,
      hadSizes: true,
    })
    expect(payload.formula_id).toBe(4)
    expect('cost_usd' in payload).toBe(false)
    expect('stock_quantity' in payload).toBe(false)
    expect('sizes' in payload).toBe(false)
  })
})
