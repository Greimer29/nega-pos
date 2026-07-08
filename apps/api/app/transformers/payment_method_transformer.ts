import type PaymentMethod from '#models/payment_method'

export function serializePaymentMethod(method: PaymentMethod) {
  return {
    code: method.code,
    name: method.name,
    currency_code: method.currencyCode,
    is_active: Boolean(method.isActive),
    sort_order: method.sortOrder,
    created_at: method.createdAt.toISO(),
    updated_at: method.updatedAt.toISO(),
  }
}
