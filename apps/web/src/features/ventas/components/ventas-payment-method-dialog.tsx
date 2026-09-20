import { Loader2, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { catalogRateForCurrency } from '@/features/currencies/components/entry-currency-rate-fields'
import {
  useActiveCurrenciesQuery,
  useBaseCurrencyQuery,
} from '@/features/currencies/hooks/use-currencies'
import { useActivePaymentMethodsQuery } from '@/features/payment-methods/hooks/use-payment-methods'
import type { PaymentMethod } from '@/features/payment-methods/types'
import {
  isPurchaseEntryInNative,
  isValidPurchaseRate,
} from '@/features/purchases/utils/purchase-entry-currency'
import { formatUsd } from '@/features/ventas/constants'
import type { ConfirmSalePaymentInput } from '@/features/ventas/types'
import { cn } from '@/lib/utils'

export type SalePaymentConfirmOptions = {
  currency_code: string
  usd_rate?: number
}

type AllocatedPayment = {
  method: PaymentMethod
  amountUsd: number
  currency_code: string
  usd_rate?: number
}

type VentasPaymentMethodDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalUsd: number
  isSubmitting?: boolean
  onConfirm: (payments: ConfirmSalePaymentInput[]) => void
}

function roundUsd(value: number) {
  return Math.round(value * 10000) / 10000
}

function parseChargeAmount(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return null
  }
  const parsed = Number(trimmed.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
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
  const [allocated, setAllocated] = useState<AllocatedPayment[]>([])
  const [addAmount, setAddAmount] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const selected = methods.find((method) => method.code === selectedCode) ?? null
  const allocatedTotal = roundUsd(allocated.reduce((sum, item) => sum + item.amountUsd, 0))
  const remaining = roundUsd(Math.max(0, totalUsd - allocatedTotal))

  useEffect(() => {
    if (!open) return
    const first = methods[0] ?? null
    setSelectedCode(first?.code ?? null)
    const code = first?.currency_code ?? baseCurrencyCode
    setCurrencyCode(code)
    setEntryRate(catalogRateForCurrency(currencies, code))
    setAllocated([])
    setAddAmount('')
    setLocalError(null)
  }, [open, methods, currencies, baseCurrencyCode])

  function applyMethodDefaults(method: PaymentMethod) {
    setSelectedCode(method.code)
    // Moneda y tasa ya no se eligen en el formulario: salen del método activo
    // (payment_methods.currency_code + tasa de catálogo). buildPaymentOptions()
    // las manda en cada línea de payments[]. Antes: EntryCurrencyRateFields
    // ($ / Bs + tasa editable) y el texto «Los montos se ingresan en la moneda base».
    setCurrencyCode(method.currency_code)
    setEntryRate(catalogRateForCurrency(currencies, method.currency_code))
    setLocalError(null)
  }

  const entryInNative = isPurchaseEntryInNative(currencyCode, baseCurrencyCode)
  const rateNum = Number(entryRate)
  const rateValid = !entryInNative || isValidPurchaseRate(rateNum)
  const typedAmount = parseChargeAmount(addAmount)
  const typedCoversRemaining =
    typedAmount == null || Math.abs(typedAmount - remaining) <= 0.00015
  const canConfirm =
    methods.length > 0 &&
    remaining <= 0.00015 &&
    allocated.length > 0 &&
    !isSubmitting
  const canConfirmRemaining =
    selected != null &&
    methods.length > 0 &&
    remaining > 0.00015 &&
    rateValid &&
    typedCoversRemaining &&
    !isSubmitting
  const canAddMethod =
    selected != null &&
    remaining > 0.00015 &&
    rateValid &&
    !isSubmitting

  function buildPaymentOptions(): SalePaymentConfirmOptions {
    return {
      currency_code: currencyCode,
      ...(entryInNative && isValidPurchaseRate(rateNum) ? { usd_rate: rateNum } : {}),
    }
  }

  function mergePayments(next: AllocatedPayment[]) {
    const byCode = new Map<string, AllocatedPayment>()
    for (const item of next) {
      const current = byCode.get(item.method.code)
      if (current) {
        byCode.set(item.method.code, {
          ...item,
          amountUsd: roundUsd(current.amountUsd + item.amountUsd),
        })
      } else {
        byCode.set(item.method.code, item)
      }
    }
    return [...byCode.values()]
  }

  function toPayload(items: AllocatedPayment[]): ConfirmSalePaymentInput[] {
    return items.map((item) => ({
      payment_method_code: item.method.code,
      amount_usd: roundUsd(item.amountUsd),
      currency_code: item.currency_code,
      ...(item.usd_rate != null ? { usd_rate: item.usd_rate } : {}),
    }))
  }

  function handleAddMethod() {
    if (!selected) return
    const parsed = Number(addAmount.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setLocalError('Indicá la cantidad a cobrar con este método.')
      return
    }
    if (parsed - remaining > 0.00015) {
      setLocalError(`El monto no puede superar el restante (${formatUsd(remaining)} ${baseCurrencyCode}).`)
      return
    }

    const options = buildPaymentOptions()
    setAllocated(
      mergePayments([
        ...allocated,
        {
          method: selected,
          amountUsd: roundUsd(parsed),
          currency_code: options.currency_code,
          usd_rate: options.usd_rate,
        },
      ])
    )
    setAddAmount('')
    setLocalError(null)
  }

  function handleConfirm() {
    if (remaining > 0.00015) {
      if (!selected) return
      if (typedAmount != null && typedAmount - remaining > 0.00015) {
        setLocalError(
          `El monto no puede superar el restante (${formatUsd(remaining)} ${baseCurrencyCode}).`
        )
        return
      }
      if (typedAmount != null && typedAmount + 0.00015 < remaining) {
        setLocalError(
          'La cantidad a cobrar no cubre el total. Agregá otro método de pago para completar.'
        )
        return
      }
      if (typedAmount != null && typedAmount <= 0) {
        setLocalError('Indicá la cantidad a cobrar con este método.')
        return
      }
      const options = buildPaymentOptions()
      onConfirm(
        toPayload(
          mergePayments([
            ...allocated,
            {
              method: selected,
              amountUsd: remaining,
              currency_code: options.currency_code,
              usd_rate: options.usd_rate,
            },
          ])
        )
      )
      return
    }

    if (allocated.length === 0) return

    if (remaining > 0) {
      const last = allocated[allocated.length - 1]!
      onConfirm(
        toPayload([
          ...allocated.slice(0, -1),
          { ...last, amountUsd: roundUsd(last.amountUsd + remaining) },
        ])
      )
      return
    }

    onConfirm(toPayload(allocated))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Método de pago</DialogTitle>
          <DialogDescription>
            Total a cobrar:{' '}
            <strong>
              {formatUsd(totalUsd)} {baseCurrencyCode}
            </strong>
            . Si cobrás menos del total, agregá otro método hasta completar. Confirmar solo con el
            restante cubierto.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
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
                  onClick={() => applyMethodDefaults(method)}
                >
                  <div className="font-medium">{method.name}</div>
                  <div className="text-muted-foreground text-xs">
                    Moneda del método: {method.currency_code}
                  </div>
                </button>
              ))}
            </div>

            {allocated.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pagos agregados</p>
                <ul className="space-y-1">
                  {allocated.map((item) => (
                    <li
                      key={item.method.code}
                      className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2 text-sm"
                    >
                      <span>
                        {item.method.name}: {formatUsd(item.amountUsd)} {baseCurrencyCode}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Quitar ${item.method.name}`}
                        onClick={() =>
                          setAllocated(allocated.filter((row) => row.method.code !== item.method.code))
                        }
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Restante</span>
              <strong>
                {formatUsd(remaining)} {baseCurrencyCode}
              </strong>
            </div>

            {remaining > 0.00015 ? (
              <div className="space-y-2">
                <Label htmlFor="sale-payment-amount">Cantidad a cobrar</Label>
                <Input
                  id="sale-payment-amount"
                  type="number"
                  min="0"
                  step="0.0001"
                  inputMode="decimal"
                  placeholder={`Máx. ${formatUsd(remaining)}`}
                  value={addAmount}
                  onChange={(event) => {
                    setAddAmount(event.target.value)
                    setLocalError(null)
                  }}
                />
              </div>
            ) : null}

            {localError ? <p className="text-destructive text-sm">{localError}</p> : null}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              disabled={!canAddMethod}
              onClick={handleAddMethod}
            >
              <Plus className="size-4" />
              Agregar método de pago
            </Button>
            <Button
              type="button"
              disabled={!(canConfirm || canConfirmRemaining)}
              onClick={handleConfirm}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              Confirmar venta
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
