export type MaterialShortage = {
  material_id: number
  name: string
  stock_actual: number
  consumo_proyectado: number
  faltante: number
}

export type MaterialAvailability = {
  sufficient: boolean
  has_recipe: boolean
  missing: MaterialShortage[]
}

export function formatMaterialShortagesMessage(missing: MaterialShortage[]): string | null {
  if (missing.length === 0) {
    return null
  }

  const lines = missing.map(
    (item) =>
      `• ${item.name}: faltan ${item.faltante.toFixed(3)} (disponible ${item.stock_actual.toFixed(3)}, se necesitan ${item.consumo_proyectado.toFixed(3)})`
  )

  return lines.join('\n')
}

export function formatDraftMaterialNotice(missing: MaterialShortage[]): string {
  const shortages = formatMaterialShortagesMessage(missing)

  if (!shortages) {
    return ''
  }

  return `No hay material suficiente para esta venta.\n\n${shortages}\n\nEl stock mostrado en Materiales puede incluir unidades ya comprometidas en otros pedidos en borrador o confirmados. La venta quedará en borrador hasta registrar la compra del material faltante.`
}

export function formatFulfilledOrdersMessage(
  orders: { id: number; code: string }[]
): string | null {
  if (orders.length === 0) {
    return null
  }

  if (orders.length === 1) {
    return `Se descontó material y el pedido ${orders[0].code} pasó a producción.`
  }

  return `${orders.length} pedidos pasaron a producción: ${orders.map((order) => order.code).join(', ')}.`
}
