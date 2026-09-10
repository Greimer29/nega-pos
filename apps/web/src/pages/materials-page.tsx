import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { MaterialDeleteDialog } from '@/features/materials/components/material-delete-dialog'
import { MaterialFiltersBar } from '@/features/materials/components/material-filters-bar'
import { MaterialFormDialog } from '@/features/materials/components/material-form-dialog'
import { MaterialProductCard } from '@/features/materials/components/material-product-card'
import { MaterialsFormulasPanel } from '@/features/materials/components/materials-formulas-panel'
import type { MaterialSortBy } from '@/features/materials/constants'
import {
  useDeleteMaterialMutation,
  useMaterialsQuery,
} from '@/features/materials/hooks/use-materials'
import type { Material, MaterialCategoria, MaterialStatusFilter } from '@/features/materials/types'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import { cn } from '@/lib/utils'

const PER_PAGE = 30

type MaterialsTab = 'materiales' | 'formulas'

type MaterialsFilters = {
  search: string
  status: MaterialStatusFilter | ''
  category: MaterialCategoria | ''
  sortBy: MaterialSortBy
  page: number
}

const DEFAULT_MATERIALS_FILTERS: MaterialsFilters = {
  search: '',
  status: '',
  category: '',
  sortBy: 'name',
  page: 1,
}

export function MaterialsPage() {
  const navigate = useNavigate()
  const { company } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [tab, setTab] = useState<MaterialsTab>(tabParam === 'formulas' ? 'formulas' : 'materiales')

  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('materials', company?.id),
    DEFAULT_MATERIALS_FILTERS
  )
  const [searchInput, setSearchInput] = useState(filters.search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const deleteMutation = useDeleteMaterialMutation()
  const { data: categories = [] } = useActiveCategoriesQuery()

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

  const { data, isLoading, isError, error } = useMaterialsQuery({
    page: filters.page,
    perPage: PER_PAGE,
    search: filters.search || undefined,
    status: filters.status || undefined,
    category: filters.category || undefined,
    sortBy: filters.sortBy,
    sortDir: filters.sortBy === 'name' ? 'asc' : 'desc',
  })

  const materials = data?.materials ?? []
  const meta = data?.meta

  function switchTab(nextTab: MaterialsTab) {
    setTab(nextTab)
    if (nextTab === 'formulas') {
      setSearchParams({ tab: 'formulas' })
    } else {
      setSearchParams({})
    }
  }

  function openCreateDialog() {
    setDialogOpen(true)
  }

  function openEditPage(material: Material) {
    void navigate(`/productos/materiales/${material.id}`)
  }

  function openDeleteDialog(material: Material) {
    setMaterialToDelete(material)
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!materialToDelete) {
      return
    }

    try {
      const result = await deleteMutation.mutateAsync(materialToDelete.id)
      setDeleteDialogOpen(false)
      setMaterialToDelete(null)

      if (result.modo === 'soft') {
        toast.warning(
          `"${materialToDelete.name}" fue desactivado porque tiene movimientos asociados.`,
          'Desactivado'
        )
      }
    } catch (deleteError) {
      notifyApiError(deleteError)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 w-fit px-0" asChild>
            <Link to="/productos">
              <ArrowLeft className="size-4" />
              Volver a productos
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Materiales</h1>
          <p className="text-muted-foreground text-sm">
            Insumos, telas e insumos base. Gestioná fórmulas de productos desde la pestaña Fórmulas.
          </p>
        </div>
        {tab === 'materiales' ? (
          <Button onClick={openCreateDialog}>
            <Plus />
            Nuevo material
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button
          type="button"
          variant={tab === 'materiales' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => switchTab('materiales')}
        >
          Materiales
        </Button>
        <Button
          type="button"
          variant={tab === 'formulas' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => switchTab('formulas')}
        >
          Fórmulas
        </Button>
      </div>

      {tab === 'formulas' ? (
        <MaterialsFormulasPanel />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listado</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} material${meta.total === 1 ? '' : 'es'}` : 'Cargando…'}
            </CardDescription>
          </CardHeader>
          <CardContent className={cn('space-y-4')}>
            <MaterialFiltersBar
              searchInput={searchInput}
              onSearchChange={setSearchInput}
              status={filters.status}
              onStatusChange={(value) => {
                setFilters((prev) => ({ ...prev, status: value, page: 1 }))
              }}
              category={filters.category}
              onCategoryChange={(value) => {
                setFilters((prev) => ({ ...prev, category: value, page: 1 }))
              }}
              sortBy={filters.sortBy}
              onSortByChange={(value) => {
                setFilters((prev) => ({ ...prev, sortBy: value, page: 1 }))
              }}
              categories={categories}
            />

            {isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Cargando materiales…
              </div>
            ) : isError ? (
              <QueryErrorState isError error={error} title="No se pudieron cargar los materiales" />
            ) : materials.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm">No hay materiales que coincidan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <MaterialProductCard
                    key={material.id}
                    material={material}
                    onEdit={openEditPage}
                    onDelete={openDeleteDialog}
                    onOpen={() => void navigate(`/productos/materiales/${material.id}`)}
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
      )}

      <MaterialFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <MaterialDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setMaterialToDelete(null)
          }
        }}
        material={materialToDelete}
        hasInventoryHistory={
          materialToDelete
            ? (materialToDelete.flowQty ?? 0) > 0 ||
              (materialToDelete.purchasedQty ?? 0) > 0 ||
              (materialToDelete.usedQty ?? 0) > 0 ||
              (materialToDelete.stockActual ?? 0) !== 0
            : false
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
