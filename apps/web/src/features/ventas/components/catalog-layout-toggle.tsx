import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CatalogLayout } from '@/features/ventas/hooks/use-catalog-layout'
import { cn } from '@/lib/utils'

type CatalogLayoutToggleProps = {
  layout: CatalogLayout
  onToggle: () => void
  className?: string
}

export function CatalogLayoutToggle({ layout, onToggle, className }: CatalogLayoutToggleProps) {
  const isTable = layout === 'table'
  const title = isTable ? 'Ver catálogo en tarjetas' : 'Ver catálogo en tabla'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('shrink-0 bg-white', className)}
      title={title}
      aria-label={title}
      aria-pressed={isTable}
      onClick={onToggle}
    >
      {isTable ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
    </Button>
  )
}
