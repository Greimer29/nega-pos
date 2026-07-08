import PagoProveedorExcedeSaldoException from '#exceptions/pago_proveedor_excede_saldo_exception'
import SupplierNoEncontradoException from '#exceptions/proveedor_no_encontrado_exception'
import PurchaseNoEncontradaException from '#exceptions/compra_no_encontrada_exception'
import Supplier from '#models/supplier'
import SupplierPayment from '#models/supplier_payment'
import Purchase from '#models/purchase'
import AccountService from '#services/account_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export type SupplierPaymentInput = {
  supplier_id: number
  purchase_id?: number | null
  account_id?: number | null
  amount_usd: number
  date: string
  note?: string
}

export type SupplierAccountStatement = {
  supplier: Supplier
  purchases: Purchase[]
  payments: SupplierPayment[]
  saldoPendienteUsd: string
}

export default class SupplierPaymentService {
  private accountService = new AccountService()

  async registrar(input: SupplierPaymentInput): Promise<SupplierPayment> {
    const supplier = await Supplier.find(input.supplier_id)
    if (!supplier) {
      throw new SupplierNoEncontradoException()
    }

    if (input.account_id) {
      await this.accountService.assertActiva(input.account_id)
    }

    return db.transaction(async (trx) => {
      let remaining = input.amount_usd

      if (input.purchase_id) {
        const purchase = await Purchase.query({ client: trx })
          .where('id', input.purchase_id)
          .where('supplierId', input.supplier_id)
          .where('isCredit', true)
          .forUpdate()
          .first()

        if (!purchase) {
          throw new PurchaseNoEncontradaException()
        }

        const balance = Number(purchase.balanceUsd)
        const applied = Math.min(remaining, balance)
        purchase.amountPaidUsd = (Number(purchase.amountPaidUsd) + applied).toFixed(4)
        purchase.balanceUsd = Math.max(0, balance - applied).toFixed(4)
        purchase.useTransaction(trx)
        await purchase.save()
        remaining -= applied
      } else {
        const purchases = await Purchase.query({ client: trx })
          .where('supplierId', input.supplier_id)
          .where('isCredit', true)
          .where('status', 'CONFIRMED')
          .where('balanceUsd', '>', 0)
          .orderBy('creditDueDate', 'asc')
          .orderBy('id', 'asc')
          .forUpdate()

        for (const purchase of purchases) {
          if (remaining <= 0) break
          const balance = Number(purchase.balanceUsd)
          const applied = Math.min(remaining, balance)
          purchase.amountPaidUsd = (Number(purchase.amountPaidUsd) + applied).toFixed(4)
          purchase.balanceUsd = Math.max(0, balance - applied).toFixed(4)
          purchase.useTransaction(trx)
          await purchase.save()
          remaining -= applied
        }
      }

      if (remaining > 0.0001) {
        throw new PagoProveedorExcedeSaldoException()
      }

      const appliedAmount = input.amount_usd - remaining

      return SupplierPayment.create(
        {
          supplierId: input.supplier_id,
          purchaseId: input.purchase_id ?? null,
          accountId: input.account_id ?? null,
          amountUsd: appliedAmount.toFixed(4),
          date: DateTime.fromISO(input.date),
          note: input.note?.trim() || null,
        },
        { client: trx }
      )
    })
  }

  async estadoCuenta(supplierId: number): Promise<SupplierAccountStatement> {
    const supplier = await Supplier.find(supplierId)
    if (!supplier) {
      throw new SupplierNoEncontradoException()
    }

    const purchases = await Purchase.query()
      .where('supplierId', supplierId)
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')

    const payments = await SupplierPayment.query()
      .where('supplierId', supplierId)
      .preload('purchase')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')

    const saldo = purchases
      .filter((purchase) => purchase.isCredit && purchase.status === 'CONFIRMED')
      .reduce((sum, purchase) => sum + Number(purchase.balanceUsd), 0)

    return {
      supplier,
      purchases,
      payments,
      saldoPendienteUsd: saldo.toFixed(4),
    }
  }
}
