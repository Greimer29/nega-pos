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
import { notifyApiError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { useConfirmarPurchaseMutation } from '@/features/purchases/hooks/use-purchases'
import type { ConfirmPurchaseInput } from '@/features/purchases/types'
import { formatCostWarningsMessage } from '@/lib/cost-warnings'
import { formatFulfilledOrdersMessage } from '@/lib/material-availability'

type ConfirmarPurchaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseId: number
  payload: ConfirmPurchaseInput
  sinFactura: boolean
  sinItems: boolean
  sinTasa: boolean
  onSuccess?: () => void
}

export function ConfirmarPurchaseDialog({
  open,
  onOpenChange,
  purchaseId,
  payload,
  sinFactura,
  sinItems,
  sinTasa,
  onSuccess,
}: ConfirmarPurchaseDialogProps) {
  const confirmMutation = useConfirmarPurchaseMutation()

  async function handleConfirm() {
    try {
      const { costWarnings, fulfilledOrders } = await confirmMutation.mutateAsync({
        id: purchaseId,
        payload,
      })
      const costMessage = formatCostWarningsMessage(costWarnings)
      const fulfilledMessage = formatFulfilledOrdersMessage(fulfilledOrders)

      if (costMessage) {
        toast.warning(costMessage, 'Producto por debajo del costo')
      }
      if (fulfilledMessage) {
        toast.success(fulfilledMessage)
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      notifyApiError(err, 'No se pudo guardar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar compra</DialogTitle>
          <DialogDescription>
            Al confirmar se actualizará el stock y los precios costo de los materiales. Si algún
            producto del catálogo queda con venta por debajo del costo, te avisaremos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          {sinFactura ? (
            <p className="text-destructive">
              Falta el número de factura. Completalo antes de confirmar.
            </p>
          ) : null}
          {sinItems ? <p className="text-destructive">La compra no tiene ítems.</p> : null}
          {sinTasa ? (
            <p className="text-amber-700 dark:text-amber-400">
              No cargaste la tasa de la moneda de ingreso. Los montos en esa moneda quedarán en cero
              hasta que definas una tasa.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={confirmMutation.isPending || sinFactura || sinItems}
          >
            {confirmMutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Confirmar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
