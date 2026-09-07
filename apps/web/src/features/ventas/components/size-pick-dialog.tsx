import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CatalogProduct, CatalogProductSize } from '@/features/ventas/types'
import { formatInventoryQuantity } from '@/lib/inventory-units'
import { sizesWithStock } from '@/features/ventas/utils/product-sizes'

type SizePickDialogProps = {
  open: boolean
  product: CatalogProduct | null
  onOpenChange: (open: boolean) => void
  onPick: (size: CatalogProductSize) => void
}

export function SizePickDialog({ open, product, onOpenChange, onPick }: SizePickDialogProps) {
  const sizes = product ? sizesWithStock(product) : []
  const unit = product?.sale_unit ?? 'UND'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Elegir talla</DialogTitle>
        </DialogHeader>
        {product ? (
          <p className="text-muted-foreground text-sm">{product.name}</p>
        ) : null}
        {sizes.length === 0 ? (
          <p className="text-destructive text-sm">No hay tallas con stock disponible.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sizes.map((size) => (
              <Button
                key={size.id}
                type="button"
                variant="outline"
                className="h-auto flex-col gap-0.5 py-2"
                onClick={() => {
                  onPick(size)
                  onOpenChange(false)
                }}
              >
                <span className="text-base font-semibold">{size.size}</span>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {formatInventoryQuantity(size.stock_quantity, unit)}
                </span>
              </Button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
