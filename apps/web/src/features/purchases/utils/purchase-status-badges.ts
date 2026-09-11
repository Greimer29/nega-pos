import type { PurchaseEstado } from '@/features/purchases/constants'

export type PurchaseStatusTone = 'draft' | 'pending' | 'overdue' | 'done'

export type PurchaseStatusBadge = {
  tone: PurchaseStatusTone
  label: string
}

export const PURCHASE_STATUS_LEGEND: Array<{ tone: PurchaseStatusTone; label: string }> = [
  { tone: 'draft', label: 'Borrador' },
  { tone: 'pending', label: 'Pendiente por pagar' },
  { tone: 'overdue', label: 'Vencida' },
  { tone: 'done', label: 'Pagada o anulada' },
]

const TONE_CLASS: Record<PurchaseStatusTone, string> = {
  draft: 'bg-yellow-400',
  pending: 'bg-orange-500',
  overdue: 'bg-red-500',
  done: 'bg-sky-500',
}

export function purchaseStatusToneClass(tone: PurchaseStatusTone) {
  return TONE_CLASS[tone]
}

function isOverdue(creditDueDate: string | null | undefined, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(creditDueDate && creditDueDate < today)
}

export function resolvePurchaseStatusBadges(
  purchase: {
    status: PurchaseEstado
    isCredit: boolean
    balanceUsd?: string | number | null
    creditDueDate?: string | null
  },
  today = new Date().toISOString().slice(0, 10)
): PurchaseStatusBadge[] {
  if (purchase.status === 'DRAFT') {
    return [{ tone: 'draft', label: 'Borrador' }]
  }

  if (purchase.status === 'VOIDED') {
    return [{ tone: 'done', label: 'Anulada' }]
  }

  const pendingBalance = purchase.isCredit && Number(purchase.balanceUsd ?? 0) > 0
  if (!pendingBalance) {
    return [{ tone: 'done', label: 'Pagada' }]
  }

  const badges: PurchaseStatusBadge[] = [{ tone: 'pending', label: 'Pendiente' }]
  if (isOverdue(purchase.creditDueDate, today)) {
    badges.push({ tone: 'overdue', label: 'Vencida' })
  }
  return badges
}
