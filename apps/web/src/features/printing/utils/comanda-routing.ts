import type { PrintConfig } from '@/features/printing/types'
import type { Sale, SaleLine } from '@/features/ventas/types'

export const UNCATEGORIZED_CATEGORY = '__sin_categoria__'

export const UNCATEGORIZED_CATEGORY_LABEL = 'Sin categoría / otros'

/** @deprecated Ya no se enruta por "Materiales"; se filtra al cargar config legacy. */
export const LEGACY_MATERIALS_ROUTING_CATEGORY = 'Materiales'

export function normalizeCategoryKey(value: string): string {
  return value.trim().toLocaleLowerCase('es-VE')
}

export function resolveRuleDeviceName(
  rules: PrintConfig['categoryRouting']['comanda']['rules'],
  category: string
): string | undefined {
  const key = normalizeCategoryKey(category)
  if (!key) {
    return undefined
  }

  for (const rule of rules) {
    const ruleCategory = rule.category.trim()
    const deviceName = rule.deviceName.trim()
    if (ruleCategory && deviceName && normalizeCategoryKey(ruleCategory) === key) {
      return deviceName
    }
  }

  return undefined
}

export function isComandaPrintingConfigured(config: PrintConfig): boolean {
  if (config.documents.comanda.enabled) {
    return true
  }

  const routing = config.categoryRouting.comanda
  return (
    routing.enabled &&
    routing.rules.some((rule) => rule.category.trim() && rule.deviceName.trim())
  )
}

export function resolveLineCategory(line: SaleLine): string {
  const productCategory = line.catalog_product?.category?.trim()
  if (productCategory) {
    return productCategory
  }

  if (line.material_id || line.material) {
    return UNCATEGORIZED_CATEGORY
  }

  return UNCATEGORIZED_CATEGORY
}

export function categoryLabelForKey(category: string): string {
  if (category === UNCATEGORIZED_CATEGORY) {
    return UNCATEGORIZED_CATEGORY_LABEL
  }
  return category
}

export function resolveCategoryLabelForLines(lines: SaleLine[]): string | undefined {
  const categories = new Set(lines.map(resolveLineCategory))
  if (categories.size === 0) {
    return undefined
  }
  if (categories.size === 1) {
    return categoryLabelForKey([...categories][0])
  }
  return 'Varias categorías'
}

export function groupSaleLinesByComandaPrinter(
  sale: Sale,
  config: PrintConfig
): Map<string, SaleLine[]> {
  const lines = sale.lines ?? []
  const defaultPrinter = config.documents.comanda.deviceName.trim()
  const routing = config.categoryRouting.comanda

  if (!routing.enabled) {
    const groups = new Map<string, SaleLine[]>()
    if (lines.length > 0) {
      groups.set(defaultPrinter, lines)
    }
    return groups
  }

  const ruleMap = new Map<string, string>()
  for (const rule of routing.rules) {
    const category = rule.category.trim()
    const deviceName = rule.deviceName.trim()
    if (category && deviceName) {
      ruleMap.set(normalizeCategoryKey(category), deviceName)
    }
  }

  const groups = new Map<string, SaleLine[]>()
  for (const line of lines) {
    const category = resolveLineCategory(line)
    const printer = ruleMap.get(normalizeCategoryKey(category)) ?? defaultPrinter
    const bucket = groups.get(printer) ?? []
    bucket.push(line)
    groups.set(printer, bucket)
  }

  return groups
}

export function upsertCategoryRule(
  rules: PrintConfig['categoryRouting']['comanda']['rules'],
  category: string,
  deviceName: string
): PrintConfig['categoryRouting']['comanda']['rules'] {
  const trimmedDevice = deviceName.trim()
  const withoutCategory = rules.filter(
    (rule) => normalizeCategoryKey(rule.category) !== normalizeCategoryKey(category)
  )

  if (!trimmedDevice) {
    return withoutCategory
  }

  return [...withoutCategory, { category, deviceName: trimmedDevice }]
}

export function getRuleDeviceName(
  rules: PrintConfig['categoryRouting']['comanda']['rules'],
  category: string
): string {
  return resolveRuleDeviceName(rules, category) ?? ''
}

/** Quita reglas legacy de "Materiales" (los materiales van en la fórmula del producto, no en otra comanda). */
export function sanitizeComandaRoutingRules(
  rules: PrintConfig['categoryRouting']['comanda']['rules']
): PrintConfig['categoryRouting']['comanda']['rules'] {
  return rules.filter(
    (rule) =>
      normalizeCategoryKey(rule.category) !==
      normalizeCategoryKey(LEGACY_MATERIALS_ROUTING_CATEGORY)
  )
}
