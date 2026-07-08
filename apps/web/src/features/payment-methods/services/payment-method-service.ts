import type {
  PaymentMethod,
  PaymentMethodInput,
  PaymentMethodListResponse,
  PaymentMethodResponse,
  PaymentMethodUpdateInput,
} from '@/features/payment-methods/types'
import { api } from '@/lib/api'

export async function listPaymentMethods(activeOnly = false) {
  const { data } = await api.get<PaymentMethodListResponse>('/payment-methods', {
    params: { active: activeOnly || undefined },
  })
  return data.data.payment_methods
}

export async function createPaymentMethod(payload: PaymentMethodInput) {
  const { data } = await api.post<PaymentMethodResponse>('/payment-methods', payload)
  return data.data.payment_method as PaymentMethod
}

export async function updatePaymentMethod(code: string, payload: PaymentMethodUpdateInput) {
  const { data } = await api.put<PaymentMethodResponse>(`/payment-methods/${code}`, payload)
  return data.data.payment_method as PaymentMethod
}

export async function deletePaymentMethod(code: string) {
  await api.delete(`/payment-methods/${code}`)
}
