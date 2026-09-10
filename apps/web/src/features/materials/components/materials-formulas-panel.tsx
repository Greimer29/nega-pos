import { useEffect, useState } from 'react'
import { FlaskConical, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { FormulaFormDialog } from '@/features/formulas/components/formula-form-dialog'
import {
  useDeleteFormulaMutation,
  useFormulasQuery,
} from '@/features/formulas/hooks/use-formulas'
import type { Formula } from '@/features/formulas/types'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'

const PER_PAGE = 30

type MaterialsFormulasFilters = {
  search: string
  page: number
}

const DEFAULT_MATERIALS_FORMULAS_FILTERS: MaterialsFormulasFilters = {
  search: '',
  page: 1,
}

export function MaterialsFormulasPanel() {
  const { company } = useAuth()
  const [filters, setFilters] = useSessionPersistedState(
    sessionFilterKey('materials-formulas', company?.id),
    DEFAULT_MATERIALS_FORMULAS_FILTERS
  )
  const [searchInput, setSearchInput] = useState(filters.search)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null)
  const deleteMutation = useDeleteFormulaMutation()

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

  const { data, isLoading, isError, error } = useFormulasQuery({
    page: filters.page,
    perPage: PER_PAGE,
    search: filters.search || undefined,
    active: true,
  })

  const formulas = data?.formulas ?? []
  const meta = data?.meta

  function openCreateDialog() {
    setEditingFormula(null)
    setDialogOpen(true)
  }

  function openEditDialog(formula: Formula) {
    setEditingFormula(formula)
    setDialogOpen(true)
  }

  async function handleDelete(formula: Formula) {
    try {
      await deleteMutation.mutateAsync(formula.id)
    } catch (deleteError) {
      notifyApiError(deleteError)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="grid grid-cols-1 items-center gap-4 pb-4 sm:grid-cols-[1fr_auto]">
          <div className="relative min-w-0">
            <Input
              placeholder="Buscar fórmula…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button className="shrink-0" onClick={openCreateDialog}>
            <Plus />
            Nueva fórmula
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="size-4" />
            Fórmulas reutilizables
          </CardTitle>
          <CardDescription>
            Creá fórmulas con materiales y asignalas a los productos que necesites.
          </CardDescription>

          {isLoading ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Cargando fórmulas…
            </div>
          ) : isError ? (
            <QueryErrorState isError error={error} title="No se pudieron cargar las fórmulas" />
          ) : formulas.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay fórmulas registradas.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b text-left">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Productos</th>
                    <th className="px-4 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {formulas.map((formula) => (
                    <tr key={formula.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{formula.name}</p>
                        {formula.description ? (
                          <p className="text-muted-foreground text-xs">{formula.description}</p>
                        ) : null}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {formula.products_count ?? 0} producto
                        {(formula.products_count ?? 0) === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(formula)}
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive size-8"
                            disabled={deleteMutation.isPending}
                            onClick={() => void handleDelete(formula)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      <FormulaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formula={editingFormula}
      />
    </>
  )
}
