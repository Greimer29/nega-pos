import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from '@/features/categories/hooks/use-categories'
import type { Category } from '@/features/categories/types'
import { notifyApiError, notifyFormError } from '@/features/notifications/query-error-state'

type CategoryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  readOnly?: boolean
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  readOnly = false,
}: CategoryFormDialogProps) {
  const isEditing = category != null
  const createMutation = useCreateCategoryMutation()
  const updateMutation = useUpdateCategoryMutation()

  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (!open) return
    if (isEditing) {
      setName(category.name)
      setSortOrder(String(category.sort_order))
    } else {
      setName('')
      setSortOrder('0')
    }
  }, [open, isEditing, category])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (readOnly) return

    if (!name.trim()) {
      notifyFormError('El nombre es obligatorio')
      return
    }

    const parsedSort = Number(sortOrder)
    if (!Number.isFinite(parsedSort) || parsedSort < 0) {
      notifyFormError('El orden debe ser un número mayor o igual a 0')
      return
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: category.id,
          payload: { name: name.trim(), sort_order: parsedSort },
        })
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          sort_order: parsedSort,
        })
      }
      onOpenChange(false)
    } catch (err) {
      notifyApiError(err, 'No se pudo guardar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              Las categorías se usan para clasificar productos del catálogo y materiales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Uniforme"
                autoFocus
                disabled={readOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-sort">Orden</Label>
              <Input
                id="category-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || readOnly}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
