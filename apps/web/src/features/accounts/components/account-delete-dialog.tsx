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
import { useDeleteAccountMutation } from '@/features/accounts/hooks/use-accounts'
import type { Account } from '@/features/accounts/types'
import { getApiErrorMessage } from '@/lib/api-error'

type AccountDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
  onDeleted?: (modo: 'soft' | 'hard') => void
}

export function AccountDeleteDialog({
  open,
  onOpenChange,
  account,
  onDeleted,
}: AccountDeleteDialogProps) {
  const deleteMutation = useDeleteAccountMutation()

  async function handleDelete() {
    if (!account) return

    try {
      const result = await deleteMutation.mutateAsync(account.id)
      onOpenChange(false)
      onDeleted?.(result.modo)
    } catch (err) {
      console.error(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar cuenta</DialogTitle>
          <DialogDescription>
            ¿Eliminar la cuenta &quot;{account?.name}&quot;? Si tiene movimientos asociados se
            desactivará en lugar de borrarse.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => void handleDelete()}
          >
            {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
