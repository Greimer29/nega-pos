import { useMemo, useState, type ReactNode } from 'react'
import { ArrowUpDown, ChevronDown, Filter, LayoutGrid, Tag } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type VentasCatalogSortOption = 'most_sold' | 'name'

export type VentasCatalogFiltersPanelProps = {
  catalogSource: 'products' | 'materials' | 'services'
  categories: Array<{ id: number; name: string }>
  category: string
  onCategoryChange: (value: string) => void
  sortBy: VentasCatalogSortOption
  onSortByChange: (value: VentasCatalogSortOption) => void
  sizeFilter: string
  onSizeFilterChange: (value: string) => void
  sizeOptions: string[]
  minPrice: string
  maxPrice: string
  onMinPriceChange: (value: string) => void
  onMaxPriceChange: (value: string) => void
  priceBounds: { min: number; max: number }
  onClearAll: () => void
  className?: string
}

function FilterSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
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

export function VentasCatalogFiltersPanel({
  catalogSource,
  categories,
  category,
  onCategoryChange,
  sortBy,
  onSortByChange,
  sizeFilter,
  onSizeFilterChange,
  sizeOptions,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  priceBounds,
  onClearAll,
  className,
}: VentasCatalogFiltersPanelProps) {
  const sortLabels = useMemo(
    () =>
      catalogSource === 'products'
        ? ([
            { value: 'most_sold' as const, label: 'Más vendidos' },
            { value: 'name' as const, label: 'Nombre A-Z' },
          ] as const)
        : ([
            { value: 'name' as const, label: 'Nombre A-Z' },
            { value: 'most_sold' as const, label: 'Más relevantes' },
          ] as const),
    [catalogSource]
  )

  const boundMin = Number.isFinite(priceBounds.min) ? priceBounds.min : 0
  const boundMax = Number.isFinite(priceBounds.max) ? Math.max(priceBounds.max, boundMin) : 100
  const sliderMin = Number(minPrice)
  const sliderMax = Number(maxPrice)
  const rangeLow = Number.isFinite(sliderMin) ? Math.min(Math.max(sliderMin, boundMin), boundMax) : boundMin
  const rangeHigh = Number.isFinite(sliderMax)
    ? Math.min(Math.max(sliderMax, rangeLow), boundMax)
    : boundMax
  const span = Math.max(boundMax - boundMin, 0.0001)
  const leftPct = ((rangeLow - boundMin) / span) * 100
  const rightPct = ((rangeHigh - boundMin) / span) * 100

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col gap-5 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm',
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

        <FilterSection
          title="Ordenar por"
          icon={<ArrowUpDown className="size-4 text-neutral-500" />}
        >
          <select
            className="border-input flex h-9 w-full rounded-md border bg-white px-3 text-sm"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as VentasCatalogSortOption)}
          >
            {sortLabels.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterSection>

        {catalogSource === 'products' ? (
          <FilterSection
            title="Talla"
            icon={<Tag className="size-4 text-neutral-500" />}
            defaultOpen={Boolean(sizeFilter)}
          >
            <Input
              list="ventas-size-filter-options"
              placeholder="Filtrar talla…"
              value={sizeFilter}
              onChange={(e) => onSizeFilterChange(e.target.value)}
              className="bg-white"
            />
            <datalist id="ventas-size-filter-options">
              {sizeOptions.map((size) => (
                <option key={size} value={size} />
              ))}
            </datalist>
          </FilterSection>
        ) : null}

        <FilterSection
          title="Rango de precio"
          icon={<Tag className="size-4 text-neutral-500" />}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="space-y-1">
                <Label htmlFor="ventas-filter-min-price" className="text-muted-foreground text-xs">
                  Mín.
                </Label>
                <Input
                  id="ventas-filter-min-price"
                  inputMode="decimal"
                  placeholder={boundMin.toFixed(2)}
                  value={minPrice}
                  onChange={(e) => onMinPriceChange(e.target.value)}
                  className="bg-white"
                />
              </div>
              <span className="text-muted-foreground pt-5 text-sm">—</span>
              <div className="space-y-1">
                <Label htmlFor="ventas-filter-max-price" className="text-muted-foreground text-xs">
                  Máx.
                </Label>
                <Input
                  id="ventas-filter-max-price"
                  inputMode="decimal"
                  placeholder={boundMax.toFixed(2)}
                  value={maxPrice}
                  onChange={(e) => onMaxPriceChange(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="relative h-6">
              <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200" />
              <div
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-violet-600"
                style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
              />
              <input
                type="range"
                min={boundMin}
                max={boundMax}
                step="0.01"
                value={rangeLow}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  onMinPriceChange(String(Math.min(next, rangeHigh)))
                }}
                className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-20 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-700"
                aria-label="Precio mínimo"
              />
              <input
                type="range"
                min={boundMin}
                max={boundMax}
                step="0.01"
                value={rangeHigh}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  onMaxPriceChange(String(Math.max(next, rangeLow)))
                }}
                className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-30 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-700"
                aria-label="Precio máximo"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Filtra los resultados cargados (moneda base).
            </p>
          </div>
        </FilterSection>
      </div>
    </aside>
  )
}
