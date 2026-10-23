import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RecipeStockInsuficiente } from '@/features/orders/types'

type OrderStockShortageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: RecipeStockInsuficiente[]
  forceConfirmOpen: boolean
  forcePending: boolean
  onCancel: () => void
  onRequestForce: () => void
  onForce: () => void
}

export function OrderStockShortageDialog({
  open,
  onOpenChange,
  items,
  forceConfirmOpen,
  forcePending,
  onCancel,
  onRequestForce,
  onForce,
}: OrderStockShortageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock insuficiente</DialogTitle>
          <DialogDescription>
            No hay inventario suficiente para pasar este pedido a producción.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          {items.map((item) => (
            <div key={item.material_id} className="rounded-md border p-3">
              <p className="font-medium">{item.name}</p>
              <div className="text-muted-foreground mt-1 grid gap-1 text-xs sm:grid-cols-3">
                <span>Stock actual: {item.stock_actual.toFixed(3)}</span>
                <span>Consumo proyectado: {item.consumo_proyectado.toFixed(3)}</span>
                <span>Faltante: {item.faltante.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
          <p>El stock quedará negativo. Confirmá que sabés lo que estás haciendo.</p>
          {forceConfirmOpen ? (
            <p className="text-xs font-medium">
              Confirmación final: si continuás, el pedido pasará a producción forzando descuento.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          {forceConfirmOpen ? (
            <Button variant="destructive" disabled={forcePending} onClick={onForce}>
              {forcePending ? <Loader2 className="animate-spin" /> : null}
              Sí, forzar igual
            </Button>
          ) : (
            <Button variant="destructive" onClick={onRequestForce}>
              Forzar igual
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
