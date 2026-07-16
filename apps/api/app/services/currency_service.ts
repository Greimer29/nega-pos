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

/** Columna `rate_per_usd` = unidades de esa moneda por 1 unidad de la moneda base. */
export const KEY_BASE_CURRENCY = 'base_currency_code'
export const DEFAULT_BASE_CURRENCY = 'XAU'
export const CUTOVER_BASE_CURRENCY = 'XAU'

export default class CurrencyService {
  async getBaseCurrencyCode(): Promise<string> {
    const row = await AppSetting.find(KEY_BASE_CURRENCY)
    const code = row?.value?.trim().toUpperCase()
    return code && code.length === 3 ? code : DEFAULT_BASE_CURRENCY
  }

  async setBaseCurrencyCode(code: string): Promise<string> {
    const normalized = code.trim().toUpperCase()
    await this.assertActiva(normalized)

    await AppSetting.updateOrCreate(
      { key: KEY_BASE_CURRENCY },
      { value: normalized, updatedAt: DateTime.now() }
    )

    const base = await this.obtener(normalized)
    base.ratePerUsd = '1.0000'
    await base.save()

    return normalized
  }

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
    const baseCode = await this.getBaseCurrencyCode()

    if (input.is_active === false && currency.code === baseCode) {
      throw new MonedaProtegidaException('La moneda base del sistema no se puede desactivar')
    }

    if (input.name !== undefined) {
      currency.name = input.name.trim()
    }
    if (input.rate_per_usd !== undefined) {
      if (currency.code === baseCode) {
        currency.ratePerUsd = '1.0000'
      } else {
        currency.ratePerUsd = input.rate_per_usd.toFixed(4)
      }
    }
    if (input.is_active !== undefined) {
      currency.isActive = input.is_active
    }

    await currency.save()
    await this.syncLegacyExchangeRate(currency)

    return currency
  }

  async eliminar(code: string): Promise<{ code: string; eliminado: true }> {
    const normalized = code.toUpperCase()
    const baseCode = await this.getBaseCurrencyCode()
    if (normalized === baseCode) {
      throw new MonedaProtegidaException('La moneda base del sistema no se puede eliminar')
    }

    await this.obtener(normalized)
    await Currency.query().where('code', normalized).delete()
    return { code: normalized, eliminado: true }
  }

  async getActiveRates(): Promise<Record<string, number>> {
    const baseCode = await this.getBaseCurrencyCode()
    const currencies = await this.listar(true)
    const rates: Record<string, number> = {}

    for (const currency of currencies) {
      if (currency.code === baseCode) {
        rates[baseCode] = 1
        continue
      }

      const rate = Number(currency.ratePerUsd)
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new TasaCambioInvalidaException(`La tasa de cambio de ${currency.code} no es válida`)
      }

      rates[currency.code] = rate
    }

    if (!rates[baseCode]) {
      rates[baseCode] = 1
    }

    return rates
  }

  /** Convierte un monto en `currencyCode` a la moneda base del sistema. */
  toBase(amount: number, currencyCode: string, rates: Record<string, number>, baseCode: string): number {
    const code = currencyCode.toUpperCase()
    if (code === baseCode) {
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

  /** Convierte un monto en moneda base a `currencyCode`. */
  fromBase(
    amountBase: number,
    currencyCode: string,
    rates: Record<string, number>,
    baseCode: string
  ): number {
    const code = currencyCode.toUpperCase()
    if (code === baseCode) {
      return amountBase
    }
    const rate = rates[code] ?? 1
    return amountBase * rate
  }

  /** @deprecated Usar toBase — alias hacia moneda base del sistema. */
  toUsd(amount: number, currencyCode: string, rates: Record<string, number>): number {
    const baseCode = Object.keys(rates).find((code) => rates[code] === 1 && code.length === 3)
    return this.toBase(amount, currencyCode, rates, baseCode ?? DEFAULT_BASE_CURRENCY)
  }

  /** @deprecated Usar fromBase — alias desde moneda base del sistema. */
  fromUsd(amountUsd: number, currencyCode: string, rates: Record<string, number>): number {
    const baseCode = Object.keys(rates).find((code) => rates[code] === 1 && code.length === 3)
    return this.fromBase(amountUsd, currencyCode, rates, baseCode ?? DEFAULT_BASE_CURRENCY)
  }

  async toBaseAsync(amount: number, currencyCode: string): Promise<number> {
    const [rates, baseCode] = await Promise.all([this.getActiveRates(), this.getBaseCurrencyCode()])
    return this.toBase(amount, currencyCode, rates, baseCode)
  }

  async fromBaseAsync(amountBase: number, currencyCode: string): Promise<number> {
    const [rates, baseCode] = await Promise.all([this.getActiveRates(), this.getBaseCurrencyCode()])
    return this.fromBase(amountBase, currencyCode, rates, baseCode)
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
