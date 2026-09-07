import { PublicImage } from '@/components/public-image'
import type { ProductSaleUnit } from '@/features/ventas/constants'
import type { BillingMethod } from '@/features/ventas/constants'
import { useState, type ReactNode } from 'react'
import { DollarSign, LayoutGrid, MessageSquareText, Package, Percent, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DisplayMoney, DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import {
  useDisplayCurrency,
  useFormatMoney,
} from '@/features/currencies/context/display-currency-context'
import { VentasBillingMethodToggle } from '@/features/ventas/components/ventas-billing-method-toggle'
import { clampInvoiceDiscountUsd } from '@/features/ventas/utils/invoice-discount'
import { inventoryQuantityDecimals } from '@/lib/inventory-units'
import { cn } from '@/lib/utils'
import { parseDecimalInput } from '@/lib/numeric-input'

export type VentasCartLine = {
  key: string
  name: string
  code: string
  quantity: number
  unitPriceUsd: number
  listPriceUsd?: number
  saleUnit?: ProductSaleUnit
  imageUrl?: string | null
  imageTone?: 'orange' | 'violet' | 'amber' | 'sky'
  metaLabel?: string
  hasFormula?: boolean
  hasCustomFormula?: boolean
  kitchenNote?: string | null
  onAdjustFormula?: () => void
  onEditKitchenNote?: () => void
}

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

const IMAGE_TONE_CLASS: Record<NonNullable<VentasCartLine['imageTone']>, string> = {
  orange: 'bg-orange-100',
  violet: 'bg-violet-100',
  amber: 'bg-amber-100',
  sky: 'bg-sky-100',
}

function lineSubtotal(line: VentasCartLine) {
  return line.quantity * line.unitPriceUsd
}

function lineHasPriceAdjustment(line: VentasCartLine) {
  const listPrice = line.listPriceUsd ?? line.unitPriceUsd
  return Math.abs(listPrice - line.unitPriceUsd) > 0.0001
}

function CartLineSubtotal({ line }: { line: VentasCartLine }) {
  const { formatFromUsd } = useFormatMoney()
  return <span className="text-sm font-bold">{formatFromUsd(lineSubtotal(line))}</span>
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
  const [draftPrice, setDraftPrice] = useState('')
  const [discountOpen, setDiscountOpen] = useState(false)
  const [draftDiscount, setDraftDiscount] = useState('')
  const priceDecimals = displayCurrency === 'USD' ? 4 : 6
  const priceLine = lines.find((line) => line.key === priceLineKey) ?? null
  const appliedDiscount = clampInvoiceDiscountUsd(subtotalUsd, discountUsd)
  const hasInvoiceDiscount = appliedDiscount > 0.0001

  function formatDraftFromUsd(amountUsd: number) {
    return Number(fromUsdAmount(amountUsd, displayCurrency).toFixed(priceDecimals)).toString()
  }

  function parseDraftToUsd(value: string) {
    const parsedDisplay = parseDecimalInput(value, priceDecimals) ?? 0
    return Math.max(0, Number(toUsdAmount(parsedDisplay, displayCurrency).toFixed(4)))
  }

  function openPriceModal(line: VentasCartLine) {
    setDraftPrice(formatDraftFromUsd(line.unitPriceUsd))
    setPriceLineKey(line.key)
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
    const listPrice = priceLine.listPriceUsd ?? priceLine.unitPriceUsd
    setDraftPrice(formatDraftFromUsd(Math.max(0, listPrice * (1 - pct / 100))))
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
    setDraftDiscount(formatDraftFromUsd(Math.max(0, subtotalUsd * (pct / 100))))
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
            <div
              key={line.key}
              className="relative rounded-xl border bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground absolute top-2 right-2 size-7 rounded-full"
                onClick={() => onRemoveLine(line.key)}
                aria-label={`Quitar ${line.name}`}
              >
                <X className="size-3.5" />
              </Button>

              <div className="flex gap-3 pr-8">
                <div
                  className={cn(
                    'flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl',
                    line.imageUrl ? 'bg-muted' : IMAGE_TONE_CLASS[line.imageTone ?? 'violet']
                  )}
                >
                   {line.imageUrl ? (
                    <PublicImage
                      src={line.imageUrl}
                      alt={line.name}
                      className="size-full object-cover"
                      showFallbackIcon
                      fallbackClassName="size-full"
                    />
                  ) : (
                    <Package className="text-muted-foreground/70 size-7" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 text-sm leading-snug font-semibold">{line.name}</p>
                  <p className="text-muted-foreground text-xs">Código: {line.code}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {line.metaLabel ? <span>{line.metaLabel}</span> : null}
                    {onUpdateQuantity ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span>Cantidad:</span>
                          {(() => {
                            const unit = line.saleUnit ?? 'UND'
                            const decimals = inventoryQuantityDecimals(unit)
                            const isIntegerUnit = decimals === 0
                            return (
                              <DecimalInput
                                min={isIntegerUnit ? 1 : 0.01}
                                step={isIntegerUnit ? 1 : 0.01}
                                decimals={decimals}
                                className={cn(
                                  'h-7 px-2 text-xs',
                                  isIntegerUnit ? 'w-12' : 'w-16'
                                )}
                                value={line.quantity}
                                onChange={(e) =>
                                  onUpdateQuantity(
                                    line.key,
                                    parseDecimalInput(e.target.value, decimals) ?? 0
                                  )
                                }
                              />
                            )
                          })()}
                        </div>
                        {line.hasFormula && line.onAdjustFormula ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'size-7',
                              line.hasCustomFormula && 'text-violet-600 hover:text-violet-700'
                            )}
                            title="Ajustar materiales de esta venta"
                            onClick={line.onAdjustFormula}
                            aria-label="Ajustar materiales de esta venta"
                          >
                            <SlidersHorizontal className="size-3.5" />
                          </Button>
                        ) : null}
                        {onUpdateUnitPrice ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'size-7',
                              lineHasPriceAdjustment(line)
                                ? 'text-violet-700 hover:text-violet-800'
                                : 'text-muted-foreground'
                            )}
                            title="Precio, descuento o aumento"
                            aria-label="Precio, descuento o aumento"
                            onClick={() => openPriceModal(line)}
                          >
                            <DollarSign className="size-3.5" />
                          </Button>
                        ) : null}
                        {line.onEditKitchenNote ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              'size-7',
                              line.kitchenNote?.trim() && 'text-amber-700 hover:text-amber-800'
                            )}
                            title="Indicación para cocina"
                            onClick={line.onEditKitchenNote}
                            aria-label="Indicación para cocina"
                          >
                            <MessageSquareText className="size-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <span>Cantidad: {line.quantity}</span>
                    )}
                  </div>
                  {line.kitchenNote?.trim() ? (
                    <p className="line-clamp-2 text-xs text-amber-800/90 whitespace-pre-line">
                      {line.kitchenNote.trim()}
                    </p>
                  ) : null}
                  <div className="flex items-end justify-between gap-2 pt-1">
                    <div className="min-w-0">
                      {lineHasPriceAdjustment(line) && (line.listPriceUsd ?? 0) > line.unitPriceUsd ? (
                        <p className="text-muted-foreground text-[11px] line-through">
                          {formatFromUsd(line.listPriceUsd ?? line.unitPriceUsd)} c/u
                        </p>
                      ) : lineHasPriceAdjustment(line) ? (
                        <p className="text-muted-foreground text-[11px]">
                          Lista {formatFromUsd(line.listPriceUsd ?? line.unitPriceUsd)} c/u
                        </p>
                      ) : null}
                    </div>
                    <p className="tabular-nums">
                      <CartLineSubtotal line={line} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
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

      <Dialog open={priceLine != null} onOpenChange={(open) => !open && setPriceLineKey(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Precio de venta</DialogTitle>
          </DialogHeader>
          {priceLine ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">{priceLine.name}</p>
              <div className="space-y-1.5">
                <Label htmlFor={`cart-price-${priceLine.key}`}>
                  Precio unitario ({symbol(displayCurrency)})
                </Label>
                <MoneyInput
                  id={`cart-price-${priceLine.key}`}
                  min={0}
                  decimals={priceDecimals}
                  value={draftPrice}
                  onChange={(e) => setDraftPrice(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Precio de lista: {formatFromUsd(priceLine.listPriceUsd ?? priceLine.unitPriceUsd)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 20].map((pct) => (
                  <Button
                    key={pct}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyLinePercentOff(pct)}
                  >
                    -{pct}%
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraftPrice(formatDraftFromUsd(priceLine.listPriceUsd ?? priceLine.unitPriceUsd))
                  }
                >
                  Precio lista
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPriceLineKey(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyLinePrice}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Descuento de factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Subtotal: {formatFromUsd(subtotalUsd)}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-discount">Descuento ({symbol(displayCurrency)})</Label>
              <MoneyInput
                id="invoice-discount"
                min={0}
                decimals={priceDecimals}
                value={draftDiscount}
                onChange={(e) => setDraftDiscount(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Total: {formatFromUsd(Math.max(0, subtotalUsd - parseDraftToUsd(draftDiscount)))}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20].map((pct) => (
                <Button
                  key={pct}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyInvoicePercentOff(pct)}
                >
                  -{pct}%
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDraftDiscount(formatDraftFromUsd(0))}
              >
                Quitar
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDiscountOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyInvoiceDiscountAmount}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
