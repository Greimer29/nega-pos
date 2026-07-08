import { FolderTree, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryFormDialog } from '@/features/categories/components/category-form-dialog'
import {
  useCategoriesQuery,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from '@/features/categories/hooks/use-categories'
import type { Category } from '@/features/categories/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { INVENTORY_UNIT_OPTIONS } from '@/lib/inventory-units'
import { cn } from '@/lib/utils'

export function CategoriesConfigCard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: categories = [], isLoading, isError, error } = useCategoriesQuery()
  const updateMutation = useUpdateCategoryMutation()
  const deleteMutation = useDeleteCategoryMutation()

  function openCreate() {
    setSelectedCategory(null)
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setSelectedCategory(category)
    setDialogOpen(true)
  }

  async function toggleActive(category: Category) {
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: category.id,
        payload: { active: !category.active },
      })
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`¿Eliminar la categoría "${category.name}"?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(category.id)
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="size-4" />
            Categorías de productos
          </CardTitle>
          <CardDescription>
            Creá, editá o eliminá categorías para organizar el catálogo de productos.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus />
          Nueva categoría
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

        {isLoading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : isError ? (
          <p className="text-destructive text-sm whitespace-pre-line">{getApiErrorMessage(error)}</p>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay categorías configuradas.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Orden</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3 tabular-nums">{category.sort_order}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          category.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {category.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(category)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleActive(category)}
                        >
                          {category.active ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleDelete(category)}
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

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm font-medium">Unidades de compra y venta</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Las unidades son fijas en todo el sistema:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {INVENTORY_UNIT_OPTIONS.map((unit) => (
              <span
                key={unit.value}
                className="bg-background inline-flex rounded-md border px-2.5 py-1 text-xs font-mono font-medium"
              >
                {unit.value}
              </span>
            ))}
          </div>
        </div>
      </CardContent>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
      />
    </Card>
  )
}
