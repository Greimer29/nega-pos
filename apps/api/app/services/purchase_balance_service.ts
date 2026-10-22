import CompraCreditoSinVencimientoException from '#exceptions/compra_credito_sin_vencimiento_exception'
import type Purchase from '#models/purchase'
import SupplierService from '#services/supplier_service'
import { nowInAppZone } from '#utils/app_timezone'
import { DateTime } from 'luxon'

export type PurchaseBalanceInput = {
  is_credit?: boolean
  credit_due_date?: string
  account_id?: number | null
}

export default class PurchaseBalanceService {
  private supplierService = new SupplierService()

  /**
   * Credit purchases keep the full total as payable until a supplier payment; cash purchases
   * are fully paid at confirmation.
   */
  async applyConfirmationBalance(
    purchase: Purchase,
    input: PurchaseBalanceInput,
    resolvedTotalUsd: number
  ) {
    const isCredit = input.is_credit ?? purchase.isCredit
    if (isCredit) {
      const dueDate =
        input.credit_due_date ??
        purchase.creditDueDate?.toISODate() ??
        (purchase.supplierId ? await this.defaultCreditDueDate(Number(purchase.supplierId)) : null)

      if (!dueDate) {
        throw new CompraCreditoSinVencimientoException()
      }

      purchase.isCredit = true
      purchase.creditDueDate = DateTime.fromISO(dueDate)
      purchase.balanceUsd = resolvedTotalUsd.toFixed(4)
      purchase.amountPaidUsd = '0.0000'
      purchase.accountId = input.account_id === undefined ? purchase.accountId : input.account_id
    } else {
      purchase.isCredit = false
      purchase.creditDueDate = null
      purchase.balanceUsd = '0.0000'
      purchase.amountPaidUsd = resolvedTotalUsd.toFixed(4)
    }
  }

  private async defaultCreditDueDate(supplierId: number): Promise<string | null> {
    const supplier = await this.supplierService.obtener(supplierId)
    if (!supplier.creditDays || supplier.creditDays <= 0) {
      return null
    }
    return nowInAppZone().plus({ days: supplier.creditDays }).toISODate()
  }
}
