import ClienteNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import ClienteSinCreditoException from '#exceptions/cliente_sin_credito_exception'
import MetodoPagoRequeridoException from '#exceptions/metodo_pago_requerido_exception'
import TasaCambioInvalidaException from '#exceptions/tasa_cambio_invalida_exception'
import Customer from '#models/customer'
import Sale from '#models/sale'
import SalePayment from '#models/sale_payment'
import CurrencyService from '#services/currency_service'
import PaymentMethodService from '#services/payment_method_service'
import SaleCodigoService from '#services/sale_code_service'
import { formatSaleNativeTotal } from '#utils/currency_amount'
import { resolveMonetaryEntryAmount } from '#utils/monetary_entry'
import type { CustomerInvoiceValidatorPayload } from '#validators/customer_invoice'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class CustomerInvoiceService {
  private currencyService = new CurrencyService()
  private paymentMethodService = new PaymentMethodService()
  private codeService = new SaleCodigoService()

  async registrar(customerId: number, input: CustomerInvoiceValidatorPayload): Promise<Sale> {
    const customer = await Customer.find(customerId)
    if (!customer) {
      throw new ClienteNoEncontradoException()
    }

    const resolved = await resolveMonetaryEntryAmount({
      amountNative: input.amount,
      currencyCode: input.currency_code,
      entryRate: input.entry_rate,
      currencyService: this.currencyService,
    })

    const note = input.note?.trim() || null
    const soldAt = DateTime.fromISO(input.date).startOf('day')
    const totalUsd = resolved.amountUsd

    return db.transaction(async (trx) => {
      const code = await this.codeService.generar(trx)

      if (input.is_credit) {
        if (!customer.creditDays || customer.creditDays <= 0) {
          throw new ClienteSinCreditoException()
        }

        const creditDueDate = input.credit_due_date
          ? DateTime.fromISO(input.credit_due_date)
          : soldAt.plus({ days: customer.creditDays })

        const sale = await Sale.create(
          {
            code,
            customerId,
            guestName: null,
            paymentMethodCode: null,
            paymentType: 'CREDIT',
            billingMode: 'FAST',
            orderStatus: 'DELIVERED',
            discountUsd: '0.0000',
            totalUsd,
            totalBs: null,
            usdRate: null,
            amountPaidUsd: '0.0000',
            balanceUsd: totalUsd,
            creditDueDate,
            notes: note,
            status: 'COMPLETED',
            soldAt,
            confirmedAt: soldAt,
            returnedAt: null,
            salesShiftId: null,
            soldByUserId: null,
          },
          { client: trx }
        )

        await sale.load('customer')
        await sale.load('saleLines')
        return sale
      }

      const paymentMethodCode = input.payment_method_code?.trim()
      if (!paymentMethodCode) {
        throw new MetodoPagoRequeridoException()
      }

      const method = await this.paymentMethodService.assertActivo(paymentMethodCode)
      const currencyCode = (input.currency_code?.trim() || method.currencyCode).toUpperCase()
      const currency = await this.currencyService.assertActiva(currencyCode)
      const overrideRate =
        input.usd_rate !== undefined && input.usd_rate !== null
          ? Number(input.usd_rate)
          : Number.NaN
      const rate =
        overrideRate > 0
          ? overrideRate
          : resolved.entryRate
            ? Number(resolved.entryRate)
            : Number(currency.ratePerUsd)
      const baseCode = await this.currencyService.getBaseCurrencyCode()

      if (!(rate > 0) && currencyCode !== baseCode.toUpperCase()) {
        throw new TasaCambioInvalidaException(`La tasa de cambio de ${currencyCode} no es válida`)
      }

      const effectiveRate = rate > 0 ? rate : 1
      const totalBs = formatSaleNativeTotal(Number(totalUsd), currencyCode, effectiveRate, baseCode)

      const sale = await Sale.create(
        {
          code,
          customerId,
          guestName: null,
          paymentMethodCode: method.code,
          paymentType: 'CASH',
          billingMode: 'FAST',
          orderStatus: 'DELIVERED',
          discountUsd: '0.0000',
          totalUsd,
          totalBs,
          usdRate: effectiveRate.toFixed(4),
          amountPaidUsd: totalUsd,
          balanceUsd: '0.0000',
          creditDueDate: null,
          notes: note,
          status: 'COMPLETED',
          soldAt,
          confirmedAt: soldAt,
          returnedAt: null,
          salesShiftId: null,
          soldByUserId: null,
        },
        { client: trx }
      )

      await SalePayment.create(
        {
          saleId: Number(sale.id),
          paymentMethodCode: method.code,
          amountUsd: totalUsd,
          currencyCode,
          usdRate: effectiveRate.toFixed(4),
          amountNative: totalBs,
          sortOrder: 0,
        },
        { client: trx }
      )

      await sale.load('paymentMethod')
      await sale.load('customer')
      await sale.load('saleLines')
      await sale.load('salePayments', (q) => q.preload('paymentMethod'))
      return sale
    })
  }
}
