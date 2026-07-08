import { api } from '@/lib/api'
import { isValidEntityId } from '@/lib/route-id'
import type {
  ConfirmSaleInput,
  CreateSaleInput,
  Sale,
  SaleListParams,
  SaleListResponse,
  SaleOrderStatus,
  SaleResponse,
  SaleReturnInput,
  UpdateSaleInput,
} from '@/features/ventas/types'

function assertValidSaleId(id: number, action: string): asserts id is number {
  if (!isValidEntityId(id)) {
    throw new Error(`No se pudo ${action}: ID de factura inválido.`)
  }
}

function parseSaleResponse(data: SaleResponse): Sale {
  const sale = data.data.sale
  if (!sale || !isValidEntityId(sale.id)) {
    throw new Error('La API devolvió una factura sin ID válido.')
  }
  return sale
}

export async function getNextSaleCode() {
  const { data } = await api.get<{ data: { next_code: string } }>('/sales/next-code')
  return data.data.next_code
}

export async function listSales(params: SaleListParams = {}) {
  const { data } = await api.get<SaleListResponse>('/sales', {
    params: {
      page: params.page,
      per_page: params.perPage,
      customer_id: params.customer_id,
      status: params.status,
      exclude_status: params.exclude_status,
      search: params.search,
      date_from: params.date_from,
      date_to: params.date_to,
    },
  })

  return data.data
}

export async function getSale(id: number) {
  assertValidSaleId(id, 'obtener la factura')
  const { data } = await api.get<SaleResponse>(`/sales/${id}`)
  return parseSaleResponse(data)
}

export async function createSale(payload: CreateSaleInput) {
  const { data } = await api.post<SaleResponse>('/sales', payload)
  return parseSaleResponse(data)
}

export async function updateSale(id: number, payload: UpdateSaleInput) {
  assertValidSaleId(id, 'actualizar la factura')
  const { data } = await api.put<SaleResponse>(`/sales/${id}`, payload)
  return parseSaleResponse(data)
}

export async function deleteSale(id: number) {
  assertValidSaleId(id, 'eliminar la factura')
  await api.delete(`/sales/${id}`)
}

export async function confirmSale(id: number, payload: ConfirmSaleInput = {}) {
  assertValidSaleId(id, 'confirmar la factura')
  const { data } = await api.post<SaleResponse>(`/sales/${id}/confirm`, payload)
  return parseSaleResponse(data)
}

export async function transitionSale(id: number, orderStatus: SaleOrderStatus) {
  assertValidSaleId(id, 'actualizar el estado del pedido')
  const { data } = await api.post<SaleResponse>(`/sales/${id}/transition`, {
    order_status: orderStatus,
  })
  return parseSaleResponse(data)
}

export async function returnSale(id: number, payload: SaleReturnInput = {}) {
  assertValidSaleId(id, 'registrar la devolución')
  const { data } = await api.post<SaleResponse>(`/sales/${id}/return`, payload)
  return parseSaleResponse(data)
}

export type { Sale }
