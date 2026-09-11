import { useEffect, useState } from 'react'
import { FileSpreadsheet, Layers, Loader2, PackageMinus, Plus, SlidersHorizontal } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CatalogImportDialog } from '@/features/catalog-import/components/catalog-import-dialog'
import type { CatalogProductImportRow } from '@/features/catalog-import/types'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import {
  CatalogProductCard,
  catalogProductGridClassName,
} from '@/features/ventas/components/catalog-product-card'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  useCatalogProductsQuery,
  useDeleteCatalogProductMutation,
  useImportCatalogProductsMutation,
} from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { notifyApiError, QueryErrorState, EmptyListState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'
import {
  toolbarActionsClass,
  toolbarButtonClass,
  toolbarButtonLabelClass,
  toolbarContainerClass,
  toolbarHeaderClass,
} from '@/components/layout/responsive-toolbar'

const PER_PAGE = 30

type ProductosFilters = {
  search: string
  category: string
  page: number
}

const DEFAULT_PRODUCTOS_FILTERS: ProductosFilters = {
  search: '',
  category: '',
  page: 1,
}

export function ProductosPage() {
  const navigate = useNavigate()
  const { can, company } = useAuth()
  const canEditCatalog = can('catalog.edit')
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('productos', company?.id),
    DEFAULT_PRODUCTOS_FILTERS
  )
  const [searchInput, setSearchInput] = useState(filters.search)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const deleteMutation = useDeleteCatalogProductMutation()
  const importMutation = useImportCatalogProductsMutation()
  const { data: categories = [] } = useActiveCategoriesQuery()
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

  const { data, isLoading, isError, error } = useCatalogProductsQuery({
    page: filters.page,
    perPage: PER_PAGE,
    search: filters.search || undefined,
    category: filters.category || undefined,
    active: true,
    itemKind: 'PRODUCT',
    sortBy: 'name',
    sortDir: 'asc',
  })

  const products = data?.catalog_products ?? []
  const meta = data?.meta

  function openCreateDialog() {
    setDialogOpen(true)
  }

  function openEditProduct(product: CatalogProduct) {
    void navigate(`/productos/${product.id}?edit=1`)
  }

  async function handleDeleteProduct(product: CatalogProduct) {
    try {
      const result = await deleteMutation.mutateAsync(product.id)
      if (result.modo === 'soft') {
        toast.warning(
          `"${product.name}" fue desactivado porque tiene ventas asociadas.`,
          'Desactivado'
        )
      }
    } catch (deleteError) {
      notifyApiError(deleteError)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', toolbarContainerClass)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-muted-foreground text-sm">
          Catálogo de productos terminados para venta y producción.
        </p>
      </div>

      <Card>
        <CardHeader className={toolbarHeaderClass}>
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-base">Catálogo</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} producto${meta.total === 1 ? '' : 's'}` : 'Cargando…'}
            </CardDescription>
          </div>
          <div className={toolbarActionsClass}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative shrink-0"
              title="Filtros"
              aria-label="Filtros"
              aria-expanded={filtersOpen}
              aria-controls="productos-catalog-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="size-4" />
              {activeFilterCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button variant="outline" asChild className={toolbarButtonClass}>
              <Link to="/productos/materiales" title="Ver materiales" aria-label="Ver materiales">
                <Layers className="size-4" />
                <span className={toolbarButtonLabelClass}>Ver materiales</span>
              </Link>
            </Button>
            <PermissionGate permission="catalog.edit">
              <Button variant="outline" asChild className={toolbarButtonClass}>
                <Link
                  to="/productos/movimientos"
                  title="Cargo, descargo o ajuste masivo"
                  aria-label="Movimiento de inventario"
                >
                  <PackageMinus className="size-4" />
                  <span className={toolbarButtonLabelClass}>Movimientos</span>
                </Link>
              </Button>
            </PermissionGate>
            <PermissionGate permission="catalog.edit">
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                className={toolbarButtonClass}
                title="Importar productos desde Excel"
                aria-label="Importar productos desde Excel"
              >
                <FileSpreadsheet className="size-4" />
                <span className={toolbarButtonLabelClass}>Importar Excel</span>
              </Button>
            </PermissionGate>
            <PermissionGate permission="catalog.edit">
              <Button
                onClick={openCreateDialog}
                className={toolbarButtonClass}
                title="Nuevo producto"
                aria-label="Nuevo producto"
              >
                <Plus />
                <span className={toolbarButtonLabelClass}>Nuevo producto</span>
              </Button>
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Buscar producto…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-xs"
            />
            <div
              id="productos-catalog-filters"
              className={cn('flex-wrap gap-3', filtersOpen ? 'flex' : 'hidden')}
            >
              <select
                className="border-input flex h-9 rounded-md border bg-white px-3 text-sm"
                value={filters.category}
                onChange={(e) => {
                  const category = e.target.value
                  setFilters((prev) => ({ ...prev, category, page: 1 }))
                }}
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando productos…
            </div>
          ) : isError ? (
            <QueryErrorState isError error={error} title="No se pudieron cargar los productos" />
          ) : products.length === 0 ? (
            <EmptyListState
              title="Todavía no hay productos"
              description="Es normal en una empresa nueva. Creá el catálogo cuando quieras vender."
            />
          ) : (
            <div className={catalogProductGridClassName}>
              {products.map((product) => (
                <CatalogProductCard
                  key={product.id}
                  product={product}
                  showActions={canEditCatalog}
                  onEdit={openEditProduct}
                  onDelete={handleDeleteProduct}
                  onOpen={() => void navigate(`/productos/${product.id}`)}
                />
              ))}
            </div>
          )}

          {meta && meta.lastPage > 1 ? (
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-muted-foreground text-sm">
                Página {meta.currentPage} de {meta.lastPage}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage <= 1}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage >= meta.lastPage}
                  onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CatalogFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <CatalogImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        kind="PRODUCT"
        isPending={importMutation.isPending}
        onImport={(rows) =>
          importMutation.mutateAsync({
            item_kind: 'PRODUCT',
            rows: rows as CatalogProductImportRow[],
          })
        }
      />
    </div>
  )
}
