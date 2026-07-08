import AppSetting from '#models/app_setting'
import Currency from '#models/currency'
import { DateTime } from 'luxon'

const KEY_EXCHANGE_RATE = 'current_usd_rate'
const KEY_PROFIT_MARGIN = 'default_profit_margin_percent'

export default class AppSettingsService {
  async getExchangeRate(): Promise<number | null> {
    const ves = await Currency.find('VES')
    if (ves?.isActive) {
      const rate = Number(ves.ratePerUsd)
      if (Number.isFinite(rate) && rate > 0) {
        return rate
      }
    }

    const row = await AppSetting.find(KEY_EXCHANGE_RATE)
    if (!row) return null
    const value = Number(row.value)
    return Number.isFinite(value) && value > 0 ? value : null
  }

  async setExchangeRate(rate: number): Promise<number> {
    const formatted = rate.toFixed(4)
    await AppSetting.updateOrCreate(
      { key: KEY_EXCHANGE_RATE },
      { value: formatted, updatedAt: DateTime.now() }
    )

    await Currency.query().where('code', 'VES').update({
      ratePerUsd: formatted,
      updatedAt: DateTime.now(),
    })

    return Number(formatted)
  }

  async getProfitMarginPercent(): Promise<number | null> {
    const row = await AppSetting.find(KEY_PROFIT_MARGIN)
    if (!row) return null
    const value = Number(row.value)
    return Number.isFinite(value) && value >= 0 ? value : null
  }

  async setProfitMarginPercent(percent: number): Promise<number> {
    const formatted = percent.toFixed(2)
    await AppSetting.updateOrCreate(
      { key: KEY_PROFIT_MARGIN },
      { value: formatted, updatedAt: DateTime.now() }
    )
    return Number(formatted)
  }
}
