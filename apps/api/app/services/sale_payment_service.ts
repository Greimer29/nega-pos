import ClienteSinCreditoException from '#exceptions/cliente_sin_credito_exception'
import TasaCambioInvalidaException from '#exceptions/tasa_cambio_invalida_exception'
import CurrencyService from '#services/currency_service'
import PaymentMethodService from '#services/payment_method_service'
import type { SalePaymentLineInput } from '#utils/sale_payment_lines'
import { prepareSalePaymentLines } from '#utils/sale_payment_lines'
import { formatSaleNativeTotal } from '#utils/currency_amount'
import { nowInAppZone } from '#utils/app_timezone'
import SalePayment from '#models/sale_payment'
import type Sale from '#models/sale'
import Customer from '#models/customer'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type SalePaymentConfirmationInput = {
  payment_method_code?: string | null
  currency_code?: string | null
  usd_rate?: number | null
  payments?: SalePaymentLineInput[]
}

type SalePaymentType = 'CASH' | 'CREDIT'

export default class SalePaymentService {
  private paymentMethodService = new PaymentMethodService()
  private currencyService = new CurrencyService()

  async applyConfirmationPayments(
    sale: Sale,
    paymentType: SalePaymentType,
    input: SalePaymentConfirmationInput,
    trx: TransactionClientContract
  ) {
    const totalUsd = Number(sale.totalUsd)

    if (paymentType === 'CREDIT') {
      sale.paymentMethodCode = null
      sale.usdRate = null
      sale.totalBs = null
      await SalePayment.query({ client: trx }).where('saleId', Number(sale.id)).delete()
      return
    }

    const paymentLines = prepareSalePaymentLines(input, totalUsd)
    const baseCode = await this.currencyService.getBaseCurrencyCode()
    const resolved: Array<{
      paymentMethodCode: string
      amountUsd: string
      currencyCode: string
      usdRate: string
      amountNative: string | null
    }> = []

    for (const line of paymentLines) {
      const code = line.payment_method_code
      const amountUsd = Number(line.amount_usd)

      const method = await this.paymentMethodService.assertActivo(code)
      const currencyCode = (line.currency_code?.trim() || method.currencyCode).toUpperCase()
      const currency = await this.currencyService.assertActiva(currencyCode)
      const overrideRate =
        line.usd_rate !== undefined && line.usd_rate !== null ? Number(line.usd_rate) : Number.NaN
      const rate = overrideRate > 0 ? overrideRate : Number(currency.ratePerUsd)

      if (!(rate > 0)) {
        throw new TasaCambioInvalidaException(`La tasa de cambio de ${currencyCode} no es válida`)
      }

      resolved.push({
        paymentMethodCode: method.code,
        amountUsd: amountUsd.toFixed(4),
        currencyCode,
        usdRate: rate.toFixed(4),
        amountNative: formatSaleNativeTotal(amountUsd, currencyCode, rate, baseCode),
      })
    }

    const first = resolved[0]!
    sale.paymentMethodCode = first.paymentMethodCode
    sale.usdRate = first.usdRate
    sale.totalBs = formatSaleNativeTotal(
      totalUsd,
      first.currencyCode,
      Number(first.usdRate),
      baseCode
    )

    await SalePayment.query({ client: trx }).where('saleId', Number(sale.id)).delete()

    for (const [index, payment] of resolved.entries()) {
      await SalePayment.create(
        {
          saleId: Number(sale.id),
          paymentMethodCode: payment.paymentMethodCode,
          amountUsd: payment.amountUsd,
          currencyCode: payment.currencyCode,
          usdRate: payment.usdRate,
          amountNative: payment.amountNative,
          sortOrder: index,
        },
        { client: trx }
      )
    }
  }

  async applySaleBalanceAndDueDate(
    sale: Sale,
    paymentType: SalePaymentType,
    trx: TransactionClientContract
  ) {
    const totalUsd = Number(sale.totalUsd)

    if (paymentType === 'CREDIT') {
      if (!sale.customerId) {
        throw new ClienteSinCreditoException()
      }
      const customer = sale.customer ?? (await Customer.find(sale.customerId))
      if (!customer?.creditDays || customer.creditDays <= 0) {
        throw new ClienteSinCreditoException()
      }
      sale.balanceUsd = totalUsd.toFixed(4)
      sale.amountPaidUsd = '0.0000'
      sale.creditDueDate = nowInAppZone().plus({ days: customer.creditDays }).startOf('day')
    } else {
      sale.balanceUsd = '0.0000'
      sale.amountPaidUsd = totalUsd.toFixed(4)
      sale.creditDueDate = null
    }

    sale.useTransaction(trx)
    await sale.save()
  }
}
