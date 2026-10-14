import FacturaProveedorCuentaRequeridaException from '#exceptions/factura_proveedor_cuenta_requerida_exception'
import SupplierNoEncontradoException from '#exceptions/proveedor_no_encontrado_exception'
import Purchase from '#models/purchase'
import Supplier from '#models/supplier'
import AccountService from '#services/account_service'
import CurrencyService from '#services/currency_service'
import { resolveMonetaryEntryAmount } from '#utils/monetary_entry'
import type { SupplierInvoiceValidatorPayload } from '#validators/supplier_invoice'
import { DateTime } from 'luxon'

export type SupplierInvoiceResult = { kind: 'purchase'; purchase: Purchase }

/**
 * Facturas desde ficha de proveedor (sin líneas de inventario).
 * Contado y crédito son compras: afectan caja/CxP del negocio en el tiempo,
 * no se registran como gasto operativo del día (eso es `expenses` sin proveedor).
 */
export default class SupplierInvoiceService {
  private accountService = new AccountService()
  private currencyService = new CurrencyService()

  async registrar(
    supplierId: number,
    input: SupplierInvoiceValidatorPayload
  ): Promise<SupplierInvoiceResult> {
    const supplier = await Supplier.find(supplierId)
    if (!supplier) {
      throw new SupplierNoEncontradoException()
    }

    const resolved = await resolveMonetaryEntryAmount({
      amountNative: input.amount,
      currencyCode: input.currency_code,
      entryRate: input.entry_rate,
      currencyService: this.currencyService,
    })

    const invoiceNumber = input.invoice_number?.trim() || null
    const note = input.note?.trim() || null

    if (input.is_credit) {
      const purchase = await Purchase.create({
        supplierId,
        accountId: null,
        date: DateTime.fromISO(input.date),
        invoiceNumber,
        notes: note,
        entryCurrencyCode: resolved.currencyCode,
        usdRate: resolved.entryRate,
        totalUsd: resolved.amountUsd,
        totalBs: Number(resolved.amountNative).toFixed(2),
        status: 'CONFIRMED',
        isCredit: true,
        affectsInventory: false,
        creditDueDate: input.credit_due_date ? DateTime.fromISO(input.credit_due_date) : null,
        amountPaidUsd: '0.0000',
        balanceUsd: resolved.amountUsd,
      })

      return { kind: 'purchase', purchase }
    }

    if (!input.account_id) {
      throw new FacturaProveedorCuentaRequeridaException()
    }

    await this.accountService.assertActiva(input.account_id)

    // Contado sin stock: compra pagada. Sale de caja del negocio, no del “día de ventas”.
    const purchase = await Purchase.create({
      supplierId,
      accountId: input.account_id,
      date: DateTime.fromISO(input.date),
      invoiceNumber,
      notes: note,
      entryCurrencyCode: resolved.currencyCode,
      usdRate: resolved.entryRate,
      totalUsd: resolved.amountUsd,
      totalBs: Number(resolved.amountNative).toFixed(2),
      status: 'CONFIRMED',
      isCredit: false,
      affectsInventory: false,
      creditDueDate: null,
      amountPaidUsd: resolved.amountUsd,
      balanceUsd: '0.0000',
    })

    return { kind: 'purchase', purchase }
  }
}
