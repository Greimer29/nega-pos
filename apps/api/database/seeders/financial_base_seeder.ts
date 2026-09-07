import Currency from '#models/currency'
import PaymentMethod from '#models/payment_method'
import AppSetting from '#models/app_setting'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

const CURRENCIES = [
  { code: 'XAU', name: 'Oro', ratePerUsd: '1.0000' },
  { code: 'USD', name: 'Dólar estadounidense', ratePerUsd: '100.0000' },
  { code: 'VES', name: 'Bolívar', ratePerUsd: '100.0000' },
] as const

const PAYMENT_METHODS = [
  { code: 'cash_usd', name: 'Efectivo USD', currencyCode: 'USD', sortOrder: 1 },
  { code: 'cash_bs', name: 'Efectivo Bs', currencyCode: 'VES', sortOrder: 2 },
  { code: 'transfer', name: 'Transferencia', currencyCode: 'VES', sortOrder: 3 },
  { code: 'mobile_payment', name: 'Pago móvil', currencyCode: 'VES', sortOrder: 4 },
  { code: 'zelle', name: 'Zelle', currencyCode: 'USD', sortOrder: 5 },
  { code: 'binance', name: 'Binance', currencyCode: 'USD', sortOrder: 6 },
] as const

export type FinancialBaseSeedOptions = {
  /** Lucid connection name (required when seeding a tenant DB outside HTTP ALS). */
  connection?: string
}

export default class extends BaseSeeder {
  async run(options: FinancialBaseSeedOptions = {}) {
    const conn = options.connection ? { connection: options.connection } : undefined

    await AppSetting.updateOrCreate(
      { key: 'base_currency_code' },
      { value: 'XAU', updatedAt: DateTime.now() },
      conn
    )

    for (const row of CURRENCIES) {
      await Currency.updateOrCreate(
        { code: row.code },
        {
          name: row.name,
          ratePerUsd: row.ratePerUsd,
          isActive: true,
        },
        conn
      )
    }

    for (const row of PAYMENT_METHODS) {
      await PaymentMethod.updateOrCreate(
        { code: row.code },
        {
          name: row.name,
          currencyCode: row.currencyCode,
          isActive: true,
          sortOrder: row.sortOrder,
        },
        conn
      )
    }
  }
}
