import { BarChart3, ChevronDown, Package } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  REPORT_HUB_OPTIONS,
  type ReportsHubTab,
} from '@/features/reports/constants'
import { reportUi } from '@/features/reports/report-ui'
import { cn } from '@/lib/utils'

const HUB_ICONS: Record<ReportsHubTab, ReactNode> = {
  financiero: <BarChart3 className="size-3.5 text-[#0d3d2e]" />,
  inventario: <Package className="size-3.5 text-[#0d3d2e]" />,
}

type ReportHubSelectProps = {
  value: ReportsHubTab
  onChange: (tab: ReportsHubTab) => void
}

export function ReportHubSelect({ value, onChange }: ReportHubSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = REPORT_HUB_OPTIONS.find((option) => option.id === value) ?? REPORT_HUB_OPTIONS[0]

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          reportUi.chip,
          'cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/15',
          open && 'ring-2 ring-neutral-900/10'
        )}
      >
        {HUB_ICONS[value]}
        {selected.label}
        <ChevronDown
          className={cn('size-3.5 text-neutral-500 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Tipo de reporte"
          className="absolute left-0 z-20 mt-2 min-w-[14rem] overflow-hidden rounded-2xl border border-neutral-200 bg-white py-1 shadow-md md:left-auto md:right-0"
        >
          {REPORT_HUB_OPTIONS.map((option) => {
            const active = option.id === value
            return (
              <li key={option.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium tracking-wide text-neutral-700 uppercase transition-colors',
                    active ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-50'
                  )}
                  onClick={() => {
                    onChange(option.id)
                    setOpen(false)
                  }}
                >
                  {HUB_ICONS[option.id]}
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
