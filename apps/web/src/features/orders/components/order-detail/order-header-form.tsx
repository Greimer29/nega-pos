import type { FormEvent } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { MoneyInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Customer } from '@/features/customers/types'
import { MODALIDAD_LABELS } from '@/features/orders/constants'
import type {
  OrderHeaderFormInput,
  OrderHeaderFormValues,
} from '@/features/orders/utils/order-detail-form'
import { cn } from '@/lib/utils'

type OrderHeaderFormProps = {
  form: UseFormReturn<OrderHeaderFormInput, unknown, OrderHeaderFormValues>
  customers: Pick<Customer, 'id' | 'name'>[]
  onSubmit: (event?: FormEvent) => Promise<void>
}

export function OrderHeaderForm({ form, customers, onSubmit }: OrderHeaderFormProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = form
  const clientMode = watch('client_mode')

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Cliente</Label>
          <div className="bg-muted inline-flex rounded-lg p-1">
            <button
              type="button"
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium',
                clientMode === 'guest' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => {
                setValue('client_mode', 'guest', { shouldDirty: true })
                setValue('customer_id', '', { shouldDirty: true })
              }}
            >
              Invitado
            </button>
            <button
              type="button"
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium',
                clientMode === 'registered' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
              onClick={() => {
                setValue('client_mode', 'registered', { shouldDirty: true })
                setValue('guest_name', '', { shouldDirty: true })
              }}
            >
              Registrado
            </button>
          </div>
          {clientMode === 'guest' ? (
            <>
              <Input id="guest_name" placeholder="Nombre del invitado" {...register('guest_name')} />
              {errors.guest_name ? (
                <p className="text-destructive text-sm">{errors.guest_name.message}</p>
              ) : null}
            </>
          ) : (
            <>
              <select
                id="customer_id"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                {...register('customer_id')}
              >
                <option value="">Seleccionar cliente…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.customer_id ? (
                <p className="text-destructive text-sm">{errors.customer_id.message}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="modalidad">Modalidad</Label>
          <select
            id="modalidad"
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
            {...register('modalidad')}
          >
            {(['WHITE_LABEL', 'CORPORATE'] as const).map((m) => (
              <option key={m} value={m}>
                {MODALIDAD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" rows={2} {...register('description')} />
        {errors.description ? (
          <p className="text-destructive text-sm">{errors.description.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="quantity_total">Cantidad total</Label>
          <Input id="quantity_total" type="number" min={1} {...register('quantity_total')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_order">Fecha de pedido</Label>
          <Input id="date_order" type="date" {...register('date_order')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_entrega_estimada">Entrega estimada</Label>
          <Input id="date_entrega_estimada" type="date" {...register('date_entrega_estimada')} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="total_price">Precio total (USD $)</Label>
          <MoneyInput id="total_price" min={0} {...register('total_price')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" rows={2} {...register('notes')} />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Guardar cambios
      </Button>
    </form>
  )
}
