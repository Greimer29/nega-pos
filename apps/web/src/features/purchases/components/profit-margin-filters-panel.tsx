import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { DecimalInput } from '@/components/decimal-input'
import { Label } from '@/components/ui/label'
import { ProfitMarginCatalogFilters } from '@/features/purchases/components/profit-margin-catalog-filters'

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
  actionError: string | null
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
      actionError,
      actionSuccess,
    },
    ref
  ) {
    return (
      <aside
        ref={ref}
        className="flex w-full shrink-0 flex-col gap-4 lg:min-w-[240px] lg:max-w-xs"
      >
        <h4 className="text-sm font-medium">Margen de ganancia</h4>
        <p className="text-muted-foreground text-xs">
          Aplicá un porcentaje sobre el precio costo de los productos del catálogo para calcular el
          precio de venta.
        </p>

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
          {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}
          {actionSuccess ? <p className="text-sm text-emerald-700">{actionSuccess}</p> : null}
        </div>

        <div className="border-t pt-4">
          <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">Filtros</p>
          <ProfitMarginCatalogFilters
            searchInput={searchInput}
            onSearchChange={onSearchChange}
            category={category}
            onCategoryChange={onCategoryChange}
            activeOnly={activeOnly}
            onActiveOnlyChange={onActiveOnlyChange}
          />
        </div>
      </aside>
    )
  }
)
