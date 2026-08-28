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
import {
  EntryCurrencyRateFields,
  catalogRateForCurrency,
} from '@/features/currencies/components/entry-currency-rate-fields'
import {
  useActiveCurrenciesQuery,
  useBaseCurrencyQuery,
} from '@/features/currencies/hooks/use-currencies'
import { currencySymbol } from '@/features/currencies/utils/convert-currency'
import { useActivePaymentMethodsQuery } from '@/features/payment-methods/hooks/use-payment-methods'
import type { PaymentMethod } from '@/features/payment-methods/types'
import {
  baseToNative,
  isPurchaseEntryInNative,
  isValidPurchaseRate,
} from '@/features/purchases/utils/purchase-entry-currency'
import { formatUsd } from '@/features/ventas/constants'
import { cn } from '@/lib/utils'

export type SalePaymentConfirmOptions = {
  currency_code: string
  usd_rate?: number
}

type VentasPaymentMethodDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalUsd: number
  isSubmitting?: boolean
  onConfirm: (method: PaymentMethod, options: SalePaymentConfirmOptions) => void
}

export function VentasPaymentMethodDialog({
  open,
  onOpenChange,
  totalUsd,
  isSubmitting = false,
  onConfirm,
}: VentasPaymentMethodDialogProps) {
  const { data: methods = [], isLoading } = useActivePaymentMethodsQuery()
  const { data: currencies = [] } = useActiveCurrenciesQuery()
  const { data: baseCurrencyCode = 'XAU' } = useBaseCurrencyQuery()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [currencyCode, setCurrencyCode] = useState(baseCurrencyCode)
  const [entryRate, setEntryRate] = useState('')

  const selected = methods.find((method) => method.code === selectedCode) ?? null

  useEffect(() => {
    if (!open) return
    const first = methods[0] ?? null
    setSelectedCode(first?.code ?? null)
    const code = first?.currency_code ?? baseCurrencyCode
    setCurrencyCode(code)
    setEntryRate(catalogRateForCurrency(currencies, code))
  }, [open, methods, currencies, baseCurrencyCode])

  function handleMethodSelect(method: PaymentMethod) {
    setSelectedCode(method.code)
    setCurrencyCode(method.currency_code)
    setEntryRate(catalogRateForCurrency(currencies, method.currency_code))
  }

  function handleCurrencyChange(code: string) {
    setCurrencyCode(code)
    setEntryRate(catalogRateForCurrency(currencies, code))
  }

  const entryInNative = isPurchaseEntryInNative(currencyCode, baseCurrencyCode)
  const rateNum = Number(entryRate)
  const nativeTotal = useMemo(() => {
    if (!entryInNative) return totalUsd
    if (!isValidPurchaseRate(rateNum)) return null
    return baseToNative(totalUsd, rateNum, currencyCode)
  }, [entryInNative, rateNum, totalUsd, currencyCode])

  const symbol = currencySymbol(currencyCode)
  const canConfirm =
    selected != null &&
    methods.length > 0 &&
    (!entryInNative || isValidPurchaseRate(rateNum))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Método de pago</DialogTitle>
          <DialogDescription>
            Total a cobrar:{' '}
            <strong>
              {formatUsd(totalUsd)} {baseCurrencyCode}
            </strong>
            . Elegí cómo pagó el cliente.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando métodos…
          </div>
        ) : methods.length === 0 ? (
          <p className="text-muted-foreground py-6 text-sm">
            No hay métodos de pago activos. Configuralos en Ajustes → Ventas.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              {methods.map((method) => (
                <button
                  key={method.code}
                  type="button"
                  className={cn(
                    'rounded-lg border px-4 py-3 text-left transition-colors',
                    selectedCode === method.code
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => handleMethodSelect(method)}
                >
                  <div className="font-medium">{method.name}</div>
                  <div className="text-muted-foreground text-xs">
                    Moneda del método: {method.currency_code}
                  </div>
                </button>
              ))}
            </div>

            <EntryCurrencyRateFields
              currencyCode={currencyCode}
              onCurrencyChange={handleCurrencyChange}
              rate={entryRate}
              onRateChange={setEntryRate}
              preview={
                nativeTotal != null && entryInNative ? (
                  <p className="text-muted-foreground text-xs">
                    Equivalente: {formatUsd(nativeTotal)} {symbol}.
                  </p>
                ) : null
              }
            />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canConfirm || isSubmitting}
            onClick={() => {
              if (!selected) return
              onConfirm(selected, {
                currency_code: currencyCode,
                ...(entryInNative && isValidPurchaseRate(rateNum)
                  ? { usd_rate: rateNum }
                  : {}),
              })
            }}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Confirmar venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
