import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

type FilterSectionProps = {
  title: string
  icon: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export function FilterSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-neutral-500 transition-transform',
            open ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>
      {open ? children : null}
    </div>
  )
}

type FiltersPanelProps = {
  onClearAll: () => void
  children: ReactNode
  className?: string
}

export function FiltersPanel({ onClearAll, children, className }: FiltersPanelProps) {
  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col gap-5 bg-transparent p-4',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 pr-12">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <Filter className="size-4" />
          Filtros
        </div>
        <button
          type="button"
          className="text-sm font-medium text-violet-700 hover:text-violet-900 hover:underline"
          onClick={onClearAll}
        >
          Limpiar todo
        </button>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
        {children}
      </div>
    </aside>
  )
}
