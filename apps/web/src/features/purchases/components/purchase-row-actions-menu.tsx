import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
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
import { useDeletePurchaseMutation, useReturnPurchaseMutation } from '@/features/purchases/hooks/use-purchases'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRowActionsMenuProps = {
  purchase: { id: number; status: string; affectsInventory?: boolean }
  onActionComplete?: () => void
}

export function PurchaseRowActionsMenu({ purchase, onActionComplete }: PurchaseRowActionsMenuProps) {
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteMutation = useDeletePurchaseMutation()
  const returnMutation = useReturnPurchaseMutation()

  const canDelete = purchase.status === 'DRAFT' || purchase.status === 'VOIDED'
  const canReturn = purchase.status === 'CONFIRMED'
  const hasStock = purchase.affectsInventory !== false

  if (!canDelete && !canReturn) {
    return null
  }

  async function handleDelete() {
    const confirmMessage =
      purchase.status === 'VOIDED'
        ? '¿Eliminar definitivamente este registro anulado? No se podrá recuperar.'
        : '¿Eliminar esta compra en borrador?'
    if (!window.confirm(confirmMessage)) {
      return
    }
    try {
      await deleteMutation.mutateAsync(purchase.id)
      onActionComplete?.()
    } catch (err) {
      window.alert(getApiErrorMessage(err))
    }
  }

  async function handleReturn() {
    setError(null)
    try {
      await returnMutation.mutateAsync(purchase.id)
      setReturnDialogOpen(false)
      onActionComplete?.()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {canReturn ? (
          <PermissionGate permission="purchases.edit">
            <Button
              variant="ghost"
              size="sm"
              title="Devolución / anular compra"
              aria-label="Devolución / anular compra"
              onClick={(e) => {
                e.stopPropagation()
                setReturnDialogOpen(true)
              }}
            >
              <RotateCcw />
            </Button>
          </PermissionGate>
        ) : null}
        {canDelete ? (
          <PermissionGate permission="purchases.edit">
            <Button
              variant="ghost"
              size="sm"
              title={
                purchase.status === 'VOIDED' ? 'Eliminar registro anulado' : 'Eliminar borrador'
              }
              aria-label={
                purchase.status === 'VOIDED' ? 'Eliminar registro anulado' : 'Eliminar borrador'
              }
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                void handleDelete()
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            </Button>
          </PermissionGate>
        ) : null}
      </div>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Devolución de compra</DialogTitle>
            <DialogDescription>
              {hasStock
                ? 'Se revertirá el stock de todos los ítems y la compra quedará anulada. Solo es posible si hay stock suficiente de cada material.'
                : 'La factura/compra quedará anulada y dejará de generar saldo por pagar. No afecta inventario.'}
            </DialogDescription>
          </DialogHeader>

          {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleReturn()}
              disabled={returnMutation.isPending}
            >
              {returnMutation.isPending ? <Loader2 className="animate-spin" /> : null}
              Confirmar devolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
