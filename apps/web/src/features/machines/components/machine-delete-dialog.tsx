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
import type { Machine } from '@/features/machines/types'

type MachineDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine: Machine | null
  isPending: boolean
  onConfirm: () => void
}

export function MachineDeleteDialog({
  open,
  onOpenChange,
  machine,
  isPending,
  onConfirm,
}: MachineDeleteDialogProps) {
  if (!machine) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>¿Deseas eliminar esta máquina?</p>
              <p>
                Se procesará: <span className="text-foreground font-medium">{machine.name}</span>
              </p>
              <p className="text-xs">
                Si tiene gastos asociados se desactivará (eliminación lógica). Si no, se eliminará
                definitivamente.
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
