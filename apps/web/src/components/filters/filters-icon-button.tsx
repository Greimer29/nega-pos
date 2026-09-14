import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FiltersIconButtonProps = {
  count?: number
  expanded?: boolean
  controls?: string
  onClick: () => void
  className?: string
  title?: string
}

export function FiltersIconButton({
  count = 0,
  expanded = false,
  controls,
  onClick,
  className,
  title = 'Filtros',
}: FiltersIconButtonProps) {
  const label = count > 99 ? '99+' : String(count)

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('relative shrink-0 bg-white', className)}
      title={title}
      aria-label={title}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
    >
      <SlidersHorizontal className="size-4" />
      {count > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
          {label}
        </span>
      ) : null}
    </Button>
  )
}
