import { useState } from 'react'
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
import { getApiErrorMessage } from '@/lib/api-error'

type AjusteStockDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  onSuccess?: () => void
}

export function AjusteStockDialog({ open, onOpenChange, material, onSuccess }: AjusteStockDialogProps) {
  const ajusteMutation = useAjusteStockMutation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
          unitLabel={unit}
          isSubmitting={ajusteMutation.isPending}
          errorMessage={errorMessage}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (payload) => {
            setErrorMessage(null)
            try {
              await ajusteMutation.mutateAsync({
                id: material.id,
                payload,
              })
              onOpenChange(false)
              onSuccess?.()
            } catch (error) {
              setErrorMessage(getApiErrorMessage(error))
            }
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
