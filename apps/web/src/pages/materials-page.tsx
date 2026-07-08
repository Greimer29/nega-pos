import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const PER_PAGE = 30

type MaterialsTab = 'materiales' | 'formulas'

export function MaterialsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [tab, setTab] = useState<MaterialsTab>(tabParam === 'formulas' ? 'formulas' : 'materiales')

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<MaterialStatusFilter | ''>('')
  const [category, setCategory] = useState<MaterialCategoria | ''>('')
  const [sortBy, setSortBy] = useState<MaterialSortBy>('name')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const deleteMutation = useDeleteMaterialMutation()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, error } = useMaterialsQuery({
    page,
    perPage: PER_PAGE,
    search: debouncedSearch || undefined,
    status: status || undefined,
    category: category || undefined,
    sortBy,
    sortDir: sortBy === 'name' ? 'asc' : 'desc',
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

    setActionError(null)

    try {
      const result = await deleteMutation.mutateAsync(materialToDelete.id)
      setDeleteDialogOpen(false)
      setMaterialToDelete(null)

      if (result.modo === 'soft') {
        setActionError(
          `"${materialToDelete.name}" fue desactivado porque tiene movimientos asociados.`
        )
      }
    } catch (deleteError) {
      setActionError(getApiErrorMessage(deleteError))
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
              status={status}
              onStatusChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
              category={category}
              onCategoryChange={(value) => {
                setCategory(value)
                setPage(1)
              }}
              sortBy={sortBy}
              onSortByChange={(value) => {
                setSortBy(value)
                setPage(1)
              }}
            />

            {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

            {isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Cargando materiales…
              </div>
            ) : isError ? (
              <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
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
