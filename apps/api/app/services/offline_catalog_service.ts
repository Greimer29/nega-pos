import CatalogProduct from '#models/catalog_product'
import Currency from '#models/currency'
import Customer from '#models/customer'
import Material from '#models/material'
import PaymentMethod from '#models/payment_method'
import MaterialService from '#services/material_service'
import CatalogProductStockService from '#services/catalog_product_stock_service'
import CurrencyService from '#services/currency_service'

export type OfflineCatalogSnapshot = {
  generated_at: string
  products: Array<{
    id: number
    name: string
    barcode: string | null
    category: string
    item_kind: string
    sale_unit: string
    sale_price_usd: string
    cost_usd: string
    active: boolean
    formula_id: number | null
    stock_quantity: number
    wholesale_enabled: boolean
    wholesale_sale_price_usd: string | null
    wholesale_cost_usd: string | null
    wholesale_units_per_pack: number | null
    sizes: Array<{ id: number; size: string; stock_quantity: string }>
    formula_materials: Array<{
      material_id: number
      quantity_per_unit: number
      material_name: string | null
    }>
  }>
  materials: Array<{
    id: number
    name: string
    unit: string
    barcode: string | null
    sale_price_usd: string | null
    last_purchase_price_usd: string | null
    stock_quantity: number
    active: boolean
  }>
  customers: Array<{
    id: number
    name: string
    credit_days: number
    document: string | null
    phone: string | null
  }>
  payment_methods: Array<{
    code: string
    name: string
    currency_code: string
    active: boolean
  }>
  currencies: Array<{
    code: string
    name: string
    rate_per_usd: string
    is_base: boolean
    active: boolean
  }>
}

export default class OfflineCatalogService {
  private materialService = new MaterialService()
  private catalogStockService = new CatalogProductStockService()
  private currencyService = new CurrencyService()

  async buildSnapshot(): Promise<OfflineCatalogSnapshot> {
    const baseCurrencyCode = await this.currencyService.getBaseCurrencyCode()
    const products = await CatalogProduct.query()
      .where('active', true)
      .preload('sizes')
      .preload('formula', (f) => f.preload('materials', (fm) => fm.preload('material')))
      .orderBy('name', 'asc')

    const productRows = []
    for (const product of products) {
      const { quantity } = await this.catalogStockService.calcularStockDisponible(product)
      productRows.push({
        id: Number(product.id),
        name: product.name,
        barcode: product.barcode,
        category: product.category,
        item_kind: product.itemKind,
        sale_unit: product.saleUnit,
        sale_price_usd: product.salePriceUsd,
        cost_usd: product.costUsd,
        active: Boolean(product.active),
        formula_id: product.formulaId ? Number(product.formulaId) : null,
        stock_quantity: quantity,
        wholesale_enabled: Boolean(product.wholesaleEnabled),
        wholesale_sale_price_usd: product.wholesaleSalePriceUsd ?? null,
        wholesale_cost_usd: product.wholesaleCostUsd ?? null,
        wholesale_units_per_pack: product.wholesaleUnitsPerPack
          ? Number(product.wholesaleUnitsPerPack)
          : null,
        sizes: (product.sizes ?? []).map((size) => ({
          id: Number(size.id),
          size: size.size,
          stock_quantity: size.stockQuantity,
        })),
        formula_materials: (product.formula?.materials ?? []).map((item) => ({
          material_id: Number(item.materialId),
          quantity_per_unit: Number(item.quantity),
          material_name: item.material?.name ?? null,
        })),
      })
    }

    const materials = await Material.query().where('active', true).orderBy('name', 'asc')
    const materialRows = []
    for (const material of materials) {
      const stock = await this.materialService.calcularStock(Number(material.id))
      materialRows.push({
        id: Number(material.id),
        name: material.name,
        unit: material.unit,
        barcode: material.barcode ?? null,
        sale_price_usd: material.salePriceUsd ?? null,
        last_purchase_price_usd: material.lastPurchasePriceUsd ?? null,
        stock_quantity: stock,
        active: Boolean(material.active),
      })
    }

    const customers = await Customer.query().where('creditDays', '>', 0).orderBy('name', 'asc')

    const paymentMethods = await PaymentMethod.query()
      .where('isActive', true)
      .orderBy('name', 'asc')

    const currencies = await Currency.query().where('isActive', true).orderBy('code', 'asc')

    return {
      generated_at: new Date().toISOString(),
      products: productRows,
      materials: materialRows,
      customers: customers.map((customer) => ({
        id: Number(customer.id),
        name: customer.name,
        credit_days: Number(customer.creditDays ?? 0),
        document: customer.document ?? null,
        phone: customer.phone ?? null,
      })),
      payment_methods: paymentMethods.map((method) => ({
        code: method.code,
        name: method.name,
        currency_code: method.currencyCode,
        active: Boolean(method.isActive),
      })),
      currencies: currencies.map((currency) => ({
        code: currency.code,
        name: currency.name,
        rate_per_usd: currency.ratePerUsd,
        is_base: currency.code === baseCurrencyCode,
        active: Boolean(currency.isActive),
      })),
    }
  }
}
