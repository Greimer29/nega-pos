import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useConfirmarPurchaseMutation } from '@/features/purchases/hooks/use-purchases'
import type { ConfirmPurchaseInput } from '@/features/purchases/types'
import { getApiErrorMessage } from '@/lib/api-error'
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
  const [error, setError] = useState<string | null>(null)
  const [costWarning, setCostWarning] = useState<string | null>(null)
  const [fulfilledNotice, setFulfilledNotice] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)

    if (costWarning || fulfilledNotice) {
      setCostWarning(null)
      setFulfilledNotice(null)
      onOpenChange(false)
      onSuccess?.()
      return
    }

    try {
      const { costWarnings, fulfilledOrders } = await confirmMutation.mutateAsync({
        id: purchaseId,
        payload,
      })
      const costMessage = formatCostWarningsMessage(costWarnings)
      const fulfilledMessage = formatFulfilledOrdersMessage(fulfilledOrders)

      if (costMessage || fulfilledMessage) {
        setCostWarning(costMessage)
        setFulfilledNotice(fulfilledMessage)
        return
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(getApiErrorMessage(err))
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
              No cargaste tasa USD. Los montos en bolívares quedarán en cero hasta que definas una
              tasa.
            </p>
          ) : null}
          {error ? <p className="text-destructive whitespace-pre-line">{error}</p> : null}
          {fulfilledNotice ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {fulfilledNotice}
            </p>
          ) : null}
          {costWarning ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 whitespace-pre-line">
              {costWarning}
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
            {costWarning || fulfilledNotice ? 'Entendido' : 'Confirmar compra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
