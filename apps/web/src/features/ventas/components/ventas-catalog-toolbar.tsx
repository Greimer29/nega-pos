import type { ReactNode } from 'react'
import { Search, ShoppingCart } from 'lucide-react'
import { BarcodeScanButton } from '@/components/barcode-scan-button'
import { FiltersDrawer } from '@/components/filters/filters-drawer'
import { FiltersIconButton } from '@/components/filters/filters-icon-button'
import { Button } from '@/components/ui/button'
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CatalogLayoutToggle } from '@/features/ventas/components/catalog-layout-toggle'
import type { CatalogLayout } from '@/features/ventas/hooks/use-catalog-layout'
import type { OfflineConnectivity } from '@/features/offline/use-offline-pos'
import type { CatalogSource } from '@/features/ventas/utils/ventas-catalog'
import { cn } from '@/lib/utils'

type VentasCatalogToolbarProps = {
  source: CatalogSource
  description: string
  offlineEnabled: boolean
  connectivity: OfflineConnectivity
  canSellOffline: boolean
  cartItemCount: number
  layout: CatalogLayout
  searchInput: string
  activeFilterCount: number
  filtersOpen: boolean
  filterPanel: ReactNode
  onSourceChange: (source: CatalogSource) => void
  onSearchChange: (search: string) => void
  onSearchEnter: (search: string) => void
  onToggleLayout: () => void
  onOpenFilters: () => void
  onFiltersOpenChange: (open: boolean) => void
  onScanBarcode: (code: string) => void
  onOpenCart: () => void
}

const SOURCE_LABELS: Record<CatalogSource, string> = {
  products: 'Productos',
  materials: 'Materiales',
  services: 'Servicios',
}

const SOURCE_TITLES: Record<CatalogSource, string> = {
  products: 'Catálogo de productos',
  materials: 'Materiales',
  services: 'Servicios',
}

export function VentasCatalogToolbar({
  source,
  description,
  offlineEnabled,
  connectivity,
  canSellOffline,
  cartItemCount,
  layout,
  searchInput,
  activeFilterCount,
  filtersOpen,
  filterPanel,
  onSourceChange,
  onSearchChange,
  onSearchEnter,
  onToggleLayout,
  onOpenFilters,
  onFiltersOpenChange,
  onScanBarcode,
  onOpenCart,
}: VentasCatalogToolbarProps) {
  return (
    <>
      <CardHeader className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-base">{SOURCE_TITLES[source]}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {offlineEnabled ? (
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  connectivity === 'online'
                    ? 'bg-emerald-100 text-emerald-800'
                    : connectivity === 'offline'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-neutral-100 text-neutral-600'
                )}
                title={
                  canSellOffline
                    ? 'Cobro local habilitado con copia en disco'
                    : connectivity === 'offline'
                      ? 'Sin copia local o sin permiso de cobro offline'
                      : 'Conexión con la API disponible'
                }
              >
                {connectivity === 'online'
                  ? 'En línea'
                  : connectivity === 'offline'
                    ? 'Sin conexión'
                    : 'Comprobando…'}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative shrink-0 xl:hidden"
              title="Abrir carrito"
              aria-label="Abrir carrito"
              onClick={onOpenCart}
            >
              <ShoppingCart className="size-4" />
              {cartItemCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="mb-4 flex shrink-0 flex-col gap-3 px-3 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="bg-muted inline-flex w-fit rounded-lg p-1">
            {(['products', 'materials', 'services'] as const).map((sourceOption) => (
              <button
                key={sourceOption}
                type="button"
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  source === sourceOption ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
                onClick={() => onSourceChange(sourceOption)}
              >
                {SOURCE_LABELS[sourceOption]}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 w-full items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder={
                  source === 'products'
                    ? 'Buscar producto o referencia…'
                    : source === 'services'
                      ? 'Buscar servicio…'
                      : 'Buscar material, código o referencia…'
                }
                value={searchInput}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  onSearchEnter(searchInput)
                }}
                className="bg-white pl-9"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CatalogLayoutToggle layout={layout} onToggle={onToggleLayout} />
              <FiltersIconButton
                count={activeFilterCount}
                expanded={filtersOpen}
                controls="ventas-catalog-filters"
                onClick={onOpenFilters}
              />
              {source !== 'services' ? (
                <BarcodeScanButton className="bg-white" onScan={onScanBarcode} />
              ) : null}
            </div>
          </div>
        </div>

        <FiltersDrawer
          open={filtersOpen}
          onOpenChange={onFiltersOpenChange}
          id="ventas-catalog-filters"
          title="Filtros del catálogo"
          description="Categoría, orden, talla y rango de precio del catálogo de ventas."
        >
          {filterPanel}
        </FiltersDrawer>
      </div>
    </>
  )
}
