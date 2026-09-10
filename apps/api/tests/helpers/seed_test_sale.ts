import Sale from '#models/sale'
import SaleLine from '#models/sale_line'
import SalesShift from '#models/sales_shift'
import { DateTime } from 'luxon'

export type SeedTestSaleLineInput = {
  catalogProductId?: number
  materialId?: number
  description?: string
  quantity: string
  unitPriceUsd: string
  subtotalUsd?: string
  costUsd?: string
  returnedQuantity?: string
}

export type SeedTestSaleInput = {
  code?: string
  customerId?: number | null
  guestName?: string | null
  soldAt?: DateTime
  confirmedAt?: DateTime
  status?: 'DRAFT' | 'COMPLETED' | 'RETURNED'
  billingMode?: 'FAST' | 'ORDER'
  orderStatus?: 'PENDING' | 'IN_PROCESS' | 'DELIVERED'
  paymentType?: 'CASH' | 'CREDIT'
  paymentMethodCode?: string | null
  totalUsd: string
  amountPaidUsd?: string
  balanceUsd?: string
  creditDueDate?: DateTime | null
  salesShiftId?: number | null
  lines: SeedTestSaleLineInput[]
}

let nextCodeNumber = 0

export function resetTestSaleCodes() {
  nextCodeNumber = 0
}

function allocateCode(override?: string) {
  if (override) {
    return override
  }

  nextCodeNumber += 1
  return String(nextCodeNumber).padStart(10, '0')
}

export async function seedOpenSalesShift(userId: number) {
  return SalesShift.create({
    openedAt: DateTime.now(),
    openedByUserId: userId,
    closedByUserId: null,
    status: 'OPEN',
    notes: null,
  })
}

export async function seedTestSale(input: SeedTestSaleInput) {
  const soldAt = input.soldAt ?? DateTime.now()
  const total = input.totalUsd
  const isCredit = input.paymentType === 'CREDIT'
  const amountPaid = input.amountPaidUsd ?? (isCredit ? '0.0000' : total)
  const balance = input.balanceUsd ?? (isCredit ? total : '0.0000')

  const sale = await Sale.create({
    code: allocateCode(input.code),
    customerId: input.customerId ?? null,
    guestName: input.guestName ?? null,
    status: input.status ?? 'COMPLETED',
    billingMode: input.billingMode ?? 'FAST',
    orderStatus: input.orderStatus ?? 'DELIVERED',
    paymentType: input.paymentType ?? 'CASH',
    paymentMethodCode: input.paymentMethodCode ?? (isCredit ? null : 'cash_usd'),
    totalUsd: total,
    amountPaidUsd: amountPaid,
    balanceUsd: balance,
    creditDueDate: input.creditDueDate ?? null,
    soldAt,
    confirmedAt: input.confirmedAt ?? soldAt,
    salesShiftId: input.salesShiftId ?? null,
  })

  for (const line of input.lines) {
    const subtotal =
      line.subtotalUsd ?? (Number(line.quantity) * Number(line.unitPriceUsd)).toFixed(4)

    await SaleLine.create({
      saleId: Number(sale.id),
      catalogProductId: line.catalogProductId ?? null,
      materialId: line.materialId ?? null,
      description: line.description ?? 'Línea de venta',
      quantity: line.quantity,
      unitPriceUsd: line.unitPriceUsd,
      subtotalUsd: subtotal,
      costUsd: line.costUsd ?? null,
      returnedQuantity: line.returnedQuantity ?? '0',
    })
  }

  return sale
}
