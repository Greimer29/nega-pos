import { ArrowUpDown, LayoutGrid } from 'lucide-react'
import { FilterSection, FiltersPanel } from '@/components/filters/filters-panel'
import { Checkbox } from '@/components/ui/checkbox'

export type CatalogAdminSortOption = 'name' | 'most_sold'

type CatalogAdminFiltersPanelProps = {
  categories: Array<{ id: number; name: string }>
  category: string
  onCategoryChange: (value: string) => void
  sortBy: CatalogAdminSortOption
  onSortByChange: (value: CatalogAdminSortOption) => void
  onClearAll: () => void
  sortLabels?: Array<{ value: CatalogAdminSortOption; label: string }>
}

const DEFAULT_SORT_LABELS: Array<{ value: CatalogAdminSortOption; label: string }> = [
  { value: 'name', label: 'Nombre A-Z' },
  { value: 'most_sold', label: 'Más vendidos' },
]

export function CatalogAdminFiltersPanel({
  categories,
  category,
  onCategoryChange,
  sortBy,
  onSortByChange,
  onClearAll,
  sortLabels = DEFAULT_SORT_LABELS,
}: CatalogAdminFiltersPanelProps) {
  return (
    <FiltersPanel onClearAll={onClearAll}>
      <FilterSection
        title="Categorías"
        icon={<LayoutGrid className="size-4 text-neutral-500" />}
      >
        <div className="space-y-2.5">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700">
            <Checkbox
              checked={!category}
              onChange={() => onCategoryChange('')}
              className="accent-violet-700"
            />
            Todas las categorías
          </label>
          {categories.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700"
            >
              <Checkbox
                checked={category === item.name}
                onChange={() => onCategoryChange(item.name)}
                className="accent-violet-700"
              />
              {item.name}
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Ordenar por" icon={<ArrowUpDown className="size-4 text-neutral-500" />}>
        <select
          className="border-input flex h-9 w-full rounded-md border bg-white px-3 text-sm"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as CatalogAdminSortOption)}
        >
          {sortLabels.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FilterSection>
    </FiltersPanel>
  )
}
