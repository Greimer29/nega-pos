import { describe, expect, it } from 'vitest'
import {
  DEFAULT_VENTAS_CATALOG_FILTERS,
  defaultSortForSource,
  filterCatalogByPrice,
  getCatalogPriceBounds,
  getCatalogSizeOptions,
} from '@/features/ventas/utils/ventas-catalog'

describe('ventas catalog utilities', () => {
  it('provides the initial filter state and source-specific default sort', () => {
    expect(DEFAULT_VENTAS_CATALOG_FILTERS).toEqual({
      source: 'products',
      search: '',
      barcode: '',
      category: '',
      size: '',
      sortBy: 'most_sold',
      minPrice: '',
      maxPrice: '',
      page: 1,
    })
    expect(defaultSortForSource('products')).toBe('most_sold')
    expect(defaultSortForSource('materials')).toBe('name')
    expect(defaultSortForSource('services')).toBe('name')
  })

  it('filters items within the entered price range and ignores empty or invalid limits', () => {
    const items = [{ price: 5 }, { price: 10 }, { price: 20 }]
    const getPrice = (item: (typeof items)[number]) => item.price

    expect(filterCatalogByPrice(items, '10', '20', getPrice)).toEqual(items.slice(1))
    expect(filterCatalogByPrice(items, '', '10', getPrice)).toEqual(items.slice(0, 2))
    expect(filterCatalogByPrice(items, 'invalid', '', getPrice)).toEqual(items)
  })

  it('calculates price bounds while ignoring invalid and negative values', () => {
    const items = [{ price: 12 }, { price: -1 }, { price: Number.NaN }, { price: 4 }]
    expect(getCatalogPriceBounds(items, (item) => item.price)).toEqual({ min: 4, max: 12 })
    expect(getCatalogPriceBounds([{ price: Number.NaN }], (item) => item.price)).toEqual({
      min: 0,
      max: 100,
    })
  })

  it('returns unique product sizes in Spanish natural order', () => {
    const products = [
      { sizes: [{ size: '10' }, { size: '2' }, { size: 'M' }] },
      { sizes: [{ size: '2' }, { size: 'L' }] },
      {},
    ]

    expect(getCatalogSizeOptions(products)).toEqual(['2', '10', 'L', 'M'])
  })
})
