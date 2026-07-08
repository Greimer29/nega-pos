import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { DecimalInput } from '@/components/decimal-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  INVENTORY_ADJUSTMENT_MODE_DESCRIPTIONS,
  INVENTORY_ADJUSTMENT_MODE_LABELS,
  INVENTORY_ADJUSTMENT_MODES,
  inventoryAdjustmentQuantityLabel,
  inventoryAdjustmentSubmitLabel,
  type InventoryAdjustmentMode,
} from '@/lib/inventory-adjustment'
import { cn } from '@/lib/utils'

const ajusteSchema = z
  .object({
    mode: z.enum(INVENTORY_ADJUSTMENT_MODES),
    quantity: z.coerce.number(),
    note: z.string().trim().max(255).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'AJUSTE') {
      if (values.quantity < 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: 'El stock no puede ser negativo',
        })
      }
      return
    }

    if (values.quantity <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'La cantidad debe ser mayor a cero',
      })
    }
  })

type AjusteFormInput = z.input<typeof ajusteSchema>
type AjusteFormValues = z.infer<typeof ajusteSchema>

export type StockAdjustmentPayload = {
  mode: InventoryAdjustmentMode
  quantity: number
  note?: string
}

type StockAdjustmentFormProps = {
  open?: boolean
  currentStock: number
  unitLabel: string
  isSubmitting?: boolean
  errorMessage?: string | null
  onSubmit: (payload: StockAdjustmentPayload) => Promise<void>
  onCancel: () => void
}

export function StockAdjustmentForm({
  open = true,
  currentStock,
  unitLabel,
  isSubmitting = false,
  errorMessage,
  onSubmit,
  onCancel,
}: StockAdjustmentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AjusteFormInput, unknown, AjusteFormValues>({
    resolver: zodResolver(ajusteSchema),
    defaultValues: { mode: 'CARGO', quantity: 0, note: '' },
  })

  const mode = watch('mode')

  useEffect(() => {
    if (!open) return
    reset({ mode: 'CARGO', quantity: 0, note: '' })
  }, [open, reset])

  useEffect(() => {
    if (mode === 'AJUSTE') {
      setValue('quantity', currentStock)
    } else {
      setValue('quantity', 0)
    }
  }, [mode, currentStock, setValue])

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      mode: values.mode,
      quantity: values.quantity,
      note: values.note?.trim() || undefined,
    })
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
      <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
        <span className="text-muted-foreground">Stock actual: </span>
        <span className="font-semibold tabular-nums">
          {currentStock.toLocaleString('es-VE')} {unitLabel}
        </span>
      </div>

      <div className="space-y-2">
        <Label>Tipo de movimiento</Label>
        <div className="grid grid-cols-3 gap-2">
          {INVENTORY_ADJUSTMENT_MODES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setValue('mode', option, { shouldDirty: true })}
              className={cn(
                'rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                mode === option
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              )}
            >
              {INVENTORY_ADJUSTMENT_MODE_LABELS[option]}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{INVENTORY_ADJUSTMENT_MODE_DESCRIPTIONS[mode]}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adjustment-quantity">
          {inventoryAdjustmentQuantityLabel(mode)} ({unitLabel}) *
        </Label>
        <DecimalInput
          id="adjustment-quantity"
          decimals={3}
          min={mode === 'AJUSTE' ? 0 : undefined}
          {...register('quantity')}
        />
        {errors.quantity ? (
          <p className="text-destructive text-sm">{errors.quantity.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adjustment-note">Nota (opcional)</Label>
        <Textarea id="adjustment-note" rows={2} placeholder="Motivo del movimiento…" {...register('note')} />
      </div>

      {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {inventoryAdjustmentSubmitLabel(mode)}
        </Button>
      </div>
    </form>
  )
}
