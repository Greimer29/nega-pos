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
import { getApiErrorMessage } from '@/lib/api-error'

type CategoryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const isEditing = category != null
  const createMutation = useCreateCategoryMutation()
  const updateMutation = useUpdateCategoryMutation()

  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (!open) return
    setError(null)
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
    setError(null)

    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    const parsedSort = Number(sortOrder)
    if (!Number.isFinite(parsedSort) || parsedSort < 0) {
      setError('El orden debe ser un número mayor o igual a 0')
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
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              Las categorías se usan para clasificar productos del catálogo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

            <div className="space-y-2">
              <Label htmlFor="category-name">Nombre</Label>
              <Input
                id="category-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Uniforme"
                autoFocus
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
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
