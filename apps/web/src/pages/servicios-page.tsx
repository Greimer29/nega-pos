import { useEffect, useState } from 'react'
import { Loader2, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { ServiceFormDialog } from '@/features/ventas/components/service-form-dialog'
import {
  CatalogProductCard,
  catalogProductGridClassName,
} from '@/features/ventas/components/catalog-product-card'
import {
  useCatalogProductsQuery,
  useDeleteCatalogProductMutation,
} from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import {
  EmptyListState,
  notifyApiError,
  QueryErrorState,
} from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'

const PER_PAGE = 30

type ServiciosFilters = {
  search: string
  category: string
  page: number
}

const DEFAULT_SERVICIOS_FILTERS: ServiciosFilters = {
  search: '',
  category: '',
  page: 1,
}

export function ServiciosPage() {
  const { can, company } = useAuth()
  const canEditCatalog = can('catalog.edit')
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('servicios', company?.id),
    DEFAULT_SERVICIOS_FILTERS
  )
  const [searchInput, setSearchInput] = useState(filters.search)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogProduct | null>(null)
  const deleteMutation = useDeleteCatalogProductMutation()
  const activeFilterCount = filters.category ? 1 : 0

  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      setFilters((prev) => ({
        ...prev,
        search: nextSearch,
        page: nextSearch === prev.search ? prev.page : 1,
      }))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput, setFilters])

  const { data, isLoading, isError, error, refetch } = useCatalogProductsQuery({
    page: filters.page,
    perPage: PER_PAGE,
    search: filters.search || undefined,
    category: filters.category || undefined,
    active: true,
    itemKind: 'SERVICE',
    sortBy: 'name',
    sortDir: 'asc',
  })

  const services = data?.catalog_products ?? []
  const meta = data?.meta

  function openCreateDialog() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEditService(service: CatalogProduct) {
    setEditing(service)
    setDialogOpen(true)
  }

  async function handleDeleteService(service: CatalogProduct) {
    try {
      const result = await deleteMutation.mutateAsync(service.id)
      if (result.modo === 'soft') {
        toast.warning(
          `"${service.name}" fue desactivado porque tiene ventas asociadas.`,
          'Desactivado'
        )
      }
    } catch (deleteError) {
      notifyApiError(deleteError)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>
        <p className="text-muted-foreground text-sm">
          Servicios vendibles sin inventario (precio fijo de lista; cantidad y detalle en la factura).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-base">Catálogo de servicios</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} servicio${meta.total === 1 ? '' : 's'}` : 'Cargando…'}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative shrink-0"
              title="Filtros"
              aria-label="Filtros"
              aria-expanded={filtersOpen}
              aria-controls="servicios-catalog-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="size-4" />
              {activeFilterCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <PermissionGate permission="catalog.edit">
              <Button
                onClick={openCreateDialog}
                className="size-9 sm:h-9 sm:w-auto sm:px-4"
                title="Nuevo servicio"
                aria-label="Nuevo servicio"
              >
                <Plus />
                <span className="hidden sm:inline">Nuevo servicio</span>
              </Button>
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Buscar servicio…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-xs"
            />
            <div
              id="servicios-catalog-filters"
              className={cn('flex-wrap gap-3', filtersOpen ? 'flex' : 'hidden')}
            >
              <Input
                placeholder="Categoría…"
                value={filters.category}
                onChange={(e) => {
                  const category = e.target.value
                  setFilters((prev) => ({ ...prev, category, page: 1 }))
                }}
                className="max-w-xs"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando servicios…
            </div>
          ) : isError ? (
            <QueryErrorState isError error={error} title="No se pudieron cargar los servicios" />
          ) : services.length === 0 ? (
            <EmptyListState
              title="Todavía no hay servicios"
              description="Creá servicios con precio de lista para venderlos en el POS sin descontar stock."
            />
          ) : (
            <div className={catalogProductGridClassName}>
              {services.map((service) => (
                <CatalogProductCard
                  key={service.id}
                  product={service}
                  showActions={canEditCatalog}
                  onEdit={openEditService}
                  onDelete={canEditCatalog ? handleDeleteService : undefined}
                />
              ))}
            </div>
          )}

          {meta && meta.lastPage > 1 ? (
            <div className="flex items-center justify-between gap-4 border-t pt-3">
              <p className="text-muted-foreground text-sm">
                Página {meta.currentPage} de {meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage <= 1 || isLoading}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage >= meta.lastPage || isLoading}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
        service={editing}
        onSaved={() => {
          void refetch()
        }}
      />
    </div>
  )
}
