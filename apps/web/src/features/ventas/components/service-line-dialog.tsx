import { useEffect, useState } from 'react'
import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CatalogProduct } from '@/features/ventas/types'
import { parseDecimalInput } from '@/lib/numeric-input'

type ServiceLineDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: CatalogProduct | null
  mode: 'add' | 'edit'
  initialQuantity?: number
  initialUnitPriceUsd?: number
  initialDetail?: string
  onConfirm: (values: { quantity: number; unitPriceUsd: number; detail: string | null }) => void
}

export function ServiceLineDialog({
  open,
  onOpenChange,
  service,
  mode,
  initialQuantity = 1,
  initialUnitPriceUsd,
  initialDetail = '',
  onConfirm,
}: ServiceLineDialogProps) {
  const [quantity, setQuantity] = useState(String(initialQuantity))
  const [unitPrice, setUnitPrice] = useState(String(initialUnitPriceUsd ?? 0))
  const [detail, setDetail] = useState(initialDetail)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !service) return
    setQuantity(String(initialQuantity))
    setUnitPrice(String(initialUnitPriceUsd ?? Number(service.sale_price_usd)))
    setDetail(initialDetail)
    setError(null)
  }, [open, service, initialQuantity, initialUnitPriceUsd, initialDetail])

  function handleConfirm() {
    const qty = parseDecimalInput(quantity, 2) ?? 0
    const price = Number(unitPrice)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Indica una cantidad válida.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Indica un precio válido.')
      return
    }
    onConfirm({
      quantity: qty,
      unitPriceUsd: price,
      detail: detail.trim() ? detail.trim() : null,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Agregar servicio' : 'Editar servicio'}
            {service ? `: ${service.name}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-line-qty">Cantidad</Label>
            <DecimalInput
              id="service-line-qty"
              min={0.01}
              step={1}
              decimals={2}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-line-price">Precio unitario (USD)</Label>
            <MoneyInput
              id="service-line-price"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
            {service ? (
              <p className="text-muted-foreground text-xs">
                Precio de lista: {Number(service.sale_price_usd).toFixed(2)} USD
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-line-detail">Detalle en factura (opcional)</Label>
            <Textarea
              id="service-line-detail"
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={500}
              placeholder="Ej. Instalación en local del cliente"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {mode === 'add' ? 'Agregar' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
