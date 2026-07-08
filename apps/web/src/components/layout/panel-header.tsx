import type { ReactNode } from 'react'
import { DisplayCurrencyToggle } from '@/features/currencies/components/display-currency-toggle'
import { cn } from '@/lib/utils'

type PanelHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  showCurrencyToggle?: boolean
  className?: string
}

export function PanelHeader({
  title,
  description,
  actions,
  showCurrencyToggle = false,
  className,
}: PanelHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showCurrencyToggle ? <DisplayCurrencyToggle /> : null}
        {actions}
      </div>
    </div>
  )
}
