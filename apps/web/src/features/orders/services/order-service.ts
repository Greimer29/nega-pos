import type {
  OrderDeleteResponse,
  OrderInput,
  OrderMaterialInput,
  OrderMaterialResponse,
  OrderMaterialUpdateInput,
  OrderListParams,
  OrderListResponse,
  OrderResponse,
  OrderReturnInput,
  OrderTransicionInput,
  Order,
} from '@/features/orders/types'
import { api } from '@/lib/api'

type ApiOrder = {
  id: number
  code: string
  customerId: number | null
  guestName: string | null
  modality: 'WHITE_LABEL' | 'CORPORATE'
  description: string
  totalQuantity: number
  orderDate: string
  estimatedDeliveryDate: string | null
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
  totalPrice: string | null
  paymentType: 'CASH' | 'CREDIT' | null
  creditDueDate: string | null
  amountPaidUsd: string | null
  balanceUsd: string | null
  confirmedAt: string | null
  notes: string | null
  returnedAt: string | null
  tieneReferencia: boolean
  createdAt: string
  updatedAt: string
  customer?: Order['customer']
  materials?: Order['materials']
  lines?: Order['lines']
  warnings?: Order['warnings']
}

function mapApiOrder(order: ApiOrder): Order {
  return {
    id: order.id,
    code: order.code,
    customerId: order.customerId,
    guestName: order.guestName ?? null,
    modalidad: order.modality,
    description: order.description,
    totalQuantity: order.totalQuantity,
    dateOrder: order.orderDate,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    status: order.status,
    totalPrice: order.totalPrice,
    paymentType: order.paymentType,
    creditDueDate: order.creditDueDate,
    amountPaidUsd: order.amountPaidUsd,
    balanceUsd: order.balanceUsd,
    confirmedAt: order.confirmedAt,
    notes: order.notes,
    returnedAt: order.returnedAt ?? null,
    tieneReferencia: order.tieneReferencia,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: order.customer,
    materials: order.materials,
    lines: order.lines,
    warnings: order.warnings,
  }
}

function mapOrderPayload(payload: OrderInput) {
  return {
    customer_id: payload.customer_id,
    guest_name: payload.guest_name,
    modality: payload.modalidad,
    description: payload.description,
    total_quantity: payload.quantity_total,
    order_date: payload.date_order,
    estimated_delivery_date: payload.date_entrega_estimada,
    total_price: payload.total_price,
    notes: payload.notes,
    payment_type: payload.payment_type,
    lines: payload.lines,
  }
}

export async function listOrders(params: OrderListParams = {}) {
  const { data } = await api.get<OrderListResponse>('/orders', {
    params: {
      page: params.page,
      per_page: params.perPage,
      customer_id: params.customer_id,
      status: params.status,
      exclude_status: params.exclude_status,
      modality: params.modalidad,
      date_from: params.date_desde,
      date_to: params.date_hasta,
      search: params.search || undefined,
      sort_by: params.sort_by,
      direction: params.direction,
    },
  })

  return {
    orders: data.data.orders.map((item) => mapApiOrder(item as unknown as ApiOrder)),
    meta: data.data.meta,
  }
}

export async function getOrder(id: number) {
  const { data } = await api.get<OrderResponse>(`/orders/${id}`)
  return mapApiOrder(data.data.order as unknown as ApiOrder)
}

export async function createOrder(payload: OrderInput) {
  const { data } = await api.post<OrderResponse>('/orders', mapOrderPayload(payload))
  return mapApiOrder(data.data.order as unknown as ApiOrder)
}

export async function updateOrder(id: number, payload: OrderInput) {
  const { data } = await api.put<OrderResponse>(`/orders/${id}`, mapOrderPayload(payload))
  return mapApiOrder(data.data.order as unknown as ApiOrder)
}

export async function deleteOrder(id: number) {
  const { data } = await api.delete<OrderDeleteResponse>(`/orders/${id}`)
  return data.data
}

export async function transicionarOrder(id: number, payload: OrderTransicionInput) {
  const { data } = await api.post<OrderResponse>(`/orders/${id}/transition`, payload)
  return mapApiOrder(data.data.order as unknown as ApiOrder)
}

export async function returnOrder(id: number, payload: OrderReturnInput = {}) {
  const { data } = await api.post<OrderResponse>(`/orders/${id}/return`, payload)
  return mapApiOrder(data.data.order as unknown as ApiOrder)
}

export async function uploadReferencia(orderId: number, file: File) {
  const formData = new FormData()
  formData.append('referencia', file)

  const { data } = await api.post<OrderResponse>(`/orders/${orderId}/reference`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return mapApiOrder(data.data.order as unknown as ApiOrder)
}

export async function downloadReferencia(orderId: number) {
  const response = await api.get<Blob>(`/orders/${orderId}/reference`, {
    responseType: 'blob',
  })

  return response.data
}

export async function createOrderMaterial(orderId: number, payload: OrderMaterialInput) {
  const { data } = await api.post<OrderMaterialResponse>(`/orders/${orderId}/materials`, payload)
  return data.data.orderMaterial
}

export async function updateOrderMaterial(
  orderId: number,
  orderMaterialId: number,
  payload: OrderMaterialUpdateInput
) {
  const { data } = await api.put<OrderMaterialResponse>(
    `/orders/${orderId}/materials/${orderMaterialId}`,
    payload
  )
  return data.data.orderMaterial
}

export async function deleteOrderMaterial(orderId: number, orderMaterialId: number) {
  const { data } = await api.delete<OrderDeleteResponse>(
    `/orders/${orderId}/materials/${orderMaterialId}`
  )
  return data.data
}

export async function createOrderLine(orderId: number, payload: { catalog_product_id: number; quantity: number }) {
  const { data } = await api.post<{ data: { order_line: Order['lines'] extends (infer L)[] | undefined ? L : never } }>(
    `/orders/${orderId}/lines`,
    payload
  )
  return data.data.order_line
}

export async function updateOrderLine(orderId: number, lineId: number, payload: { quantity: number }) {
  const { data } = await api.put<{ data: { order_line: Order['lines'] extends (infer L)[] | undefined ? L : never } }>(
    `/orders/${orderId}/lines/${lineId}`,
    payload
  )
  return data.data.order_line
}

export async function deleteOrderLine(orderId: number, lineId: number) {
  const { data } = await api.delete<OrderDeleteResponse>(`/orders/${orderId}/lines/${lineId}`)
  return data.data
}

export async function getOrderBudget(orderId: number) {
  const { data } = await api.get<{ data: { budget: { lines: unknown[]; total_usd: string } } }>(
    `/orders/${orderId}/budget`
  )
  return data.data.budget
}

export async function getOrderMaterialAvailability(orderId: number) {
  const { data } = await api.get<{
    data: {
      sufficient: boolean
      has_recipe: boolean
      missing: {
        material_id: number
        name: string
        stock_actual: number
        consumo_proyectado: number
        faltante: number
      }[]
    }
  }>(`/orders/${orderId}/material-availability`)

  return data.data
}
