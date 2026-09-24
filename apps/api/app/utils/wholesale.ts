import ConfiguracionMayoristaInvalidaException from '#exceptions/configuracion_mayorista_invalida_exception'

export const MIN_WHOLESALE_UNITS_PER_PACK = 2

export type WholesaleConfigInput = {
  wholesale_enabled?: boolean
  wholesale_units_per_pack?: number | null
  wholesale_cost_usd?: number | null
  wholesale_sale_price_usd?: number | null
}

export type NormalizedWholesaleConfig = {
  wholesaleEnabled: boolean
  wholesaleUnitsPerPack: string | null
  wholesaleCostUsd: string | null
  wholesaleSalePriceUsd: string | null
  derivedUnitCost: number | null
}

export type WholesaleLineSource = {
  wholesaleEnabled?: boolean | null
  wholesaleUnitsPerPack?: string | number | null
  formulaId?: bigint | number | null
  itemKind?: string | null
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function isWholesaleEnabled(source: {
  wholesaleEnabled?: boolean | null
  wholesale_enabled?: boolean | null
}): boolean {
  return Boolean(source.wholesaleEnabled ?? source.wholesale_enabled)
}

export function parseUnitsPerPack(value: number | string | null | undefined): number | null {
  const parsed = toNumber(value)
  if (parsed === null || parsed < MIN_WHOLESALE_UNITS_PER_PACK) {
    return null
  }
  return parsed
}

export function deriveUnitCostFromPack(packCost: number, unitsPerPack: number): number {
  if (unitsPerPack < MIN_WHOLESALE_UNITS_PER_PACK) {
    throw new ConfiguracionMayoristaInvalidaException(
      'Las unidades por paquete deben ser al menos 2'
    )
  }
  return packCost / unitsPerPack
}

export function lineInventoryQuantity(
  lineQuantity: number,
  isWholesale: boolean,
  unitsPerPack: number | string | null | undefined
): number {
  if (!isWholesale) {
    return lineQuantity
  }

  const pack = parseUnitsPerPack(unitsPerPack)
  if (pack === null) {
    throw new ConfiguracionMayoristaInvalidaException(
      'La línea mayorista no tiene unidades por paquete válidas'
    )
  }

  return lineQuantity * pack
}

export function normalizeWholesaleConfig(
  input: WholesaleConfigInput,
  options: { allowEnabled: boolean; rejectReason?: string } = { allowEnabled: true }
): NormalizedWholesaleConfig {
  const enabled = Boolean(input.wholesale_enabled)

  if (!enabled) {
    return {
      wholesaleEnabled: false,
      wholesaleUnitsPerPack: null,
      wholesaleCostUsd: null,
      wholesaleSalePriceUsd: null,
      derivedUnitCost: null,
    }
  }

  if (!options.allowEnabled) {
    throw new ConfiguracionMayoristaInvalidaException(
      options.rejectReason ?? 'Este ítem no admite configuración mayorista'
    )
  }

  const unitsPerPack = parseUnitsPerPack(input.wholesale_units_per_pack)
  if (unitsPerPack === null) {
    throw new ConfiguracionMayoristaInvalidaException(
      'Indicá cuántas unidades trae el paquete mayorista (mínimo 2)'
    )
  }

  const packCost = toNumber(input.wholesale_cost_usd)
  if (packCost === null || packCost < 0) {
    throw new ConfiguracionMayoristaInvalidaException(
      'El precio costo mayorista es obligatorio y no puede ser negativo'
    )
  }

  const packSale = toNumber(input.wholesale_sale_price_usd)
  if (packSale === null || packSale < 0) {
    throw new ConfiguracionMayoristaInvalidaException(
      'El precio de venta mayorista es obligatorio y no puede ser negativo'
    )
  }

  return {
    wholesaleEnabled: true,
    wholesaleUnitsPerPack: unitsPerPack.toFixed(3),
    wholesaleCostUsd: packCost.toFixed(4),
    wholesaleSalePriceUsd: packSale.toFixed(4),
    derivedUnitCost: deriveUnitCostFromPack(packCost, unitsPerPack),
  }
}

export function resolveWholesaleLineSnapshot(
  isWholesale: boolean,
  source: WholesaleLineSource,
  options: { rejectReason?: string } = {}
): { isWholesale: boolean; unitsPerPack: string | null } {
  if (!isWholesale) {
    return { isWholesale: false, unitsPerPack: null }
  }

  if (source.itemKind === 'SERVICE') {
    throw new ConfiguracionMayoristaInvalidaException(
      'Los servicios no admiten venta o compra mayorista'
    )
  }

  if (source.formulaId) {
    throw new ConfiguracionMayoristaInvalidaException(
      'Un producto con fórmula no admite modo mayorista'
    )
  }

  if (!isWholesaleEnabled(source)) {
    throw new ConfiguracionMayoristaInvalidaException(
      options.rejectReason ?? 'Este ítem no tiene configuración mayorista'
    )
  }

  const unitsPerPack = parseUnitsPerPack(source.wholesaleUnitsPerPack)
  if (unitsPerPack === null) {
    throw new ConfiguracionMayoristaInvalidaException(
      'La configuración mayorista del ítem no tiene unidades por paquete válidas'
    )
  }

  return {
    isWholesale: true,
    unitsPerPack: unitsPerPack.toFixed(3),
  }
}
