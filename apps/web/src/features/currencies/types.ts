export type Currency = {
  code: string
  name: string
  ratePerUsd: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CurrencyInput = {
  code: string
  name: string
  rate_per_usd: number
  is_active?: boolean
}

export type CurrencyUpdateInput = {
  name?: string
  rate_per_usd?: number
  is_active?: boolean
}

export type CurrencyListResponse = {
  data: {
    base_currency_code?: string
    currencies: Currency[]
  }
}

export type BaseCurrencyResponse = {
  data: {
    base_currency_code: string
  }
}

export type CurrencyResponse = {
  data: {
    currency: Currency
  }
}
