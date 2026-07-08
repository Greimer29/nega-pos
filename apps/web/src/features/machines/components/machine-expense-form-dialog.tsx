import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
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
  MACHINE_EXPENSE_CATEGORIES,
  MACHINE_EXPENSE_CATEGORY_LABELS,
} from '@/features/machines/constants'
import { useCreateMachineExpenseMutation } from '@/features/machines/hooks/use-machines'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { CurrencySelect } from '@/features/currencies/components/currency-select'
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers'
import { getApiErrorMessage } from '@/lib/api-error'

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  category: z.enum(MACHINE_EXPENSE_CATEGORIES),
  description: z.string().trim().min(1, 'La descripción es obligatoria').max(255),
  amount: z.coerce.number().min(0, 'El monto debe ser mayor o igual a 0'),
  supplier_id: z.union([z.literal(''), z.coerce.number().min(1)]).optional(),
  notes: z.string().trim().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

type MachineExpenseFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  machineId: number
}

export function MachineExpenseFormDialog({
  open,
  onOpenChange,
  machineId,
}: MachineExpenseFormDialogProps) {
  const createExpenseMutation = useCreateMachineExpenseMutation()
  const { data: suppliersData } = useSuppliersQuery({ page: 1, perPage: 100, active: true })
  const [accountId, setAccountId] = useState<number | null>(null)
  const [currencyCode, setCurrencyCode] = useState('USD')

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      category: 'REPAIR',
      description: '',
      amount: 0,
      supplier_id: '',
      notes: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createExpenseMutation.mutateAsync({
        machineId,
        payload: {
          date: values.date,
          category: values.category,
          description: values.description.trim(),
          amount: Number(values.amount),
          supplier_id: values.supplier_id === '' ? undefined : Number(values.supplier_id),
          notes: values.notes?.trim() || undefined,
          account_id: accountId,
          currency_code: 'USD',
        },
      })

      onOpenChange(false)
      reset()
      setAccountId(null)
      setCurrencyCode('USD')
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  const suppliers = suppliersData?.suppliers ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>Asociá un gasto operativo a esta máquina.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha *</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date ? <p className="text-destructive text-sm">{errors.date.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <select
                id="category"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                {...register('category')}
              >
                {MACHINE_EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {MACHINE_EXPENSE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Input id="description" {...register('description')} />
            {errors.description ? (
              <p className="text-destructive text-sm">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CurrencySelect registrationOnly value={currencyCode} onChange={setCurrencyCode} />
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (USD $) *</Label>
              <MoneyInput id="amount" min="0" {...register('amount')} />
              {errors.amount ? <p className="text-destructive text-sm">{errors.amount.message}</p> : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="supplier_id">Proveedor (opcional)</Label>
              <select
                id="supplier_id"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                {...register('supplier_id')}
              >
                <option value="">— Ninguno —</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <AccountSelect value={accountId} onChange={setAccountId} />

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
              ) : (
                'Registrar gasto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
