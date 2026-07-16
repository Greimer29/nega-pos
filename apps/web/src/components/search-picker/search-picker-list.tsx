import { Loader2, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SearchPickerItem = {
  id: string
  code: string
  title: string
  subtitle?: string
  meta?: string
}

type SearchPickerListProps = {
  items: SearchPickerItem[]
  isLoading: boolean
  emptyMessage: string
  hint?: string
  onSelect: (id: string) => void
  className?: string
  maxHeightClassName?: string
}

export function SearchPickerList({
  items,
  isLoading,
  emptyMessage,
  hint,
  onSelect,
  className,
  maxHeightClassName = 'max-h-56',
}: SearchPickerListProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'text-muted-foreground flex items-center justify-center gap-2 rounded-lg border bg-muted/20 px-3 py-6 text-sm',
          className
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        Buscando…
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'text-muted-foreground rounded-lg border border-dashed bg-muted/10 px-3 py-6 text-center text-sm',
          className
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-background shadow-sm', className)}>
      {hint ? (
        <p className="text-muted-foreground border-b bg-muted/30 px-3 py-2 text-xs">{hint}</p>
      ) : null}
      <ul className={cn('divide-y overflow-y-auto', maxHeightClassName)}>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="hover:bg-muted/60 focus-visible:bg-muted/60 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline-hidden"
              onClick={() => onSelect(item.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-mono text-xs font-semibold tracking-wide text-primary">
                    {item.code}
                  </span>
                  {item.meta ? (
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">
                      {item.meta}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.subtitle ? (
                  <p className="text-muted-foreground truncate text-xs">{item.subtitle}</p>
                ) : null}
              </div>
              <Plus className="text-muted-foreground size-4 shrink-0 opacity-70" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SearchPickerInputShell({
  children,
  icon,
  className,
}: {
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      {icon ? (
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
          {icon}
        </span>
      ) : null}
      {children}
    </div>
  )
}
