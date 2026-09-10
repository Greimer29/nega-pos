import AppSettingsService from '#services/app_settings_service'
import BusinessProfileService from '#services/business_profile_service'
import PrintConfigService from '#services/print_config_service'
import { serializeBusinessProfile } from '#transformers/business_profile_transformer'
import {
  updateBusinessProfileValidator,
  updateExchangeRateValidator,
  updatePrintConfigValidator,
  updateProfitMarginValidator,
} from '#validators/settings'
import type { HttpContext } from '@adonisjs/core/http'

export default class SettingsController {
  private service = new AppSettingsService()
  private businessProfileService = new BusinessProfileService()
  private printConfigService = new PrintConfigService()

  async getExchangeRate({ serialize }: HttpContext) {
    const usdRate = await this.service.getExchangeRate()

    return serialize({
      usdRate: usdRate !== null ? usdRate.toFixed(4) : null,
    })
  }

  async updateExchangeRate({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateExchangeRateValidator)
    const saved = await this.service.setExchangeRate(payload.usd_rate)

    return serialize({
      usdRate: saved.toFixed(4),
    })
  }

  async getProfitMargin({ serialize }: HttpContext) {
    const profitMarginPercent = await this.service.getProfitMarginPercent()

    return serialize({
      profitMarginPercent: profitMarginPercent !== null ? profitMarginPercent.toFixed(2) : null,
    })
  }

  async updateProfitMargin({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateProfitMarginValidator)
    const saved = await this.service.setProfitMarginPercent(payload.profit_margin_percent)

    return serialize({
      profitMarginPercent: saved.toFixed(2),
    })
  }

  async getGeneral({ serialize }: HttpContext) {
    const profile = await this.businessProfileService.obtener()

    return serialize({
      business_profile: serializeBusinessProfile(profile),
    })
  }

  async updateGeneral({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateBusinessProfileValidator)
    const profile = await this.businessProfileService.guardar({
      ...payload,
      email: payload.email ?? '',
    })

    return serialize({
      business_profile: serializeBusinessProfile(profile),
    })
  }

  async uploadLogo({ request, serialize }: HttpContext) {
    const file = request.file('logo', {
      size: '2mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    if (!file) {
      return serialize({ error: 'No logo provided' })
    }

    const profile = await this.businessProfileService.guardarLogo(file)

    return serialize({
      business_profile: serializeBusinessProfile(profile),
    })
  }

  async downloadLogo({ response }: HttpContext) {
    const image = await this.businessProfileService.obtenerLogo()

    response.header('Content-Type', image.contentType)
    response.header('Content-Disposition', `inline; filename="${image.filename}"`)
    response.header('Cache-Control', 'public, max-age=3600')
    return response.send(image.bytes)
  }

  async deleteLogo({ serialize }: HttpContext) {
    const profile = await this.businessProfileService.eliminarLogo()

    return serialize({
      business_profile: serializeBusinessProfile(profile),
    })
  }

  async getPrinting({ serialize }: HttpContext) {
    const result = await this.printConfigService.obtener()

    return serialize({
      print_config: result.printConfig,
      persisted: result.persisted,
    })
  }

  async updatePrinting({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updatePrintConfigValidator)
    const scope = payload.scope ?? 'full'
    const result = await this.printConfigService.guardarPatch(scope, {
      scope,
      ticket: payload.ticket ? { station_label: payload.ticket.station_label ?? '' } : undefined,
      formats: payload.formats,
      documents: payload.documents
        ? {
            invoice: {
              ...payload.documents.invoice,
              deviceName: payload.documents.invoice.deviceName ?? '',
            },
            deliveryNote: {
              ...payload.documents.deliveryNote,
              deviceName: payload.documents.deliveryNote.deviceName ?? '',
            },
            comanda: {
              ...payload.documents.comanda,
              deviceName: payload.documents.comanda.deviceName ?? '',
            },
          }
        : undefined,
      behavior: payload.behavior,
      categoryRouting: payload.categoryRouting,
    })

    return serialize({
      print_config: result.printConfig,
      persisted: result.persisted,
    })
  }
}
