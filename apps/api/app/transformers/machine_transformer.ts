import type MachineExpense from '#models/machine_expense'
import type Machine from '#models/machine'
import type MachinePayment from '#models/machine_payment'
import type Supplier from '#models/supplier'
import { serializeAccountResumen } from '#transformers/account_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

function serializeSupplierResumen(supplier: Supplier) {
  return {
    id: Number(supplier.id),
    name: supplier.name,
  }
}

export default class MachineTransformer extends BaseTransformer<Machine> {
  toObject(
    extra: {
      totalSpent?: string
      expenses?: Array<ReturnType<typeof serializeMachineExpense> | Record<string, unknown>>
    } = {}
  ) {
    return {
      id: Number(this.resource.id),
      name: this.resource.name,
      type: this.resource.type,
      brand: this.resource.brand,
      model: this.resource.model,
      serialNumber: this.resource.serialNumber,
      acquisitionDate: this.resource.acquisitionDate?.toISODate() ?? null,
      acquisitionCost: this.resource.acquisitionCost,
      acquisitionAmountNative: this.resource.acquisitionAmountNative,
      entryCurrencyCode: this.resource.entryCurrencyCode,
      entryRate: this.resource.entryRate,
      isCredit: Boolean(this.resource.isCredit),
      amountPaidUsd: this.resource.amountPaidUsd ?? '0.0000',
      balanceUsd: this.resource.balanceUsd ?? '0.0000',
      creditDueDate: this.resource.creditDueDate?.toISODate() ?? null,
      sourcePurchaseItemId: this.resource.sourcePurchaseItemId
        ? Number(this.resource.sourcePurchaseItemId)
        : null,
      status: this.resource.status,
      location: this.resource.location,
      notes: this.resource.notes,
      active: Boolean(this.resource.active),
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
      ...(extra.totalSpent !== undefined ? { totalSpent: extra.totalSpent } : {}),
      ...(extra.expenses !== undefined ? { expenses: extra.expenses } : {}),
    }
  }
}

export function serializeMachine(
  machine: Machine,
  extra: {
    totalSpent?: string
    expenses?: Array<ReturnType<typeof serializeMachineExpense> | Record<string, unknown>>
  } = {}
) {
  return new MachineTransformer(machine).toObject(extra)
}

export function serializeMachinePayment(payment: MachinePayment) {
  return {
    id: Number(payment.id),
    machineId: Number(payment.machineId),
    accountId: payment.accountId ? Number(payment.accountId) : null,
    amountUsd: payment.amountUsd,
    currencyCode: payment.currencyCode,
    entryRate: payment.entryRate,
    amountNative: payment.amountNative,
    date: payment.date.toISODate(),
    note: payment.note,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    ...(payment.account ? { account: serializeAccountResumen(payment.account) } : {}),
  }
}

export function serializeMachineExpense(expense: MachineExpense) {
  return {
    id: Number(expense.id),
    machineId: Number(expense.machineId),
    date: expense.date.toISODate(),
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    currencyCode: expense.currencyCode ?? 'USD',
    accountId: expense.accountId ? Number(expense.accountId) : null,
    supplierId: expense.supplierId ? Number(expense.supplierId) : null,
    tieneComprobante: Boolean(expense.receiptFile),
    notes: expense.notes,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    ...(expense.supplier ? { supplier: serializeSupplierResumen(expense.supplier) } : {}),
    ...(expense.account ? { account: serializeAccountResumen(expense.account) } : {}),
    ...(expense.machine
      ? {
          machine: {
            id: Number(expense.machine.id),
            name: expense.machine.name,
          },
        }
      : {}),
  }
}
