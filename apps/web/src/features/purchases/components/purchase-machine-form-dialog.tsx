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
import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MACHINE_STATUSES,
  MACHINE_STATUS_LABELS,
  MACHINE_TYPES,
  MACHINE_TYPE_LABELS,
} from '@/features/machines/constants'
import type { PurchaseNewMachineInput } from '@/features/purchases/types'
import { notifyFormError } from '@/features/notifications/query-error-state'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  type: z.string().trim().min(1, 'El tipo es obligatorio').max(80),
  quantity: z.coerce.number().int().min(1, 'Mínimo 1').max(50),
  unit_price_usd: z.coerce.number().min(0, 'Precio inválido'),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  status: z.enum(MACHINE_STATUSES).optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

export type PurchaseMachineFormResult = {
  new_machine: PurchaseNewMachineInput
  quantity: number
  unit_price_usd: number
}

type PurchaseMachineFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (result: PurchaseMachineFormResult) => Promise<void> | void
  priceLabel?: string
  submitting?: boolean
}

export function PurchaseMachineFormDialog({
  open,
  onOpenChange,
  onSubmit,
  priceLabel = 'Precio unitario',
  submitting = false,
}: PurchaseMachineFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'OTHER',
      quantity: 1,
      unit_price_usd: 0,
      brand: '',
      model: '',
      status: 'OPERATIONAL',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: '',
      type: 'OTHER',
      quantity: 1,
      unit_price_usd: 0,
      brand: '',
      model: '',
      status: 'OPERATIONAL',
    })
  }, [open, reset])

  const submit = handleSubmit(async (values) => {
    if (!(values.unit_price_usd >= 0)) {
      notifyFormError('Indicá un precio válido.')
      return
    }

    await onSubmit({
      new_machine: {
        name: values.name.trim(),
        type: values.type,
        brand: values.brand?.trim() || undefined,
        model: values.model?.trim() || undefined,
        status: values.status,
      },
      quantity: values.quantity,
      unit_price_usd: values.unit_price_usd,
    })
  })

  const busy = submitting || isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva máquina en compra</DialogTitle>
          <DialogDescription>
            Se crean máquinas al agregar el ítem. Si la cantidad es mayor a 1, se generan varias con
            sufijo #1, #2…
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="pm-name">Nombre *</Label>
            <Input id="pm-name" {...register('name')} />
            {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pm-type">Tipo *</Label>
              <select
                id="pm-type"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                {...register('type')}
              >
                {MACHINE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {MACHINE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-qty">Cantidad *</Label>
              <DecimalInput id="pm-qty" min="1" decimals={0} {...register('quantity')} />
              {errors.quantity ? (
                <p className="text-destructive text-sm">{errors.quantity.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pm-brand">Marca</Label>
              <Input id="pm-brand" {...register('brand')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pm-model">Modelo</Label>
              <Input id="pm-model" {...register('model')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pm-status">Estado</Label>
            <select
              id="pm-status"
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
              {...register('status')}
            >
              {MACHINE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MACHINE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pm-price">{priceLabel} *</Label>
            <MoneyInput id="pm-price" min="0" {...register('unit_price_usd')} />
            {errors.unit_price_usd ? (
              <p className="text-destructive text-sm">{errors.unit_price_usd.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
