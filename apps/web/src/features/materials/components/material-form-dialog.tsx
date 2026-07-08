import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MaterialForm } from '@/features/materials/components/material-form'
import type { Material } from '@/features/materials/types'

type MaterialFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  material?: Material | null
  onCreated?: (material: Material) => void
  purchaseFlow?: boolean
}

export function MaterialFormDialog({
  open,
  onOpenChange,
  material,
  onCreated,
  purchaseFlow = false,
}: MaterialFormDialogProps) {
  const isEditing = material != null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar material' : 'Nuevo material'}</DialogTitle>
        </DialogHeader>

        {open ? (
          <MaterialForm
            material={material}
            mode={isEditing ? 'edit' : 'create'}
            variant="dialog"
            purchaseFlow={purchaseFlow}
            onCancel={() => onOpenChange(false)}
            onSuccess={(result) => {
              onCreated?.(result)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
