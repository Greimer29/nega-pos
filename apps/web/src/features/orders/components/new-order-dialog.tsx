import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
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
import { MoneyInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCustomersQuery } from '@/features/customers/hooks/use-customers'
import { MODALIDAD_LABELS } from '@/features/orders/constants'
import { useCreateOrderMutation } from '@/features/orders/hooks/use-orders'
import { getApiErrorMessage } from '@/lib/api-error'

const schema = z.object({
  customer_id: z.coerce.number().min(1, 'Seleccioná un cliente'),
  modalidad: z.enum(['WHITE_LABEL', 'CORPORATE']),
  description: z.string().trim().min(1, 'La descripción es obligatoria'),
  quantity_total: z.coerce.number().min(1, 'Cantidad mínima 1'),
  date_order: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  date_entrega_estimada: z
    .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional(),
  total_price: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
  notes: z.string().trim().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

type NuevoOrderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NuevoOrderDialog({ open, onOpenChange }: NuevoOrderDialogProps) {
  const navigate = useNavigate()
  const createMutation = useCreateOrderMutation()
  const { data: customersData } = useCustomersQuery({ page: 1, perPage: 100, active: true })

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_id: '',
      modalidad: 'CORPORATE',
      description: '',
      quantity_total: 1,
      date_order: new Date().toISOString().slice(0, 10),
      date_entrega_estimada: '',
      total_price: '',
      notes: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const order = await createMutation.mutateAsync({
        customer_id: values.customer_id,
        modalidad: values.modalidad,
        description: values.description.trim(),
        quantity_total: values.quantity_total,
        date_order: values.date_order,
        date_entrega_estimada: values.date_entrega_estimada?.trim() || undefined,
        total_price: values.total_price === '' ? undefined : Number(values.total_price),
        notes: values.notes?.trim() || undefined,
      })
      onOpenChange(false)
      reset()
      void navigate(`/orders/${order.id}`)
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  const customers = customersData?.customers ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo pedido</DialogTitle>
          <DialogDescription>
            Se creará en borrador con código automático. Podrás confirmarlo después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Cliente</Label>
            <select
              id="customer_id"
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
              {...register('customer_id')}
            >
              <option value="">Seleccionar…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.customer_id ? (
              <p className="text-destructive text-sm">{errors.customer_id.message}</p>
            ) : null}
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

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea id="description" rows={2} {...register('description')} />
            {errors.description ? (
              <p className="text-destructive text-sm">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity_total">Cantidad total *</Label>
              <Input id="quantity_total" type="number" min={1} {...register('quantity_total')} />
              {errors.quantity_total ? (
                <p className="text-destructive text-sm">{errors.quantity_total.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_price">Precio total (USD $)</Label>
              <MoneyInput id="total_price" min={0} {...register('total_price')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_order">Fecha de pedido *</Label>
              <Input id="date_order" type="date" {...register('date_order')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_entrega_estimada">Entrega estimada</Label>
              <Input id="date_entrega_estimada" type="date" {...register('date_entrega_estimada')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          {errors.root ? <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Crear borrador
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
