import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StockAdjustmentForm } from '@/components/stock-adjustment-form'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { productSaleUnitAbrev } from '@/features/ventas/constants'
import { useAjusteStockProductoMutation } from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { getApiErrorMessage } from '@/lib/api-error'

type ProductStockAdjustmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CatalogProduct | null
  onSuccess?: () => void
}

export function ProductStockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductStockAdjustmentDialogProps) {
  const ajusteMutation = useAjusteStockProductoMutation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!product) return null

  const unit = productSaleUnitAbrev(product.sale_unit ?? 'UND')
  const currentStock = Number(product.stock_quantity)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Movimiento de inventario</DialogTitle>
          <DialogDescription>
            {catalogProductCode(product.id)} — {product.name}
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
                id: product.id,
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
