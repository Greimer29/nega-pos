import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { useCreateMachinePaymentMutation } from '@/features/machines/hooks/use-machines'
import { notifyApiError, notifyFormError } from '@/features/notifications/query-error-state'
import {
  isPurchaseEntryInNative,
  isValidPurchaseRate,
  nativeToBase,
} from '@/features/purchases/utils/purchase-entry-currency'

type MachinePaymentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  machineId: number
  maxAmountUsd: number
  machineName: string
}

export function MachinePaymentFormDialog({
  open,
  onOpenChange,
  machineId,
  maxAmountUsd,
  machineName,
}: MachinePaymentFormDialogProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const paymentMutation = useCreateMachinePaymentMutation()
  const { data: baseCurrencyCode = 'XAU' } = useBaseCurrencyQuery()
  const { data: currencies = [] } = useActiveCurrenciesQuery()
  const [currencyCode, setCurrencyCode] = useState(baseCurrencyCode)
  const [entryRate, setEntryRate] = useState('')

  const entryInNative = isPurchaseEntryInNative(currencyCode, baseCurrencyCode)
  const rateNum = Number(entryRate)
  const amountNum = Number(amount)
  const basePreview = useMemo(() => {
    if (!entryInNative || !isValidPurchaseRate(rateNum) || !(amountNum > 0)) return null
    return nativeToBase(amountNum, rateNum)
  }, [entryInNative, rateNum, amountNum])
  const symbol = currencySymbol(currencyCode)

  useEffect(() => {
    if (open) {
      setAmount('')
      setDate(today)
      setAccountId(null)
      setNote('')
      setCurrencyCode(baseCurrencyCode)
      setEntryRate(catalogRateForCurrency(currencies, baseCurrencyCode))
    }
  }, [open, today, baseCurrencyCode, currencies])

  function handleCurrencyChange(code: string) {
    setCurrencyCode(code)
    setEntryRate(catalogRateForCurrency(currencies, code))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      notifyFormError('Ingresá un monto válido.')
      return
    }

    if (entryInNative && !isValidPurchaseRate(rateNum)) {
      notifyFormError('Indicá una tasa válida para la moneda elegida.')
      return
    }

    const amountUsd = entryInNative ? nativeToBase(amountNum, rateNum) : amountNum
    if (amountUsd > maxAmountUsd + 0.0001) {
      notifyFormError(
        `El monto no puede superar el saldo pendiente (${maxAmountUsd.toFixed(2)} ${baseCurrencyCode}).`
      )
      return
    }

    try {
      await paymentMutation.mutateAsync({
        machineId,
        payload: {
          amount: amountNum,
          date,
          account_id: accountId,
          note: note.trim() || undefined,
          currency_code: currencyCode,
          ...(entryInNative ? { entry_rate: rateNum } : {}),
        },
      })
      onOpenChange(false)
    } catch (err) {
      notifyApiError(err, 'No se pudo registrar el abono')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abonar máquina</DialogTitle>
          <DialogDescription>
            Abono a la cuenta por pagar de {machineName}. Sale de caja del negocio; no afecta el
            turno de ventas. Saldo máx.: {maxAmountUsd.toFixed(2)} {baseCurrencyCode}.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
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
            <Label htmlFor="machine-payment-amount">Monto ({symbol}) *</Label>
            <MoneyInput
              id="machine-payment-amount"
              min="0"
              decimals={2}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="machine-payment-date">Fecha *</Label>
            <Input
              id="machine-payment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <AccountSelect value={accountId} onChange={setAccountId} />

          <div className="space-y-2">
            <Label htmlFor="machine-payment-note">Nota</Label>
            <Textarea
              id="machine-payment-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Registrar abono
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
