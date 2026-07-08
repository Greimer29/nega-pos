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
import { MoneyInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  MACHINE_STATUSES,
  MACHINE_STATUS_LABELS,
} from '@/features/machines/constants'
import {
  useCreateMachineMutation,
  useUpdateMachineMutation,
} from '@/features/machines/hooks/use-machines'
import type { Machine } from '@/features/machines/types'
import { getApiErrorMessage } from '@/lib/api-error'

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  type: z.string().trim().min(1, 'El tipo es obligatorio').max(80, 'Máximo 80 caracteres'),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  serialNumber: z.string().trim().max(80).optional(),
  date_adquisicion: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  costo_adquisicion: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
  status: z.enum(MACHINE_STATUSES),
  location: z.string().trim().max(100).optional(),
  notes: z.string().trim().optional(),
  active: z.boolean().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

type MachineFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine?: Machine | null
}

function emptyValues(): FormInput {
  return {
    name: '',
    type: '',
    brand: '',
    model: '',
    serialNumber: '',
    date_adquisicion: '',
    costo_adquisicion: '',
    status: 'OPERATIONAL',
    location: '',
    notes: '',
    active: true,
  }
}

function toFormValues(machine: Machine): FormInput {
  return {
    name: machine.name,
    type: machine.type,
    brand: machine.brand ?? '',
    model: machine.model ?? '',
    serialNumber: machine.serialNumber ?? '',
    date_adquisicion: machine.acquisitionDate ?? '',
    costo_adquisicion: machine.acquisitionCost ?? '',
    status: machine.status,
    location: machine.location ?? '',
    notes: machine.notes ?? '',
    active: machine.active,
  }
}

function toPayload(values: FormValues) {
  return {
    name: values.name.trim(),
    type: values.type,
    brand: values.brand?.trim() || undefined,
    model: values.model?.trim() || undefined,
    serialNumber: values.serialNumber?.trim() || undefined,
    date_adquisicion: values.date_adquisicion?.trim() || undefined,
    costo_adquisicion:
      values.costo_adquisicion === '' ? undefined : Number(values.costo_adquisicion),
    status: values.status,
    location: values.location?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
    ...(values.active !== undefined ? { active: values.active } : {}),
  }
}

export function MachineFormDialog({ open, onOpenChange, machine }: MachineFormDialogProps) {
  const isEditing = machine != null
  const createMutation = useCreateMachineMutation()
  const updateMutation = useUpdateMachineMutation()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (open) {
      reset(isEditing ? toFormValues(machine) : emptyValues())
    }
  }, [open, isEditing, machine, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = toPayload(values)

      if (isEditing) {
        await updateMutation.mutateAsync({ id: machine.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      onOpenChange(false)
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar máquina' : 'Nueva máquina'}</DialogTitle>
          <DialogDescription>
            Registrá los datos base de la máquina. Luego podrás cargar sus gastos asociados.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" {...register('name')} />
              {errors.name ? <p className="text-destructive text-sm">{errors.name.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Input
                id="type"
                placeholder="Ej: Overlock, Recta, Cortadora…"
                {...register('type')}
              />
              {errors.type ? <p className="text-destructive text-sm">{errors.type.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" {...register('brand')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" {...register('model')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial</Label>
              <Input id="serialNumber" {...register('serialNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_adquisicion">Fecha de adquisición</Label>
              <Input id="date_adquisicion" type="date" {...register('date_adquisicion')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo_adquisicion">Costo de adquisición (USD $)</Label>
              <MoneyInput id="costo_adquisicion" min="0" {...register('costo_adquisicion')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input id="location" {...register('location')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          {isEditing ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 rounded border" {...register('active')} />
              Máquina activa
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
                'Crear máquina'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
