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
import {
  EntryCurrencyRateFields,
  catalogRateForCurrency,
} from '@/features/currencies/components/entry-currency-rate-fields'
import {
  useActiveCurrenciesQuery,
  useBaseCurrencyQuery,
} from '@/features/currencies/hooks/use-currencies'
import { currencySymbol } from '@/features/currencies/utils/convert-currency'
import { useCreateCustomerInvoiceMutation } from '@/features/customers/hooks/use-customers'
import { useActivePaymentMethodsQuery } from '@/features/payment-methods/hooks/use-payment-methods'
import {
  isPurchaseEntryInNative,
  isValidPurchaseRate,
  nativeToBase,
} from '@/features/purchases/utils/purchase-entry-currency'
import { notifyApiError, notifyFormError } from '@/features/notifications/query-error-state'
import { cn } from '@/lib/utils'

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  note: z.string().trim().max(255).optional(),
  credit_due_date: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.infer<typeof schema>

type CustomerInvoiceFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: number
  defaultCreditDays?: number | null
  onSuccess?: () => void
}

export function CustomerInvoiceFormDialog({
  open,
  onOpenChange,
  customerId,
  defaultCreditDays,
  onSuccess,
}: CustomerInvoiceFormDialogProps) {
  const createMutation = useCreateCustomerInvoiceMutation()
  const { data: baseCurrencyCode = 'USD' } = useBaseCurrencyQuery()
  const { data: currencies = [] } = useActiveCurrenciesQuery()
  const { data: paymentMethods = [] } = useActivePaymentMethodsQuery()
  const [isCredit, setIsCredit] = useState(false)
  const [paymentMethodCode, setPaymentMethodCode] = useState<string | null>(null)
  const [currencyCode, setCurrencyCode] = useState(baseCurrencyCode)
  const [entryRate, setEntryRate] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      note: '',
      credit_due_date: '',
    },
  })

  const amountWatch = useWatch({ control, name: 'amount' })

  useEffect(() => {
    if (!open) return
    setIsCredit(false)
    const firstMethod = paymentMethods[0] ?? null
    setPaymentMethodCode(firstMethod?.code ?? null)
    const initialCurrency = firstMethod?.currency_code ?? baseCurrencyCode
    setCurrencyCode(initialCurrency)
    setEntryRate(catalogRateForCurrency(currencies, initialCurrency))
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
      note: '',
      credit_due_date: due,
    })
  }, [open, reset, baseCurrencyCode, currencies, defaultCreditDays, paymentMethods])

  function handleCurrencyChange(code: string) {
    setCurrencyCode(code)
    setEntryRate(catalogRateForCurrency(currencies, code))
  }

  function handlePaymentMethodChange(code: string) {
    setPaymentMethodCode(code)
    const method = paymentMethods.find((item) => item.code === code)
    if (method) {
      setCurrencyCode(method.currency_code)
      setEntryRate(catalogRateForCurrency(currencies, method.currency_code))
    }
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
  const canUseCredit = (defaultCreditDays ?? 0) > 0

  const onSubmit = handleSubmit(async (values) => {
    if (!isCredit && !paymentMethodCode) {
      notifyFormError('Seleccioná el método de pago.')
      return
    }
    if (isCredit && !canUseCredit) {
      notifyFormError('El cliente no tiene días de crédito configurados.')
      return
    }
    if (entryInNative && !isValidPurchaseRate(rateNum)) {
      notifyFormError('Indicá una tasa válida para la moneda elegida.')
      return
    }

    try {
      await createMutation.mutateAsync({
        customerId,
        payload: {
          date: values.date,
          amount: values.amount,
          currency_code: currencyCode,
          ...(entryInNative ? { entry_rate: rateNum } : {}),
          note: values.note?.trim() || undefined,
          is_credit: isCredit,
          payment_method_code: isCredit ? null : paymentMethodCode,
          credit_due_date: isCredit ? values.credit_due_date?.trim() || null : null,
          ...(entryInNative && !isCredit ? { usd_rate: rateNum } : {}),
        },
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      notifyApiError(error, 'No se pudo guardar')
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar factura</DialogTitle>
          <DialogDescription>
            Contado se guarda como venta cobrada (sin ítems ni stock). Crédito genera deuda del
            cliente para abonar después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-invoice-date">Fecha *</Label>
            <Input id="customer-invoice-date" type="date" {...register('date')} />
            {errors.date ? (
              <p className="text-destructive text-sm">{errors.date.message}</p>
            ) : null}
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
                  isCredit ? 'bg-neutral-900 text-white' : 'text-neutral-600',
                  !canUseCredit && 'opacity-50'
                )}
                onClick={() => {
                  if (canUseCredit) setIsCredit(true)
                }}
                disabled={!canUseCredit}
                title={
                  canUseCredit
                    ? undefined
                    : 'Configurá días de crédito en el cliente para facturas a crédito'
                }
              >
                Crédito
              </button>
            </div>
          </div>

          {!isCredit ? (
            <div className="space-y-2">
              <Label>Método de pago *</Label>
              {paymentMethods.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay métodos de pago activos.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.code}
                      type="button"
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium',
                        paymentMethodCode === method.code
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 text-neutral-700'
                      )}
                      onClick={() => handlePaymentMethodChange(method.code)}
                    >
                      {method.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="customer-invoice-due">Vencimiento</Label>
              <Input id="customer-invoice-due" type="date" {...register('credit_due_date')} />
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
            <Label htmlFor="customer-invoice-amount">Monto ({symbol}) *</Label>
            <MoneyInput
              id="customer-invoice-amount"
              min="0"
              placeholder="0.00"
              {...register('amount')}
            />
            {errors.amount ? (
              <p className="text-destructive text-sm">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-invoice-note">Nota</Label>
            <Textarea id="customer-invoice-note" rows={2} {...register('note')} />
          </div>

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
