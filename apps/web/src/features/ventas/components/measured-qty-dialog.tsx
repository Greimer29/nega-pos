import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useDisplayCurrency,
  useFormatMoney,
} from '@/features/currencies/context/display-currency-context'
import {
  lineAmountUsdFromQuantity,
  quantityFromLineAmountUsd,
} from '@/features/ventas/utils/measured-line-amount'
import { productSaleUnitAbrev } from '@/features/ventas/constants'
import {
  inventoryQuantityDecimals,
  inventoryUnitLabel,
  isMeasuredSaleUnit,
} from '@/lib/inventory-units'
import { parseDecimalInput, sanitizeDecimalInput } from '@/lib/numeric-input'

type MeasuredQtyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productName: string
  saleUnit: string
  unitPriceUsd: number
  initialQuantity: number
  onConfirm: (quantity: number) => void
}

export function MeasuredQtyDialog({
  open,
  onOpenChange,
  productName,
  saleUnit,
  unitPriceUsd,
  initialQuantity,
  onConfirm,
}: MeasuredQtyDialogProps) {
  const qtyId = useId()
  const amountId = useId()
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const { displayCurrency, fromUsdAmount, toUsdAmount, symbol } = useDisplayCurrency()
  const { formatFromUsd } = useFormatMoney()
  const qtyDecimals = inventoryQuantityDecimals(saleUnit)
  const amountDecimals = displayCurrency === 'USD' ? 4 : 6
  const unitLabel = inventoryUnitLabel(saleUnit)
  const unitAbrev = productSaleUnitAbrev(saleUnit)

  const [qtyDraft, setQtyDraft] = useState('')
  const [amountDraft, setAmountDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const qty = Math.max(0, initialQuantity)
    setQtyDraft(String(qty))
    setAmountDraft(
      Number(
        fromUsdAmount(lineAmountUsdFromQuantity(qty, unitPriceUsd), displayCurrency).toFixed(
          amountDecimals
        )
      ).toString()
    )
    setError(null)
    const timer = window.setTimeout(() => {
      qtyInputRef.current?.focus()
      qtyInputRef.current?.select()
    }, 50)
    return () => window.clearTimeout(timer)
  }, [
    open,
    initialQuantity,
    unitPriceUsd,
    displayCurrency,
    amountDecimals,
    fromUsdAmount,
  ])

  function formatAmountDraft(amountUsd: number) {
    return Number(fromUsdAmount(amountUsd, displayCurrency).toFixed(amountDecimals)).toString()
  }

  function handleQuantityChange(raw: string) {
    const sanitized = sanitizeDecimalInput(raw, qtyDecimals)
    setQtyDraft(sanitized)
    setError(null)
    const parsed = parseDecimalInput(sanitized, qtyDecimals)
    if (parsed == null) {
      return
    }
    setAmountDraft(formatAmountDraft(lineAmountUsdFromQuantity(parsed, unitPriceUsd)))
  }

  function handleAmountChange(raw: string) {
    const sanitized = sanitizeDecimalInput(raw, amountDecimals)
    setAmountDraft(sanitized)
    setError(null)
    const parsedDisplay = parseDecimalInput(sanitized, amountDecimals)
    if (parsedDisplay == null) {
      return
    }
    const amountUsd = Math.max(0, Number(toUsdAmount(parsedDisplay, displayCurrency).toFixed(4)))
    const nextQty = quantityFromLineAmountUsd(amountUsd, unitPriceUsd, saleUnit)
    if (nextQty == null) {
      setError('No se puede calcular la cantidad: precio unitario inválido.')
      return
    }
    setQtyDraft(String(nextQty))
  }

  function handleConfirm() {
    if (!isMeasuredSaleUnit(saleUnit)) {
      setError('Esta unidad no admite cantidad por medida.')
      return
    }
    const qty = parseDecimalInput(qtyDraft, qtyDecimals)
    if (qty == null || qty <= 0) {
      setError('Indicá una cantidad válida mayor a 0.')
      return
    }
    onConfirm(qty)
    onOpenChange(false)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cantidad a facturar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{productName}</p>
            <p className="text-muted-foreground text-xs">
              {formatFromUsd(unitPriceUsd)} / {unitAbrev}
              {unitLabel !== unitAbrev ? ` (${unitLabel})` : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={amountId}>Monto ({symbol()})</Label>
              <Input
                id={amountId}
                type="text"
                inputMode="decimal"
                className="h-11 text-base tabular-nums"
                value={amountDraft}
                onChange={(e) => handleAmountChange(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Monto a cobrar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={qtyId}>Cantidad ({unitAbrev})</Label>
              <Input
                ref={qtyInputRef}
                id={qtyId}
                type="text"
                inputMode="decimal"
                className="h-11 text-base tabular-nums"
                value={qtyDraft}
                onChange={(e) => handleQuantityChange(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label={`Cantidad en ${unitAbrev}`}
              />
            </div>
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Aceptar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
