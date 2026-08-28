import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import type { DailyExpenseItem } from '@/features/dashboard/types'
import { cn } from '@/lib/utils'

function expenseKindLabel(item: DailyExpenseItem) {
  return item.kind === 'machine_expense' ? 'Gasto máquina' : 'Gasto empresa'
}

function expenseDetail(item: DailyExpenseItem) {
  if (item.kind === 'machine_expense' && item.machine_name) {
    return item.category ? `${item.machine_name} · ${item.category}` : item.machine_name
  }
  return null
}

type DailyExpenseListProps = {
  items: DailyExpenseItem[]
  emptyMessage?: string
}

export function DailyExpenseList({
  items,
  emptyMessage = 'No hay gastos registrados en esta fecha.',
}: DailyExpenseListProps) {
  if (items.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const detail = expenseDetail(item)

        return (
          <div
            key={`${item.kind}-${item.id}`}
            className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4"
          >
            <div className="min-w-0 space-y-1">
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  item.kind === 'machine_expense'
                    ? 'bg-teal-50 text-teal-800'
                    : 'bg-slate-100 text-slate-700'
                )}
              >
                {expenseKindLabel(item)}
              </span>
              <p className="font-medium text-neutral-900">{item.description}</p>
              {detail ? <p className="text-muted-foreground text-sm">{detail}</p> : null}
            </div>
            <DisplayMoneyFromUsd
              amountUsd={item.amount_usd}
              className="shrink-0 text-sm font-semibold text-neutral-900"
            />
          </div>
        )
      })}
    </div>
  )
}
