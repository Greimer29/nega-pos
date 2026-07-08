import type Order from '#models/order'
import type { StockInsuficienteDetail } from '#exceptions/stock_insuficiente_exception'

export const RECETA_VACIA_WARNING = {
  code: 'RECETA_VACIA',
  message: 'El order pasó a producción sin receta definida; no se descontó inventario.',
} as const

export const NOTA_FORZADO_SIN_STOCK = 'FORCED_WITHOUT_SUFFICIENT_STOCK'

export type RecetaItemStock = {
  materialId: number
  materialNombre: string
  quantityPerGarment: string
}

export function calcularConsumoProyectado(
  quantityPerGarment: string,
  totalQuantityOrder: number
): number {
  return Number(quantityPerGarment) * totalQuantityOrder
}

export function formatCantidadMovimiento(consumoProyectado: number): string {
  return (-consumoProyectado).toFixed(3)
}

export function formatCantidadReversion(quantitySalida: string): string {
  return (-Number(quantitySalida)).toFixed(3)
}

export function evaluarStockInsuficiente(
  receta: RecetaItemStock[],
  totalQuantityOrder: number,
  stockByMaterialId: Map<number, number>
): StockInsuficienteDetail[] {
  const faltantes: StockInsuficienteDetail[] = []

  for (const item of receta) {
    const consumoProyectado = calcularConsumoProyectado(item.quantityPerGarment, totalQuantityOrder)
    const stockActual = stockByMaterialId.get(item.materialId) ?? 0

    if (stockActual < consumoProyectado) {
      faltantes.push({
        material_id: item.materialId,
        name: item.materialNombre,
        stock_actual: stockActual,
        consumo_proyectado: consumoProyectado,
        faltante: consumoProyectado - stockActual,
      })
    }
  }

  return faltantes
}

export type ConsumoMaterialLinea = {
  materialId: number
  materialNombre: string
  cantidadTotal: number
}

export function agregarConsumoMaterial(
  consumoPorMaterial: Map<number, ConsumoMaterialLinea>,
  materialId: number,
  materialNombre: string,
  cantidad: number
) {
  const existing = consumoPorMaterial.get(materialId)

  if (existing) {
    existing.cantidadTotal += cantidad
    return
  }

  consumoPorMaterial.set(materialId, {
    materialId,
    materialNombre,
    cantidadTotal: cantidad,
  })
}

export function consumoMapToRecetaStock(
  consumoPorMaterial: Map<number, ConsumoMaterialLinea>
): RecetaItemStock[] {
  return [...consumoPorMaterial.values()].map((item) => ({
    materialId: item.materialId,
    materialNombre: item.materialNombre,
    quantityPerGarment: item.cantidadTotal.toFixed(3),
  }))
}

export function buildOrderConsumoMap(order: Order): {
  consumoPorMaterial: Map<number, ConsumoMaterialLinea>
  hasRecipe: boolean
} {
  const consumoPorMaterial = new Map<number, ConsumoMaterialLinea>()
  let hasRecipe = false
  const recipeLegacy = order.orderMaterials ?? []
  const orderLines = order.orderLines ?? []

  for (const line of orderLines) {
    const product = line.catalogProduct
    const formulaMaterials = product?.formula?.materials
    if (!formulaMaterials?.length) {
      continue
    }

    hasRecipe = true

    for (const formulaItem of formulaMaterials) {
      const materialId = Number(formulaItem.materialId)
      const consumo = Number(line.quantity) * Number(formulaItem.quantity)
      agregarConsumoMaterial(
        consumoPorMaterial,
        materialId,
        formulaItem.material?.name ?? `Material #${materialId}`,
        consumo
      )
    }
  }

  const hasFormulaLines = orderLines.some(
    (line) => (line.catalogProduct?.formula?.materials?.length ?? 0) > 0
  )

  // Evitar doble consumo: si hay fórmulas en líneas de catálogo, no sumar orderMaterials legacy.
  if (recipeLegacy.length > 0 && !hasFormulaLines) {
    hasRecipe = true

    for (const item of recipeLegacy) {
      const materialId = Number(item.materialId)
      const consumo = calcularConsumoProyectado(item.quantityPerGarment, order.totalQuantity)
      agregarConsumoMaterial(
        consumoPorMaterial,
        materialId,
        item.material?.name ?? `Material #${materialId}`,
        consumo
      )
    }
  }

  return { consumoPorMaterial, hasRecipe }
}

export function evaluarConsumoVsStock(
  consumoPorMaterial: Map<number, ConsumoMaterialLinea>,
  stockByMaterialId: Map<number, number>
): StockInsuficienteDetail[] {
  const faltantes: StockInsuficienteDetail[] = []

  for (const [, data] of consumoPorMaterial) {
    const stockActual = stockByMaterialId.get(data.materialId) ?? 0

    if (stockActual < data.cantidadTotal) {
      faltantes.push({
        material_id: data.materialId,
        name: data.materialNombre,
        stock_actual: stockActual,
        consumo_proyectado: data.cantidadTotal,
        faltante: data.cantidadTotal - stockActual,
      })
    }
  }

  return faltantes
}
