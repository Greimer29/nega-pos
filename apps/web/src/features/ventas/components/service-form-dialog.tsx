import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { MoneyInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateCatalogProductMutation,
  useUpdateCatalogProductMutation,
} from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { getApiErrorMessage } from '@/lib/api-error'

type ServiceFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: CatalogProduct | null
  onSaved?: () => void
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSaved,
}: ServiceFormDialogProps) {
  const isEditing = service != null
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateCatalogProductMutation()
  const updateMutation = useUpdateCatalogProductMutation()
  const busy = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (!open) return
    setError(null)
    if (service) {
      setName(service.name)
      setDescription(service.description ?? '')
      setCategory(service.category === 'general' ? '' : service.category)
      setSalePrice(String(service.sale_price_usd))
      return
    }
    setName('')
    setDescription('')
    setCategory('')
    setSalePrice('')
  }, [open, service])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const price = Number(salePrice)
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Indica un precio de venta válido.')
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || 'general',
      item_kind: 'SERVICE' as const,
      sale_unit: 'UND' as const,
      sale_price_usd: price,
      cost_usd: 0,
      formula_id: null,
      stock_quantity: 0,
    }

    try {
      if (isEditing && service) {
        await updateMutation.mutateAsync({ id: service.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err) || 'No se pudo guardar el servicio.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="service-name">Nombre</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Instalación, envío, mano de obra"
              disabled={busy}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-category">Categoría (opcional)</Label>
            <Input
              id="service-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. logística, taller"
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-price">Precio de venta (USD)</Label>
            <MoneyInput
              id="service-price"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-description">Descripción (opcional)</Label>
            <Textarea
              id="service-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={busy}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
