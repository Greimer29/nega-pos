import CodigoMetodoPagoDuplicadoException from '#exceptions/codigo_metodo_pago_duplicado_exception'
import MetodoPagoNoEncontradoException from '#exceptions/metodo_pago_no_encontrado_exception'
import UltimoMetodoPagoActivoException from '#exceptions/ultimo_metodo_pago_activo_exception'
import PaymentMethod from '#models/payment_method'
import Sale from '#models/sale'
import CurrencyService from '#services/currency_service'

export type PaymentMethodInput = {
  code: string
  name: string
  currency_code: string
  is_active?: boolean
  sort_order?: number
}

export type UpdatePaymentMethodInput = {
  name?: string
  currency_code?: string
  is_active?: boolean
  sort_order?: number
}

export default class PaymentMethodService {
  private currencyService = new CurrencyService()

  async listar(activeOnly = false): Promise<PaymentMethod[]> {
    const query = PaymentMethod.query().orderBy('sortOrder', 'asc').orderBy('name', 'asc')

    if (activeOnly) {
      query.where('isActive', true)
    }

    return query
  }

  async obtener(code: string): Promise<PaymentMethod> {
    const method = await PaymentMethod.findBy('code', code.trim().toLowerCase())
    if (!method) {
      throw new MetodoPagoNoEncontradoException()
    }
    return method
  }

  async assertActivo(code: string): Promise<PaymentMethod> {
    const method = await this.obtener(code)
    if (!method.isActive) {
      throw new MetodoPagoNoEncontradoException('El método de pago no está activo')
    }
    return method
  }

  async crear(input: PaymentMethodInput): Promise<PaymentMethod> {
    const code = input.code.trim().toLowerCase()
    await this.assertCodigoUnico(code)
    await this.currencyService.assertActiva(input.currency_code)

    const maxSort = await PaymentMethod.query().max('sort_order as maxSort')
    const nextSort = input.sort_order ?? Number(maxSort[0].$extras.maxSort ?? 0) + 1

    return PaymentMethod.create({
      code,
      name: input.name.trim(),
      currencyCode: input.currency_code.trim().toUpperCase(),
      isActive: input.is_active ?? true,
      sortOrder: nextSort,
    })
  }

  async actualizar(code: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod> {
    const method = await this.obtener(code)

    if (input.currency_code !== undefined) {
      await this.currencyService.assertActiva(input.currency_code)
      method.currencyCode = input.currency_code.trim().toUpperCase()
    }

    if (input.name !== undefined) {
      method.name = input.name.trim()
    }

    if (input.sort_order !== undefined) {
      method.sortOrder = input.sort_order
    }

    if (input.is_active === false) {
      await this.assertPuedeDesactivar(method.code)
      method.isActive = false
    } else if (input.is_active === true) {
      method.isActive = true
    }

    await method.save()
    return method
  }

  async eliminar(code: string): Promise<{ code: string; modo: 'soft' | 'hard' }> {
    const method = await this.obtener(code)
    const inUse = await Sale.query().where('paymentMethodCode', method.code).first()

    if (inUse) {
      await this.assertPuedeDesactivar(method.code)
      method.isActive = false
      await method.save()
      return { code: method.code, modo: 'soft' }
    }

    await method.delete()
    return { code: method.code, modo: 'hard' }
  }

  async snapshotRateForMethod(code: string): Promise<{ usdRate: string; totalBs: string | null }> {
    const method = await this.assertActivo(code)
    const currency = await this.currencyService.assertActiva(method.currencyCode)
    const usdRate = Number(currency.ratePerUsd)

    return {
      usdRate: currency.ratePerUsd,
      totalBs: usdRate > 0 ? null : null,
    }
  }

  applyTotalsFromRate(totalUsd: number, usdRate: string): { usdRate: string; totalBs: string | null } {
    const rate = Number(usdRate)
    return {
      usdRate: usdRate,
      totalBs: rate > 0 ? (totalUsd * rate).toFixed(2) : null,
    }
  }

  private async assertCodigoUnico(code: string) {
    const existing = await PaymentMethod.findBy('code', code)
    if (existing) {
      throw new CodigoMetodoPagoDuplicadoException()
    }
  }

  private async assertPuedeDesactivar(code: string) {
    const activeCount = await PaymentMethod.query().where('isActive', true).count('* as total')
    const total = Number(activeCount[0].$extras.total ?? 0)

    const method = await this.obtener(code)
    if (method.isActive && total <= 1) {
      throw new UltimoMetodoPagoActivoException()
    }
  }

  async countActivos(): Promise<number> {
    const result = await PaymentMethod.query().where('isActive', true).count('* as total')
    return Number(result[0].$extras.total ?? 0)
  }
}
