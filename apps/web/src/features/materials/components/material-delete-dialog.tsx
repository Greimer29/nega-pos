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
import type { Material } from '@/features/materials/types'

type MaterialDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  isPending: boolean
  onConfirm: () => void
  hasInventoryHistory?: boolean
}

export function MaterialDeleteDialog({
  open,
  onOpenChange,
  material,
  isPending,
  onConfirm,
  hasInventoryHistory = false,
}: MaterialDeleteDialogProps) {
  if (!material) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar material</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                ¿Eliminar{' '}
                <span className="text-foreground font-medium">
                  {material.code} — {material.name}
                </span>
                ?
              </p>
              {hasInventoryHistory ? (
                <p className="text-xs">
                  Tiene movimientos de inventario (compras, ventas o ajustes). Se{' '}
                  <strong>desactivará</strong> y dejará de usarse en listas activas; el historial se
                  conserva.
                </p>
              ) : (
                <p className="text-xs">
                  Sin historial de stock, se <strong>elimina permanentemente</strong>. Quitá el
                  material de las fórmulas antes si aplica.
                </p>
              )}
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
