import { z } from 'zod'
import { TRANSICIONES } from '@/features/orders/constants'
import type {
  Order,
  OrderEstado,
  OrderPaymentType,
  OrderTransicionInput,
} from '@/features/orders/types'

export function buildTransitionPayload(
  nuevoEstado: OrderEstado,
  currentStatus: OrderEstado,
  paymentType: OrderPaymentType,
  force?: boolean
): OrderTransicionInput {
  const payload: OrderTransicionInput = { new_status: nuevoEstado }
  if (force) {
    payload.force = true
  }
  if (currentStatus === 'DRAFT' && (nuevoEstado === 'CONFIRMED' || nuevoEstado === 'DELIVERED')) {
    payload.payment_type = paymentType
  }
  return payload
}

export function validateCreditPayment(paymentType: OrderPaymentType, order: Order): string | null {
  if (paymentType !== 'CREDIT') {
    return null
  }
  if (!order.customerId) {
    return 'El crédito solo está disponible para clientes registrados.'
  }
  if (!order.customer?.creditDays || order.customer.creditDays <= 0) {
    return 'El cliente no tiene días de crédito configurados.'
  }
  return null
}

/** A draft without catalog lines cannot be invoiced and delivered directly. */
export function availableOrderTransitions(status: OrderEstado, catalogLinesCount: number) {
  return TRANSICIONES[status].filter(
    (transition) =>
      !(status === 'DRAFT' && transition.destino === 'DELIVERED' && catalogLinesCount === 0)
  )
}

export const orderHeaderSchema = z
  .object({
    client_mode: z.enum(['registered', 'guest']),
    customer_id: z.union([z.literal(''), z.coerce.number().min(1)]).optional(),
    guest_name: z.string().trim().max(150).optional(),
    modalidad: z.enum(['WHITE_LABEL', 'CORPORATE']),
    description: z.string().trim().min(1),
    quantity_total: z.coerce.number().min(1),
    date_order: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    date_entrega_estimada: z
      .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .optional(),
    total_price: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
    notes: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.client_mode === 'registered') {
      const customerId =
        typeof data.customer_id === 'number' ? data.customer_id : Number(data.customer_id)
      if (!customerId || customerId < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'Seleccioná un cliente registrado',
          path: ['customer_id'],
        })
      }
    } else if (!data.guest_name?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ingresá el nombre del invitado',
        path: ['guest_name'],
      })
    }
  })

export type OrderHeaderFormInput = z.input<typeof orderHeaderSchema>
export type OrderHeaderFormValues = z.infer<typeof orderHeaderSchema>

export function toOrderHeaderValues(order: Order): OrderHeaderFormInput {
  const isGuest = !order.customerId
  return {
    client_mode: isGuest ? 'guest' : 'registered',
    customer_id: order.customerId ?? '',
    guest_name: order.guestName ?? '',
    modalidad: order.modalidad,
    description: order.description,
    quantity_total: order.totalQuantity,
    date_order: order.dateOrder,
    date_entrega_estimada: order.estimatedDeliveryDate ?? '',
    total_price: order.totalPrice ?? '',
    notes: order.notes ?? '',
  }
}

export function toOrderHeaderPayload(values: OrderHeaderFormValues) {
  const base = {
    modalidad: values.modalidad,
    description: values.description.trim(),
    quantity_total: values.quantity_total,
    date_order: values.date_order,
    date_entrega_estimada: values.date_entrega_estimada?.trim() || undefined,
    total_price: values.total_price === '' ? undefined : Number(values.total_price),
    notes: values.notes?.trim() || undefined,
  }

  if (values.client_mode === 'registered') {
    return {
      ...base,
      customer_id: Number(values.customer_id),
    }
  }

  return {
    ...base,
    guest_name: values.guest_name!.trim(),
  }
}
