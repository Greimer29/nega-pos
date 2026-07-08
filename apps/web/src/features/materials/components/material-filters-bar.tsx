import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  CATEGORIA_LABELS,
  MATERIAL_CATEGORIAS,
  SORT_BY_LABELS,
  STATUS_FILTER_LABELS,
} from '@/features/materials/constants'
import type { MaterialCategoria, MaterialSortBy, MaterialStatusFilter } from '@/features/materials/types'
import { cn } from '@/lib/utils'

type MaterialFiltersBarProps = {
  searchInput: string
  onSearchChange: (value: string) => void
  status: MaterialStatusFilter | ''
  onStatusChange: (value: MaterialStatusFilter | '') => void
  category: MaterialCategoria | ''
  onCategoryChange: (value: MaterialCategoria | '') => void
  sortBy: MaterialSortBy
  onSortByChange: (value: MaterialSortBy) => void
  layout?: 'bar' | 'sidebar'
  hideSearch?: boolean
}

export function MaterialFiltersBar({
  searchInput,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  sortBy,
  onSortByChange,
  layout = 'bar',
  hideSearch = false,
}: MaterialFiltersBarProps) {
  const isSidebar = layout === 'sidebar'

  return (
    <div className={cn('flex flex-col gap-3', !isSidebar && 'border-b pb-4')}>
      {!hideSearch ? (
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Código, código prov. o nombre…"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      ) : null}

      <div className={cn('grid gap-3', isSidebar ? 'grid-cols-1' : 'sm:grid-cols-3')}>
        <div className="space-y-1.5">
          <label htmlFor="filter-status" className="text-muted-foreground text-xs font-medium">
            Estatus
          </label>
          <select
            id="filter-status"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as MaterialStatusFilter | '')}
          >
            <option value="">Todos</option>
            {(Object.keys(STATUS_FILTER_LABELS) as MaterialStatusFilter[]).map((key) => (
              <option key={key} value={key}>
                {STATUS_FILTER_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-category" className="text-muted-foreground text-xs font-medium">
            Categoría
          </label>
          <select
            id="filter-category"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as MaterialCategoria | '')}
          >
            <option value="">Todas</option>
            {MATERIAL_CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORIA_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="filter-ranking" className="text-muted-foreground text-xs font-medium">
            Ranking
          </label>
          <select
            id="filter-ranking"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as MaterialSortBy)}
          >
            {(Object.keys(SORT_BY_LABELS) as MaterialSortBy[]).map((key) => (
              <option key={key} value={key}>
                {SORT_BY_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
