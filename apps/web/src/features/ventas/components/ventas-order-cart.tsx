import type { BillingMethod } from '@/features/ventas/constants'
import { useState, type ReactNode } from 'react'
import { LayoutGrid, Percent, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DisplayMoney, DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import {
  useDisplayCurrency,
  useFormatMoney,
} from '@/features/currencies/context/display-currency-context'
import { VentasBillingMethodToggle } from '@/features/ventas/components/ventas-billing-method-toggle'
import {
  VentasCartLineItem,
  type VentasCartLine,
} from '@/features/ventas/components/ventas-cart-line-item'
import {
  CartLinePriceDialog,
  InvoiceDiscountDialog,
} from '@/features/ventas/components/ventas-cart-price-dialogs'
import { clampInvoiceDiscountUsd } from '@/features/ventas/utils/invoice-discount'
import {
  cartLineListPrice,
  cartPriceDecimals,
  percentOffPriceUsd,
  percentOfSubtotalUsd,
  priceDraftToUsd,
  usdToPriceDraft,
} from '@/features/ventas/utils/ventas-cart-pricing'
import { cn } from '@/lib/utils'
import { MeasuredQtyDialog } from '@/features/ventas/components/measured-qty-dialog'

export type { VentasCartLine }

type VentasOrderCartProps = {
  orderLabel: string
  lines: VentasCartLine[]
  subtotalUsd: number
  totalUsd: number
  discountUsd?: number
  totalBs?: number | null
  onClear: () => void
  onRemoveLine: (key: string) => void
  onUpdateQuantity?: (key: string, quantity: number) => void
  onUpdateUnitPrice?: (key: string, unitPriceUsd: number) => void
  onUpdateInvoiceDiscount?: (discountUsd: number) => void
  emptyMessage?: string
  children?: ReactNode
  className?: string
  headerAction?: ReactNode
  billingMethod?: BillingMethod
  onBillingMethodChange?: (method: BillingMethod) => void
  onClose?: () => void
}

export function VentasOrderCart({
  orderLabel,
  lines,
  subtotalUsd,
  totalUsd,
  discountUsd = 0,
  totalBs,
  onClear,
  onRemoveLine,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onUpdateInvoiceDiscount,
  emptyMessage = 'El carrito está vacío.',
  children,
  className,
  headerAction,
  billingMethod,
  onBillingMethodChange,
  onClose,
}: VentasOrderCartProps) {
  const { formatFromUsd } = useFormatMoney()
  const { displayCurrency, fromUsdAmount, toUsdAmount, symbol } = useDisplayCurrency()
  const [priceLineKey, setPriceLineKey] = useState<string | null>(null)
  const [measuredLineKey, setMeasuredLineKey] = useState<string | null>(null)
  const [draftPrice, setDraftPrice] = useState('')
  const [discountOpen, setDiscountOpen] = useState(false)
  const [draftDiscount, setDraftDiscount] = useState('')
  const priceDecimals = cartPriceDecimals(displayCurrency)
  const priceLine = lines.find((line) => line.key === priceLineKey) ?? null
  const measuredLine = lines.find((line) => line.key === measuredLineKey) ?? null
  const appliedDiscount = clampInvoiceDiscountUsd(subtotalUsd, discountUsd)
  const hasInvoiceDiscount = appliedDiscount > 0.0001

  function formatDraftFromUsd(amountUsd: number) {
    return usdToPriceDraft(
      amountUsd,
      (usd) => fromUsdAmount(usd, displayCurrency),
      priceDecimals
    )
  }

  function parseDraftToUsd(value: string) {
    return priceDraftToUsd(value, (amount) => toUsdAmount(amount, displayCurrency), priceDecimals)
  }

  function openPriceModal(line: VentasCartLine) {
    setDraftPrice(formatDraftFromUsd(line.unitPriceUsd))
    setPriceLineKey(line.key)
  }

  function openMeasuredQtyModal(line: VentasCartLine) {
    setMeasuredLineKey(line.key)
  }

  function applyLinePrice() {
    if (!priceLine || !onUpdateUnitPrice) {
      return
    }
    onUpdateUnitPrice(priceLine.key, parseDraftToUsd(draftPrice))
    setPriceLineKey(null)
  }

  function applyLinePercentOff(pct: number) {
    if (!priceLine) {
      return
    }
    setDraftPrice(formatDraftFromUsd(percentOffPriceUsd(cartLineListPrice(priceLine), pct)))
  }

  function openDiscountModal() {
    setDraftDiscount(formatDraftFromUsd(appliedDiscount))
    setDiscountOpen(true)
  }

  function applyInvoiceDiscountAmount() {
    onUpdateInvoiceDiscount?.(parseDraftToUsd(draftDiscount))
    setDiscountOpen(false)
  }

  function applyInvoicePercentOff(pct: number) {
    setDraftDiscount(formatDraftFromUsd(percentOfSubtotalUsd(subtotalUsd, pct)))
  }

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm',
        className
      )}
    >
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-4 py-3">
        <p className="text-sm font-semibold tracking-tight">{orderLabel}</p>

        {billingMethod != null && onBillingMethodChange ? (
          <VentasBillingMethodToggle value={billingMethod} onChange={onBillingMethodChange} />
        ) : (
          <span aria-hidden />
        )}

        <div className="flex items-center justify-end gap-1">
          {headerAction}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-8"
            disabled={lines.length === 0}
            onClick={onClear}
            title="Vaciar carrito"
            aria-label="Vaciar carrito"
          >
            <Trash2 className="size-4" />
          </Button>
          {onClose ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9"
              title="Cerrar carrito"
              aria-label="Cerrar carrito"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {lines.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">{emptyMessage}</p>
        ) : (
          lines.map((line) => (
            <VentasCartLineItem
              key={line.key}
              line={line}
              onRemoveLine={onRemoveLine}
              onUpdateQuantity={onUpdateQuantity}
              onUpdateUnitPrice={onUpdateUnitPrice}
              onOpenPriceModal={openPriceModal}
              onOpenMeasuredQtyModal={onUpdateQuantity ? openMeasuredQtyModal : undefined}
              formatFromUsd={formatFromUsd}
            />
          ))
        )}
      </div>

      <div className="shrink-0 space-y-3 bg-violet-50/80 px-4 py-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <DisplayMoneyFromUsd amountUsd={subtotalUsd} />
          </div>
          {onUpdateInvoiceDiscount ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 text-left',
                  hasInvoiceDiscount ? 'font-medium text-violet-800' : 'text-muted-foreground'
                )}
                onClick={openDiscountModal}
              >
                <Percent className="size-3.5" />
                Descuento
              </button>
              <button type="button" className="tabular-nums" onClick={openDiscountModal}>
                {hasInvoiceDiscount ? (
                  <span className="text-violet-800">
                    −<DisplayMoneyFromUsd amountUsd={appliedDiscount} />
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </button>
            </div>
          ) : hasInvoiceDiscount ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Descuento</span>
              <span className="text-violet-800">
                −<DisplayMoneyFromUsd amountUsd={appliedDiscount} />
              </span>
            </div>
          ) : null}
          <div className="border-violet-200/80 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <DisplayMoneyFromUsd amountUsd={totalUsd} />
            </div>
            {totalBs != null && totalBs > 0 && displayCurrency !== 'VES' ? (
              <p className="text-muted-foreground mt-1 text-right text-xs">
                <DisplayMoney amount={totalBs} currencyCode="VES" size="sm" />
              </p>
            ) : null}
          </div>
        </div>
        {children}
      </div>

      <MeasuredQtyDialog
        open={measuredLine != null}
        onOpenChange={(open) => !open && setMeasuredLineKey(null)}
        productName={measuredLine?.name ?? ''}
        saleUnit={measuredLine?.saleUnit ?? 'KG'}
        unitPriceUsd={measuredLine?.unitPriceUsd ?? 0}
        initialQuantity={measuredLine?.quantity ?? 0}
        onConfirm={(quantity) => {
          if (!measuredLine || !onUpdateQuantity) return
          onUpdateQuantity(measuredLine.key, quantity)
          setMeasuredLineKey(null)
        }}
      />

      <CartLinePriceDialog
        line={priceLine}
        currencySymbol={symbol(displayCurrency)}
        decimals={priceDecimals}
        draftPrice={draftPrice}
        listPriceLabel={priceLine ? formatFromUsd(cartLineListPrice(priceLine)) : ''}
        onDraftPriceChange={setDraftPrice}
        onPercentOff={applyLinePercentOff}
        onUseListPrice={() => {
          if (priceLine) setDraftPrice(formatDraftFromUsd(cartLineListPrice(priceLine)))
        }}
        onApply={applyLinePrice}
        onClose={() => setPriceLineKey(null)}
      />

      <InvoiceDiscountDialog
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        currencySymbol={symbol(displayCurrency)}
        decimals={priceDecimals}
        draftDiscount={draftDiscount}
        subtotalLabel={formatFromUsd(subtotalUsd)}
        totalLabel={formatFromUsd(Math.max(0, subtotalUsd - parseDraftToUsd(draftDiscount)))}
        onDraftDiscountChange={setDraftDiscount}
        onPercentOff={applyInvoicePercentOff}
        onRemove={() => setDraftDiscount(formatDraftFromUsd(0))}
        onApply={applyInvoiceDiscountAmount}
      />
    </div>
  )
}

export function catalogProductCode(productId: number) {
  return String(productId).padStart(7, '0')
}
export function catalogImageTone(productId: number): VentasCartLine['imageTone'] {
  const tones: NonNullable<VentasCartLine['imageTone']>[] = ['orange', 'violet', 'amber', 'sky']
  return tones[productId % tones.length]
}

export function CatalogCardActionButton({
  onClick,
  label = 'Agregar al carrito',
  compact = false,
}: {
  onClick: () => void
  label?: string
  compact?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'text-muted-foreground hover:text-foreground shrink-0',
        compact ? 'size-6' : 'size-8'
      )}
      onClick={onClick}
      aria-label={label}
    >
      <LayoutGrid className={compact ? 'size-3.5' : 'size-4'} />
    </Button>
  )
}
