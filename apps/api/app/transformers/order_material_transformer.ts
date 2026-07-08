import type Material from '#models/material'
import type OrderMaterial from '#models/order_material'
import { calcularConsumoProyectado } from '#services/order_stock'

function serializeMaterialResumen(material: Material) {
  return {
    id: Number(material.id),
    code: material.code,
    name: material.name,
    unit: material.unit,
  }
}

export function serializeOrderMaterial(orderMaterial: OrderMaterial, totalQuantityOrder: number) {
  const consumoProyectado = calcularConsumoProyectado(
    orderMaterial.quantityPerGarment,
    totalQuantityOrder
  )

  return {
    id: Number(orderMaterial.id),
    orderId: Number(orderMaterial.orderId),
    materialId: Number(orderMaterial.materialId),
    quantityPerGarment: orderMaterial.quantityPerGarment,
    consumoProyectado: consumoProyectado.toFixed(3),
    notes: orderMaterial.notes,
    ...(orderMaterial.material
      ? { material: serializeMaterialResumen(orderMaterial.material) }
      : {}),
  }
}

export function serializeOrderMaterials(
  orderMaterials: OrderMaterial[],
  totalQuantityOrder: number
) {
  return orderMaterials.map((item) => serializeOrderMaterial(item, totalQuantityOrder))
}
