import { MoneyInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { CART_PERCENT_OFF_OPTIONS } from '@/features/ventas/utils/ventas-cart-pricing'

type PercentButtonsProps = {
  onPercent: (pct: number) => void
  resetLabel: string
  onReset: () => void
}

function PercentButtons({ onPercent, resetLabel, onReset }: PercentButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CART_PERCENT_OFF_OPTIONS.map((pct) => (
        <Button key={pct} type="button" variant="outline" size="sm" onClick={() => onPercent(pct)}>
          -{pct}%
        </Button>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={onReset}>
        {resetLabel}
      </Button>
    </div>
  )
}

type CartLinePriceDialogProps = {
  line: { key: string; name: string } | null
  currencySymbol: string
  decimals: number
  draftPrice: string
  listPriceLabel: string
  onDraftPriceChange: (value: string) => void
  onPercentOff: (pct: number) => void
  onUseListPrice: () => void
  onApply: () => void
  onClose: () => void
}

export function CartLinePriceDialog({
  line,
  currencySymbol,
  decimals,
  draftPrice,
  listPriceLabel,
  onDraftPriceChange,
  onPercentOff,
  onUseListPrice,
  onApply,
  onClose,
}: CartLinePriceDialogProps) {
  return (
    <Dialog open={line != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Precio de venta</DialogTitle>
        </DialogHeader>
        {line ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">{line.name}</p>
            <div className="space-y-1.5">
              <Label htmlFor={`cart-price-${line.key}`}>Precio unitario ({currencySymbol})</Label>
              <MoneyInput
                id={`cart-price-${line.key}`}
                min={0}
                decimals={decimals}
                value={draftPrice}
                onChange={(e) => onDraftPriceChange(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">Precio de lista: {listPriceLabel}</p>
            </div>
            <PercentButtons
              onPercent={onPercentOff}
              resetLabel="Precio lista"
              onReset={onUseListPrice}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={onApply}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type InvoiceDiscountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currencySymbol: string
  decimals: number
  draftDiscount: string
  subtotalLabel: string
  totalLabel: string
  onDraftDiscountChange: (value: string) => void
  onPercentOff: (pct: number) => void
  onRemove: () => void
  onApply: () => void
}

export function InvoiceDiscountDialog({
  open,
  onOpenChange,
  currencySymbol,
  decimals,
  draftDiscount,
  subtotalLabel,
  totalLabel,
  onDraftDiscountChange,
  onPercentOff,
  onRemove,
  onApply,
}: InvoiceDiscountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Descuento de factura</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm">Subtotal: {subtotalLabel}</p>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-discount">Descuento ({currencySymbol})</Label>
            <MoneyInput
              id="invoice-discount"
              min={0}
              decimals={decimals}
              value={draftDiscount}
              onChange={(e) => onDraftDiscountChange(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Total: {totalLabel}</p>
          </div>
          <PercentButtons onPercent={onPercentOff} resetLabel="Quitar" onReset={onRemove} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={onApply}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
