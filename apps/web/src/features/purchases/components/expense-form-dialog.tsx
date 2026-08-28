import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from '@/features/purchases/hooks/use-expenses'
import { AccountSelect } from '@/features/accounts/components/account-select'
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
  isPurchaseEntryInNative,
  isValidPurchaseRate,
  nativeToBase,
} from '@/features/purchases/utils/purchase-entry-currency'
import type { Expense } from '@/features/purchases/types'
import { getApiErrorMessage } from '@/lib/api-error'

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  description: z.string().trim().min(1, 'La descripción es obligatoria').max(255),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

type ExpenseFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense | null
}

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const isEditing = expense != null
  const createMutation = useCreateExpenseMutation()
  const updateMutation = useUpdateExpenseMutation()
  const { data: baseCurrencyCode = 'XAU' } = useBaseCurrencyQuery()
  const { data: currencies = [] } = useActiveCurrenciesQuery()
  const [accountId, setAccountId] = useState<number | null>(null)
  const [currencyCode, setCurrencyCode] = useState(baseCurrencyCode)
  const [entryRate, setEntryRate] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      description: '',
      amount: '',
    },
  })

  const amountWatch = useWatch({ control, name: 'amount' })

  useEffect(() => {
    if (open) {
      setAccountId(isEditing ? expense.accountId : null)
      const code = isEditing ? expense.currencyCode : baseCurrencyCode
      setCurrencyCode(code)
      setEntryRate(
        isEditing && expense.entryRate
          ? String(Number(expense.entryRate))
          : catalogRateForCurrency(currencies, code)
      )
      reset(
        isEditing
          ? {
              date: expense.date,
              description: expense.description,
              amount: Number(expense.amount),
            }
          : {
              date: new Date().toISOString().slice(0, 10),
              description: '',
              amount: '',
            }
      )
    }
  }, [open, isEditing, expense, reset, baseCurrencyCode, currencies])

  function handleCurrencyChange(code: string) {
    setCurrencyCode(code)
    setEntryRate(catalogRateForCurrency(currencies, code))
  }

  const entryInNative = isPurchaseEntryInNative(currencyCode, baseCurrencyCode)
  const rateNum = Number(entryRate)
  const amountNum = Number(amountWatch)
  const basePreview = useMemo(() => {
    if (!entryInNative || !isValidPurchaseRate(rateNum) || !(amountNum > 0)) return null
    return nativeToBase(amountNum, rateNum)
  }, [entryInNative, rateNum, amountNum])

  const symbol = currencySymbol(currencyCode)

  const onSubmit = handleSubmit(async (values) => {
    if (entryInNative && !isValidPurchaseRate(rateNum)) {
      setError('root', { message: 'Indicá una tasa válida para la moneda elegida.' })
      return
    }

    try {
      const payload = {
        ...values,
        account_id: accountId,
        currency_code: currencyCode,
        ...(entryInNative ? { entry_rate: rateNum } : {}),
      }
      if (isEditing) {
        await updateMutation.mutateAsync({ id: expense.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
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
          <DialogTitle>{isEditing ? 'Editar gasto' : 'Registrar gasto'}</DialogTitle>
          <DialogDescription>
            Ingresá el monto en la moneda elegida. Los reportes consolidan en{' '}
            {baseCurrencyCode}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-date">Fecha *</Label>
            <Input id="expense-date" type="date" {...register('date')} />
            {errors.date ? <p className="text-destructive text-sm">{errors.date.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-description">Descripción *</Label>
            <Input id="expense-description" {...register('description')} />
            {errors.description ? (
              <p className="text-destructive text-sm">{errors.description.message}</p>
            ) : null}
          </div>

          <EntryCurrencyRateFields
            currencyCode={currencyCode}
            onCurrencyChange={handleCurrencyChange}
            rate={entryRate}
            onRateChange={setEntryRate}
            preview={
              basePreview != null ? (
                <p className="text-muted-foreground text-xs">
                  Equivale a {basePreview.toFixed(4)} {baseCurrencyCode}.
                </p>
              ) : null
            }
          />

          <div className="space-y-2">
            <Label htmlFor="expense-amount">Monto ({symbol}) *</Label>
            <MoneyInput
              id="expense-amount"
              min="0"
              placeholder="0.00"
              {...register('amount')}
            />
            {errors.amount ? (
              <p className="text-destructive text-sm">{errors.amount.message}</p>
            ) : null}
          </div>

          <AccountSelect value={accountId} onChange={setAccountId} />

          {errors.root ? (
            <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {isEditing ? 'Guardar' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
