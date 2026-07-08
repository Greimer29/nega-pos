import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateAccountMutation,
  useUpdateAccountMutation,
} from '@/features/accounts/hooks/use-accounts'
import type { Account } from '@/features/accounts/types'
import { getApiErrorMessage } from '@/lib/api-error'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  description: z.string().trim().max(255).optional(),
  is_active: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

type AccountFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account | null
  onCreated?: (account: Account) => void
}

export function AccountFormDialog({ open, onOpenChange, account, onCreated }: AccountFormDialogProps) {
  const isEditing = account != null
  const createMutation = useCreateAccountMutation()
  const updateMutation = useUpdateAccountMutation()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      reset(
        account
          ? {
              name: account.name,
              description: account.description ?? '',
              is_active: account.isActive,
            }
          : {
              name: '',
              description: '',
              is_active: true,
            }
      )
    }
  }, [open, account, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        is_active: values.is_active,
      }

      if (isEditing && account) {
        await updateMutation.mutateAsync({ id: account.id, payload })
      } else {
        const created = await createMutation.mutateAsync(payload)
        onCreated?.(created)
      }

      onOpenChange(false)
    } catch (err) {
      setError('root', { message: getApiErrorMessage(err) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
          <DialogDescription>
            Las cuentas agrupan compras y gastos para filtrarlos en reportes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Nombre</Label>
            <Input id="account-name" {...register('name')} />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-description">Descripción (opcional)</Label>
            <Textarea id="account-description" rows={3} {...register('description')} />
          </div>

          {isEditing ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_active')} />
              Cuenta activa
            </label>
          ) : null}

          {errors.root ? <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
