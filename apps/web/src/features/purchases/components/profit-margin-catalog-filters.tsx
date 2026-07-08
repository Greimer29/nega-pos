import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import type { CatalogListParams } from '@/features/ventas/types'

type ProfitMarginCatalogFiltersProps = {
  searchInput: string
  onSearchChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  activeOnly: boolean
  onActiveOnlyChange: (value: boolean) => void
}

export function ProfitMarginCatalogFilters({
  searchInput,
  onSearchChange,
  category,
  onCategoryChange,
  activeOnly,
  onActiveOnlyChange,
}: ProfitMarginCatalogFiltersProps) {
  const { data: categories = [] } = useActiveCategoriesQuery()

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="profit-margin-search">Buscar producto</Label>
        <Input
          id="profit-margin-search"
          placeholder="Nombre del producto…"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profit-margin-category">Categoría</Label>
        <select
          id="profit-margin-category"
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">Todas</option>
          {categories.map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border"
          checked={activeOnly}
          onChange={(e) => onActiveOnlyChange(e.target.checked)}
        />
        Solo productos activos
      </label>
    </div>
  )
}

export type { CatalogListParams }
