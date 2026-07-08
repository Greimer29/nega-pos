import type MachineExpense from '#models/machine_expense'
import type Machine from '#models/machine'
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
    extra: { totalSpent?: string; expenses?: ReturnType<typeof serializeMachineExpense>[] } = {}
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
  extra: { totalSpent?: string; expenses?: ReturnType<typeof serializeMachineExpense>[] } = {}
) {
  return new MachineTransformer(machine).toObject(extra)
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
