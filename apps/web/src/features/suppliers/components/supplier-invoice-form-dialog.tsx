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
import { Textarea } from '@/components/ui/textarea'
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
import { useCreateSupplierInvoiceMutation } from '@/features/suppliers/hooks/use-suppliers'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  invoice_number: z.string().trim().max(50).optional(),
  note: z.string().trim().max(255).optional(),
  credit_due_date: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

type SupplierInvoiceFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: number
  defaultCreditDays?: number | null
  onSuccess?: () => void
}

export function SupplierInvoiceFormDialog({
  open,
  onOpenChange,
  supplierId,
  defaultCreditDays,
  onSuccess,
}: SupplierInvoiceFormDialogProps) {
  const createMutation = useCreateSupplierInvoiceMutation()
  const { data: baseCurrencyCode = 'USD' } = useBaseCurrencyQuery()
  const { data: currencies = [] } = useActiveCurrenciesQuery()
  const [isCredit, setIsCredit] = useState(false)
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
      amount: '',
      invoice_number: '',
      note: '',
      credit_due_date: '',
    },
  })

  const amountWatch = useWatch({ control, name: 'amount' })

  useEffect(() => {
    if (!open) return
    setIsCredit(false)
    setAccountId(null)
    setCurrencyCode(baseCurrencyCode)
    setEntryRate(catalogRateForCurrency(currencies, baseCurrencyCode))
    const today = new Date().toISOString().slice(0, 10)
    let due = ''
    if (defaultCreditDays && defaultCreditDays > 0) {
      const d = new Date()
      d.setDate(d.getDate() + defaultCreditDays)
      due = d.toISOString().slice(0, 10)
    }
    reset({
      date: today,
      amount: '',
      invoice_number: '',
      note: '',
      credit_due_date: due,
    })
  }, [open, reset, baseCurrencyCode, currencies, defaultCreditDays])

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
  const busy = isSubmitting || createMutation.isPending

  const onSubmit = handleSubmit(async (values) => {
    if (!isCredit && !accountId) {
      setError('root', { message: 'Seleccioná la cuenta de donde sale el pago.' })
      return
    }
    if (entryInNative && !isValidPurchaseRate(rateNum)) {
      setError('root', { message: 'Indicá una tasa válida para la moneda elegida.' })
      return
    }

    try {
      await createMutation.mutateAsync({
        supplierId,
        payload: {
          date: values.date,
          amount: values.amount,
          currency_code: currencyCode,
          ...(entryInNative ? { entry_rate: rateNum } : {}),
          invoice_number: values.invoice_number?.trim() || undefined,
          note: values.note?.trim() || undefined,
          is_credit: isCredit,
          account_id: isCredit ? null : accountId,
          credit_due_date: isCredit ? values.credit_due_date?.trim() || null : null,
        },
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setError('root', { message: getApiErrorMessage(error) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar factura</DialogTitle>
          <DialogDescription>
            Contado se guarda como gasto (sin stock). Crédito genera deuda al proveedor para abonar
            después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier-invoice-date">Fecha *</Label>
              <Input id="supplier-invoice-date" type="date" {...register('date')} />
              {errors.date ? (
                <p className="text-destructive text-sm">{errors.date.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-invoice-number">Nº factura</Label>
              <Input id="supplier-invoice-number" {...register('invoice_number')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="inline-flex rounded-full bg-neutral-100 p-1">
              <button
                type="button"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  !isCredit ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                )}
                onClick={() => setIsCredit(false)}
              >
                Contado
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  isCredit ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                )}
                onClick={() => setIsCredit(true)}
              >
                Crédito
              </button>
            </div>
          </div>

          {!isCredit ? (
            <AccountSelect value={accountId} onChange={setAccountId} allowEmpty={false} />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="supplier-invoice-due">Vencimiento</Label>
              <Input id="supplier-invoice-due" type="date" {...register('credit_due_date')} />
            </div>
          )}

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
            <Label htmlFor="supplier-invoice-amount">Monto ({symbol}) *</Label>
            <MoneyInput
              id="supplier-invoice-amount"
              min="0"
              placeholder="0.00"
              {...register('amount')}
            />
            {errors.amount ? (
              <p className="text-destructive text-sm">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-invoice-note">Nota</Label>
            <Textarea id="supplier-invoice-note" rows={2} {...register('note')} />
          </div>

          {errors.root ? (
            <p className="text-destructive text-sm whitespace-pre-line">{errors.root.message}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Guardar factura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
