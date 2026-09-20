import { LayoutGrid, Loader2, Search } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { FiltersDrawer } from '@/components/filters/filters-drawer'
import { FiltersIconButton } from '@/components/filters/filters-icon-button'
import { FilterSection, FiltersPanel } from '@/components/filters/filters-panel'
import { Button } from '@/components/ui/button'
import { DecimalInput } from '@/components/decimal-input'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'

type ProfitMarginFiltersPanelProps = {
  marginInput: string
  onMarginChange: (value: string) => void
  marginValid: boolean
  searchInput: string
  onSearchChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  activeOnly: boolean
  onActiveOnlyChange: (value: boolean) => void
  applicableSelectedCount: number
  selectedCount: number
  isApplying: boolean
  onApply: () => void
  actionSuccess: string | null
}

export const ProfitMarginFiltersPanel = forwardRef<HTMLElement, ProfitMarginFiltersPanelProps>(
  function ProfitMarginFiltersPanel(
    {
      marginInput,
      onMarginChange,
      marginValid,
      searchInput,
      onSearchChange,
      category,
      onCategoryChange,
      activeOnly,
      onActiveOnlyChange,
      applicableSelectedCount,
      selectedCount,
      isApplying,
      onApply,
      actionSuccess,
    },
    ref
  ) {
    const [filtersOpen, setFiltersOpen] = useState(false)
    const { data: categories = [] } = useActiveCategoriesQuery()
    const activeFilterCount = (category ? 1 : 0) + (activeOnly ? 0 : 1)

    return (
      <aside
        ref={ref}
        className="flex w-full shrink-0 flex-col gap-4 lg:min-w-[240px] lg:max-w-xs"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-2 sm:flex-1">
              <Label htmlFor="profit-margin-apply">Porcentaje (%)</Label>
              <DecimalInput
                id="profit-margin-apply"
                min="0"
                placeholder="Ej. 60"
                value={marginInput}
                onChange={(e) => onMarginChange(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="shrink-0"
              onClick={onApply}
              disabled={isApplying || selectedCount === 0 || !marginValid}
            >
              {isApplying ? <Loader2 className="animate-spin" /> : null}
              Aplicar a {applicableSelectedCount} producto{applicableSelectedCount === 1 ? '' : 's'}
            </Button>
          </div>
          {selectedCount > applicableSelectedCount ? (
            <p className="text-muted-foreground text-xs">
              {selectedCount - applicableSelectedCount} seleccionado
              {selectedCount - applicableSelectedCount === 1 ? '' : 's'} sin precio costo no se
              actualizarán.
            </p>
          ) : null}
          {actionSuccess ? <p className="text-sm text-emerald-700">{actionSuccess}</p> : null}
        </div>

        <div className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Catálogo
            </p>
            <FiltersIconButton
              count={activeFilterCount}
              expanded={filtersOpen}
              controls="profit-margin-filters"
              onClick={() => setFiltersOpen(true)}
            />
          </div>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Nombre del producto…"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <FiltersDrawer
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            id="profit-margin-filters"
            title="Filtros del catálogo"
            description="Categoría y visibilidad de productos para aplicar margen."
          >
            <FiltersPanel
              onClearAll={() => {
                onCategoryChange('')
                onActiveOnlyChange(true)
              }}
            >
              <FilterSection
                title="Categorías"
                icon={<LayoutGrid className="size-4 text-neutral-500" />}
              >
                <select
                  className="border-input flex h-9 w-full rounded-md border bg-white px-3 text-sm"
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
              </FilterSection>
              <FilterSection
                title="Visibilidad"
                icon={<LayoutGrid className="size-4 text-neutral-500" />}
              >
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700">
                  <Checkbox
                    checked={activeOnly}
                    onChange={(e) => onActiveOnlyChange(e.target.checked)}
                    className="accent-violet-700"
                  />
                  Solo productos activos
                </label>
              </FilterSection>
            </FiltersPanel>
          </FiltersDrawer>
        </div>
      </aside>
    )
  }
)
