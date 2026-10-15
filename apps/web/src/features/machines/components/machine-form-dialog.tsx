import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
  EntryCurrencyRateFields,
  catalogRateForCurrency,
} from '@/features/currencies/components/entry-currency-rate-fields'
import {
  useActiveCurrenciesQuery,
  useBaseCurrencyQuery,
} from '@/features/currencies/hooks/use-currencies'
import { currencySymbol } from '@/features/currencies/utils/convert-currency'
import {
  MACHINE_STATUSES,
  MACHINE_STATUS_LABELS,
} from '@/features/machines/constants'
import {
  useCreateMachineMutation,
  useUpdateMachineMutation,
} from '@/features/machines/hooks/use-machines'
import type { Machine } from '@/features/machines/types'
import { notifyApiError, notifyFormError } from '@/features/notifications/query-error-state'
import {
  isPurchaseEntryInNative,
  isValidPurchaseRate,
  nativeToBase,
} from '@/features/purchases/utils/purchase-entry-currency'

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
    costo_adquisicion: machine.acquisitionAmountNative ?? machine.acquisitionCost ?? '',
    status: machine.status,
    location: machine.location ?? '',
    notes: machine.notes ?? '',
    active: machine.active,
  }
}

export function MachineFormDialog({ open, onOpenChange, machine }: MachineFormDialogProps) {
  const isEditing = machine != null
  const createMutation = useCreateMachineMutation()
  const updateMutation = useUpdateMachineMutation()
  const { data: baseCurrencyCode = 'XAU' } = useBaseCurrencyQuery()
  const { data: currencies = [] } = useActiveCurrenciesQuery()
  const [currencyCode, setCurrencyCode] = useState(baseCurrencyCode)
  const [entryRate, setEntryRate] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  })

  const costWatch = watch('costo_adquisicion')
  const entryInNative = isPurchaseEntryInNative(currencyCode, baseCurrencyCode)
  const rateNum = Number(entryRate)
  const amountNum = Number(costWatch)
  const basePreview = useMemo(() => {
    if (!entryInNative || !isValidPurchaseRate(rateNum) || !(amountNum > 0)) return null
    return nativeToBase(amountNum, rateNum)
  }, [entryInNative, rateNum, amountNum])
  const symbol = currencySymbol(currencyCode)

  useEffect(() => {
    if (!open) return
    reset(isEditing ? toFormValues(machine) : emptyValues())
    const code = isEditing
      ? (machine.entryCurrencyCode ?? baseCurrencyCode)
      : baseCurrencyCode
    setCurrencyCode(code)
    setEntryRate(
      isEditing && machine.entryRate
        ? String(machine.entryRate)
        : catalogRateForCurrency(currencies, code)
    )
  }, [open, isEditing, machine, reset, baseCurrencyCode, currencies])

  function handleCurrencyChange(code: string) {
    setCurrencyCode(code)
    setEntryRate(catalogRateForCurrency(currencies, code))
  }

  const onSubmit = handleSubmit(async (values) => {
    if (
      values.costo_adquisicion !== '' &&
      entryInNative &&
      !isValidPurchaseRate(rateNum)
    ) {
      notifyFormError('Indicá una tasa válida para la moneda elegida.')
      return
    }

    try {
      const payload = {
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
        currency_code: currencyCode,
        ...(entryInNative ? { entry_rate: rateNum } : {}),
      }

      if (isEditing) {
        await updateMutation.mutateAsync({ id: machine.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }

      onOpenChange(false)
    } catch (error) {
      notifyApiError(error, 'No se pudo guardar')
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar máquina' : 'Nueva máquina'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualizá los datos de la máquina. Para comprar a crédito usá una compra a proveedor.'
              : 'Registrá la máquina. Para adquisiciones con factura y crédito, usá Compras.'}
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

          <div className="space-y-2">
            <Label htmlFor="date_adquisicion">Fecha de adquisición</Label>
            <Input id="date_adquisicion" type="date" {...register('date_adquisicion')} />
          </div>

          <EntryCurrencyRateFields
            currencyCode={currencyCode}
            onCurrencyChange={handleCurrencyChange}
            rate={entryRate}
            onRateChange={setEntryRate}
            preview={
              basePreview != null ? (
                <p className="text-muted-foreground text-xs">
                  Equivale a {basePreview.toFixed(4)} {baseCurrencyCode} (costo canónico).
                </p>
              ) : null
            }
          />
          <div className="space-y-2">
            <Label htmlFor="costo_adquisicion">Costo de adquisición ({symbol})</Label>
            <MoneyInput id="costo_adquisicion" min="0" {...register('costo_adquisicion')} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
