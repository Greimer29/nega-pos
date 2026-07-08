import { useEffect, useState } from 'react'
import { Layers, Loader2, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import { CatalogProductCard } from '@/features/ventas/components/catalog-product-card'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  useCatalogProductsQuery,
  useDeleteCatalogProductMutation,
} from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { getApiErrorMessage } from '@/lib/api-error'

const PER_PAGE = 30

export function ProductosPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canEditCatalog = can('catalog.edit')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const deleteMutation = useDeleteCatalogProductMutation()
  const { data: categories = [] } = useActiveCategoriesQuery()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, error } = useCatalogProductsQuery({
    page,
    perPage: PER_PAGE,
    search: debouncedSearch || undefined,
    category: category || undefined,
    active: true,
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
    setActionError(null)
    try {
      const result = await deleteMutation.mutateAsync(product.id)
      if (result.modo === 'soft') {
        setActionError(`"${product.name}" fue desactivado porque tiene ventas asociadas.`)
      }
    } catch (deleteError) {
      setActionError(getApiErrorMessage(deleteError))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
        <p className="text-muted-foreground text-sm">
          Catálogo de productos terminados para venta y producción.
        </p>
      </div>

      <Card>
        <CardHeader className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Catálogo</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} producto${meta.total === 1 ? '' : 's'}` : 'Cargando…'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <Button variant="outline" asChild>
              <Link to="/productos/materiales">
                <Layers className="size-4" />
                Ver materiales
              </Link>
            </Button>
            <PermissionGate permission="catalog.edit">
              <Button onClick={openCreateDialog}>
                <Plus />
                Nuevo producto
              </Button>
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Buscar producto…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="border-input flex h-9 rounded-md border bg-white px-3 text-sm"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
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

          {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando productos…
            </div>
          ) : isError ? (
            <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
          ) : products.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay productos registrados.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                  onClick={() => setPage((c) => Math.max(1, c - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.currentPage >= meta.lastPage}
                  onClick={() => setPage((c) => c + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CatalogFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
