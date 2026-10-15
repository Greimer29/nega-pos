import PagoClienteExcedeSaldoException from '#exceptions/pago_cliente_excede_saldo_exception'
import PagoClienteMontoInvalidoException from '#exceptions/pago_cliente_monto_invalido_exception'
import ClienteNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import VentaNoEncontradaException from '#exceptions/venta_no_encontrada_exception'
import Customer from '#models/customer'
import CustomerPayment from '#models/customer_payment'
import Sale from '#models/sale'
import AccountService from '#services/account_service'
import CurrencyService from '#services/currency_service'
import { resolveMonetaryEntryAmount } from '#utils/monetary_entry'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export type CustomerPaymentInput = {
  customer_id: number
  sale_id?: number | null
  order_id?: number | null
  account_id?: number | null
  /** Monto en moneda de ingreso. Preferido; si falta se usa amount_usd (base). */
  amount?: number
  amount_usd?: number
  currency_code?: string
  entry_rate?: number
  date: string
  note?: string
}

export type CustomerAccountStatement = {
  customer: Customer
  sales: Sale[]
  payments: CustomerPayment[]
  saldoPendienteUsd: string
}

export default class CustomerPaymentService {
  private accountService = new AccountService()
  private currencyService = new CurrencyService()

  async registrar(input: CustomerPaymentInput): Promise<CustomerPayment> {
    const customer = await Customer.find(input.customer_id)
    if (!customer) {
      throw new ClienteNoEncontradoException()
    }

    if (input.account_id) {
      await this.accountService.assertActiva(input.account_id)
    }

    const amountNative = input.amount ?? input.amount_usd
    if (amountNative === undefined || !(amountNative > 0)) {
      throw new PagoClienteMontoInvalidoException()
    }

    const monetary = await resolveMonetaryEntryAmount({
      amountNative,
      currencyCode: input.currency_code,
      entryRate: input.entry_rate,
      currencyService: this.currencyService,
    })
    const amountUsd = Number(monetary.amountUsd)

    return db.transaction(async (trx) => {
      let remaining = amountUsd

      if (input.sale_id) {
        const sale = await Sale.query({ client: trx })
          .where('id', input.sale_id)
          .where('customerId', input.customer_id)
          .forUpdate()
          .first()

        if (!sale) {
          throw new VentaNoEncontradaException()
        }

        const balance = Number(sale.balanceUsd)
        const applied = Math.min(remaining, balance)
        sale.amountPaidUsd = (Number(sale.amountPaidUsd) + applied).toFixed(4)
        sale.balanceUsd = Math.max(0, balance - applied).toFixed(4)
        sale.useTransaction(trx)
        await sale.save()
        remaining -= applied
      } else {
        const sales = await Sale.query({ client: trx })
          .where('customerId', input.customer_id)
          .where('balanceUsd', '>', 0)
          .where('status', 'COMPLETED')
          .orderBy('creditDueDate', 'asc')
          .orderBy('id', 'asc')
          .forUpdate()

        for (const sale of sales) {
          if (remaining <= 0) break
          const balance = Number(sale.balanceUsd)
          const applied = Math.min(remaining, balance)
          sale.amountPaidUsd = (Number(sale.amountPaidUsd) + applied).toFixed(4)
          sale.balanceUsd = Math.max(0, balance - applied).toFixed(4)
          sale.useTransaction(trx)
          await sale.save()
          remaining -= applied
        }
      }

      if (remaining > 0.0001) {
        throw new PagoClienteExcedeSaldoException()
      }

      const appliedAmount = amountUsd - remaining

      return CustomerPayment.create(
        {
          customerId: input.customer_id,
          saleId: input.sale_id ?? null,
          orderId: input.order_id ?? null,
          accountId: input.account_id ?? null,
          amountUsd: appliedAmount.toFixed(4),
          currencyCode: monetary.currencyCode,
          entryRate: monetary.entryRate,
          amountNative: monetary.amountNative,
          date: DateTime.fromISO(input.date),
          note: input.note?.trim() || null,
        },
        { client: trx }
      )
    })
  }

  async listarPorCliente(customerId: number) {
    return CustomerPayment.query()
      .where('customerId', customerId)
      .preload('sale')
      .preload('order')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
  }

  async estadoCuenta(customerId: number): Promise<CustomerAccountStatement> {
    const customer = await Customer.find(customerId)
    if (!customer) {
      throw new ClienteNoEncontradoException()
    }

    const sales = await Sale.query()
      .where('customerId', customerId)
      .where('status', 'COMPLETED')
      .preload('saleLines')
      .orderBy('confirmedAt', 'desc')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')

    const payments = await this.listarPorCliente(customerId)

    const saldo = sales
      .filter((sale) => sale.paymentType === 'CREDIT')
      .reduce((sum, sale) => sum + Number(sale.balanceUsd), 0)

    return {
      customer,
      sales,
      payments,
      saldoPendienteUsd: saldo.toFixed(4),
    }
  }
}
