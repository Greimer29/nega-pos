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
import type { Supplier } from '@/features/suppliers/types'

type SupplierDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  isPending: boolean
  onConfirm: () => void
}

export function SupplierDeleteDialog({
  open,
  onOpenChange,
  supplier,
  isPending,
  onConfirm,
}: SupplierDeleteDialogProps) {
  if (!supplier) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>¿Estás seguro que deseas realizar esta operación?</p>
              <p>
                Se eliminará el proveedor:{' '}
                <span className="text-foreground font-medium">{supplier.name}</span>
              </p>
              <p className="text-xs">
                Si tiene compras o gastos asociados, se desactivará en lugar de borrarse
                permanentemente.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Eliminando…
              </>
            ) : (
              'Sí, eliminar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
