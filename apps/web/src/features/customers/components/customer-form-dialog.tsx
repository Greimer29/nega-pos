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
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '@/features/customers/hooks/use-customers'
import type { Customer } from '@/features/customers/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { normalizeRif } from '@/lib/rif'

const customerSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  document: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z
    .string()
    .trim()
    .email('Ingresá un email válido')
    .max(150)
    .optional()
    .or(z.literal('')),
  offers_credit: z.boolean(),
  credit_days: z.number().min(1).max(365).optional(),
  active: z.boolean().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

type CustomerFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onCreated?: (customer: Customer) => void
}

function emptyValues(): CustomerFormValues {
  return {
    name: '',
    document: '',
    phone: '',
    email: '',
    offers_credit: false,
    credit_days: 30,
    active: true,
  }
}

function toFormValues(customer: Customer): CustomerFormValues {
  const days = customer.creditDays ?? 0

  return {
    name: customer.name,
    document: customer.document ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    offers_credit: days > 0,
    credit_days: days > 0 ? days : 30,
    active: customer.active,
  }
}

function toPayload(values: CustomerFormValues, isEditing: boolean) {
  const documentRaw = values.document?.trim()

  return {
    name: values.name.trim(),
    document: documentRaw ? normalizeRif(documentRaw) : undefined,
    phone: values.phone?.trim() || undefined,
    email: values.email?.trim() || undefined,
    credit_days: values.offers_credit ? (values.credit_days ?? 30) : 0,
    ...(!isEditing ? { type: 'CORPORATE' as const } : {}),
    ...(isEditing && values.active !== undefined ? { active: values.active } : {}),
  }
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onCreated,
}: CustomerFormDialogProps) {
  const isEditing = customer != null
  const createMutation = useCreateCustomerMutation()
  const updateMutation = useUpdateCustomerMutation()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: emptyValues(),
  })

  const offersCredit = watch('offers_credit')

  useEffect(() => {
    if (open) {
      reset(isEditing ? toFormValues(customer) : emptyValues())
    }
  }, [open, isEditing, customer, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = toPayload(values, isEditing)

      if (isEditing) {
        await updateMutation.mutateAsync({ id: customer.id, payload })
      } else {
        const created = await createMutation.mutateAsync(payload)
        onCreated?.(created)
      }

      onOpenChange(false)
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualizá los datos del cliente.'
              : 'Cargá los datos del cliente. Teléfono y email se normalizan al guardar.'}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" autoComplete="organization" {...register('name')} />
            {errors.name ? (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">CI / RIF</Label>
            <Input
              id="document"
              placeholder="J-12345678-9"
              {...register('document')}
              onBlur={(event) => {
                const raw = event.target.value.trim()
                if (raw) setValue('document', normalizeRif(raw), { shouldDirty: true })
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" placeholder="0412 833 2238" {...register('phone')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email ? (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border"
                {...register('offers_credit')}
              />
              Tiene crédito
            </label>
            {offersCredit ? (
              <div className="flex items-center gap-2">
                <Label htmlFor="credit_days" className="text-sm font-normal">
                  Días
                </Label>
                <Input
                  id="credit_days"
                  type="number"
                  min={1}
                  max={365}
                  className="w-20"
                  {...register('credit_days', { valueAsNumber: true })}
                />
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border" {...register('active')} />
              Cliente activo
            </label>
          ) : null}

          {errors.root ? <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Guardando…
                </>
              ) : isEditing ? (
                'Guardar cambios'
              ) : (
                'Crear cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
