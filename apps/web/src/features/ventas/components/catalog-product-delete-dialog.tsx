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
import type { CatalogProduct } from '@/features/ventas/types'

type CatalogProductDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CatalogProduct | null
  isPending: boolean
  onConfirm: () => void
}

export function CatalogProductDeleteDialog({
  open,
  onOpenChange,
  product,
  isPending,
  onConfirm,
}: CatalogProductDeleteDialogProps) {
  if (!product) {
    return null
  }

  const hasMovements = (product.movimientos?.length ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar producto</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                ¿Eliminar{' '}
                <span className="text-foreground font-medium">{product.name}</span>?
              </p>
              {hasMovements ? (
                <p className="text-xs">
                  Si el producto tiene <strong>ventas registradas</strong>, se{' '}
                  <strong>desactivará</strong> y dejará de verse en el catálogo, pero el historial se
                  conserva.
                </p>
              ) : (
                <p className="text-xs">
                  Sin ventas ni pedidos activos, se <strong>elimina permanentemente</strong> de la
                  base de datos.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                No se puede eliminar si está en un pedido activo (borrador, confirmado o en
                producción).
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
