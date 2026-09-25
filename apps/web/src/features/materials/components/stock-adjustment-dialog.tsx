import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StockAdjustmentForm } from '@/components/stock-adjustment-form'
import { UNIT_ABREV } from '@/features/materials/constants'
import { useAjusteStockMutation } from '@/features/materials/hooks/use-materials'
import type { Material } from '@/features/materials/types'
import { notifyApiError } from '@/features/notifications/query-error-state'

type AjusteStockDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  onSuccess?: () => void
}

export function AjusteStockDialog({ open, onOpenChange, material, onSuccess }: AjusteStockDialogProps) {
  const ajusteMutation = useAjusteStockMutation()

  if (!material) {
    return null
  }

  const unit = UNIT_ABREV[material.unit]
  const currentStock = Number(material.stockActual ?? 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimiento de inventario</DialogTitle>
          <DialogDescription>
            {material.code} — {material.name}
          </DialogDescription>
        </DialogHeader>

        <StockAdjustmentForm
          open={open}
          currentStock={currentStock}
          unitCode={material.unit}
          unitLabel={unit}
          isSubmitting={ajusteMutation.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (payload) => {
            try {
              await ajusteMutation.mutateAsync({
                id: material.id,
                payload,
              })
              onOpenChange(false)
              onSuccess?.()
            } catch (error) {
              notifyApiError(error, 'No se pudo guardar')
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
