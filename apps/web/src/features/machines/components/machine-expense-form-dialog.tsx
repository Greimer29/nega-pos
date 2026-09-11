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
import { useCreateMachineExpenseMutation } from '@/features/machines/hooks/use-machines'
import {
  isPurchaseEntryInNative,
  isValidPurchaseRate,
  nativeToBase,
} from '@/features/purchases/utils/purchase-entry-currency'
import { getApiErrorMessage } from '@/lib/api-error'

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  description: z.string().trim().max(255),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

type MachineExpenseFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  machineId: number
}

/**
 * Alta desde ficha de máquina → POST /machines/:id/expenses (escribe en `expenses`).
 */
export function MachineExpenseFormDialog({
  open,
  onOpenChange,
  machineId,
}: MachineExpenseFormDialogProps) {
  const createExpenseMutation = useCreateMachineExpenseMutation()
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
      setAccountId(null)
      setCurrencyCode(baseCurrencyCode)
      setEntryRate(catalogRateForCurrency(currencies, baseCurrencyCode))
      reset({
        date: new Date().toISOString().slice(0, 10),
        description: '',
        amount: '',
      })
    }
  }, [open, reset, baseCurrencyCode, currencies])

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
      await createExpenseMutation.mutateAsync({
        machineId,
        payload: {
          date: values.date,
          description: values.description.trim(),
          amount: Number(values.amount),
          account_id: accountId,
          currency_code: currencyCode,
          ...(entryInNative ? { entry_rate: rateNum } : {}),
        },
      })
      onOpenChange(false)
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar gasto</DialogTitle>
          <DialogDescription>
            Ingresá el monto en la moneda elegida. Los reportes consolidan en {baseCurrencyCode}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="machine-expense-date">Fecha *</Label>
            <Input id="machine-expense-date" type="date" {...register('date')} />
            {errors.date ? <p className="text-destructive text-sm">{errors.date.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="machine-expense-description">Descripción</Label>
            <Input
              id="machine-expense-description"
              placeholder="Descripción del gasto"
              {...register('description')}
            />
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
            <Label htmlFor="machine-expense-amount">Monto ({symbol}) *</Label>
            <MoneyInput
              id="machine-expense-amount"
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
              Registrar gasto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
