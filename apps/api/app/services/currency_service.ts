import CodigoMonedaDuplicadoException from '#exceptions/codigo_moneda_duplicado_exception'
import MonedaNoEncontradaException from '#exceptions/moneda_no_encontrada_exception'
import MonedaProtegidaException from '#exceptions/moneda_protegida_exception'
import TasaCambioInvalidaException from '#exceptions/tasa_cambio_invalida_exception'
import AppSetting from '#models/app_setting'
import Currency from '#models/currency'
import { DateTime } from 'luxon'

export type CurrencyInput = {
  code: string
  name: string
  rate_per_usd: number
  is_active?: boolean
}

export type UpdateCurrencyInput = {
  name?: string
  rate_per_usd?: number
  is_active?: boolean
}

const PROTECTED_CODES = new Set(['USD'])

export default class CurrencyService {
  async listar(activeOnly = false): Promise<Currency[]> {
    const query = Currency.query().orderBy('code', 'asc')
    if (activeOnly) {
      query.where('isActive', true)
    }
    return query
  }

  async obtener(code: string): Promise<Currency> {
    const currency = await Currency.find(code.toUpperCase())
    if (!currency) {
      throw new MonedaNoEncontradaException()
    }
    return currency
  }

  async assertActiva(code: string): Promise<Currency> {
    const currency = await this.obtener(code)
    if (!currency.isActive) {
      throw new MonedaNoEncontradaException('La moneda no está activa')
    }
    return currency
  }

  async crear(input: CurrencyInput): Promise<Currency> {
    const code = input.code.trim().toUpperCase()
    if (code.length !== 3) {
      throw new MonedaNoEncontradaException('El código debe tener 3 caracteres')
    }

    const existing = await Currency.find(code)
    if (existing) {
      throw new CodigoMonedaDuplicadoException()
    }

    return Currency.create({
      code,
      name: input.name.trim(),
      ratePerUsd: input.rate_per_usd.toFixed(4),
      isActive: input.is_active ?? true,
    })
  }

  async actualizar(code: string, input: UpdateCurrencyInput): Promise<Currency> {
    const currency = await this.obtener(code)

    if (input.is_active === false && PROTECTED_CODES.has(currency.code)) {
      throw new MonedaProtegidaException()
    }

    if (input.name !== undefined) {
      currency.name = input.name.trim()
    }
    if (input.rate_per_usd !== undefined) {
      currency.ratePerUsd = input.rate_per_usd.toFixed(4)
    }
    if (input.is_active !== undefined) {
      currency.isActive = input.is_active
    }

    await currency.save()
    await this.syncLegacyExchangeRate(currency)

    return currency
  }

  async eliminar(code: string): Promise<{ code: string; eliminado: true }> {
    if (PROTECTED_CODES.has(code.toUpperCase())) {
      throw new MonedaProtegidaException()
    }

    await this.obtener(code)
    await Currency.query().where('code', code.toUpperCase()).delete()
    return { code: code.toUpperCase(), eliminado: true }
  }

  async getActiveRates(): Promise<Record<string, number>> {
    const currencies = await this.listar(true)
    const rates: Record<string, number> = {}

    for (const currency of currencies) {
      if (currency.code === 'USD') {
        rates.USD = 1
        continue
      }

      const rate = Number(currency.ratePerUsd)
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new TasaCambioInvalidaException(`La tasa de cambio de ${currency.code} no es válida`)
      }

      rates[currency.code] = rate
    }

    if (!rates.USD) {
      rates.USD = 1
    }

    return rates
  }

  toUsd(amount: number, currencyCode: string, rates: Record<string, number>): number {
    const code = currencyCode.toUpperCase()
    if (code === 'USD') {
      return amount
    }

    const rate = rates[code]
    if (rate === undefined) {
      throw new MonedaNoEncontradaException()
    }

    if (rate <= 0) {
      throw new TasaCambioInvalidaException(`La tasa de cambio de ${code} no es válida`)
    }

    return amount / rate
  }

  fromUsd(amountUsd: number, currencyCode: string, rates: Record<string, number>): number {
    const code = currencyCode.toUpperCase()
    if (code === 'USD') {
      return amountUsd
    }
    const rate = rates[code] ?? 1
    return amountUsd * rate
  }

  formatRates(rates: Record<string, number>): Record<string, string> {
    return Object.fromEntries(Object.entries(rates).map(([code, rate]) => [code, rate.toFixed(4)]))
  }

  private async syncLegacyExchangeRate(currency: Currency) {
    if (currency.code !== 'VES' || !currency.isActive) {
      return
    }

    const formatted = Number(currency.ratePerUsd).toFixed(4)
    await AppSetting.updateOrCreate(
      { key: 'current_usd_rate' },
      { value: formatted, updatedAt: DateTime.now() }
    )
  }
}
