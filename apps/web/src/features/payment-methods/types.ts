export type PaymentMethod = {
  code: string
  name: string
  currency_code: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type PaymentMethodInput = {
  code: string
  name: string
  currency_code: string
  is_active?: boolean
  sort_order?: number
}

export type PaymentMethodUpdateInput = {
  name?: string
  currency_code?: string
  is_active?: boolean
  sort_order?: number
}

export type PaymentMethodListResponse = {
  data: {
    payment_methods: PaymentMethod[]
  }
}

export type PaymentMethodResponse = {
  data: {
    payment_method: PaymentMethod
  }
}
