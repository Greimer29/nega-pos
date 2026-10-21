import { useEffect, useState } from 'react'
import { DollarSign, MessageSquareText, Minus, Package, Plus, SlidersHorizontal, X } from 'lucide-react'
import { PublicImage } from '@/components/public-image'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import type { ProductSaleUnit } from '@/features/ventas/constants'
import {
  cartLineHasPriceAdjustment,
  cartLineListPrice,
  cartLinePriceAdjustmentKind,
  cartLineSubtotal,
} from '@/features/ventas/utils/ventas-cart-pricing'
import {
  inventoryQuantityDecimals,
  inventoryQuantityStep,
  isMeasuredSaleUnit,
  normalizeInventoryQuantity,
} from '@/lib/inventory-units'
import { parseDecimalInput, sanitizeDecimalInput } from '@/lib/numeric-input'
import { cn } from '@/lib/utils'

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
  detail?: string | null
  isService?: boolean
  hasFormula?: boolean
  hasCustomFormula?: boolean
  kitchenNote?: string | null
  canWholesale?: boolean
  isWholesale?: boolean
  wholesaleHint?: string | null
  onToggleWholesale?: (checked: boolean) => void
  onAdjustFormula?: () => void
  onEditKitchenNote?: () => void
  onEditDetail?: () => void
}

const IMAGE_TONE_CLASS: Record<NonNullable<VentasCartLine['imageTone']>, string> = {
  orange: 'bg-orange-100',
  violet: 'bg-violet-100',
  amber: 'bg-amber-100',
  sky: 'bg-sky-100',
}

type VentasCartLineItemProps = {
  line: VentasCartLine
  onRemoveLine: (key: string) => void
  onUpdateQuantity?: (key: string, quantity: number) => void
  onUpdateUnitPrice?: (key: string, unitPriceUsd: number) => void
  onOpenPriceModal: (line: VentasCartLine) => void
  onOpenMeasuredQtyModal?: (line: VentasCartLine) => void
  formatFromUsd: (amountUsd: number) => string
}

export function VentasCartLineItem({
  line,
  onRemoveLine,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onOpenPriceModal,
  onOpenMeasuredQtyModal,
  formatFromUsd,
}: VentasCartLineItemProps) {
  const unit = line.saleUnit ?? 'UND'
  const decimals = inventoryQuantityDecimals(unit)
  const step = inventoryQuantityStep(unit)
  const isIntegerUnit = decimals === 0
  const usesMeasuredModal =
    Boolean(onUpdateQuantity) &&
    Boolean(onOpenMeasuredQtyModal) &&
    isMeasuredSaleUnit(unit) &&
    !line.isWholesale
  const priceAdjustment = cartLinePriceAdjustmentKind(line)
  const [qtyDraft, setQtyDraft] = useState(() => String(line.quantity))
  const [qtyFocused, setQtyFocused] = useState(false)

  useEffect(() => {
    if (!qtyFocused) {
      setQtyDraft(String(line.quantity))
    }
  }, [line.quantity, qtyFocused])

  function commitQuantity(raw: string) {
    const parsed = parseDecimalInput(raw, decimals)
    setQtyFocused(false)
    if (parsed == null) {
      setQtyDraft(String(line.quantity))
      return
    }
    setQtyDraft(String(parsed))
    onUpdateQuantity?.(line.key, parsed)
  }

  function adjustQuantity(direction: 1 | -1) {
    const live = parseDecimalInput(qtyDraft, decimals)
    const base = live ?? line.quantity
    const next = normalizeInventoryQuantity(base + direction * step, unit)
    setQtyDraft(String(Math.max(next, 0)))
    onUpdateQuantity?.(line.key, next)
  }

  return (
    <div className="relative rounded-xl border bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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

      <div className="flex items-stretch gap-3 pr-8">
        <div className="flex w-16 shrink-0 flex-col">
          <div
            className={cn(
              'flex size-16 items-center justify-center overflow-hidden rounded-xl',
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
          {onUpdateQuantity ? (
            <div className="mt-auto flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="default"
                size="icon"
                className="size-7 bg-rose-500 hover:bg-rose-600"
                aria-label="Disminuir cantidad"
                onClick={() => adjustQuantity(-1)}
              >
                <Minus className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="size-7 bg-emerald-500 hover:bg-emerald-600"
                aria-label="Aumentar cantidad"
                onClick={() => adjustQuantity(1)}
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col space-y-1">
          <p className="line-clamp-2 text-sm leading-snug font-semibold">{line.name}</p>
          <p className="text-muted-foreground text-xs">Código: {line.code}</p>
          {line.canWholesale && line.onToggleWholesale ? (
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={Boolean(line.isWholesale)}
                onChange={(e) => line.onToggleWholesale?.(e.target.checked)}
              />
              Mayorista
              {line.isWholesale && line.wholesaleHint ? (
                <span className="text-muted-foreground">{line.wholesaleHint}</span>
              ) : null}
            </label>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {line.metaLabel ? <span>{line.metaLabel}</span> : null}
            {onUpdateQuantity ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <span>Cantidad:</span>
                  {usesMeasuredModal ? (
                    <button
                      type="button"
                      className={cn(
                        'border-input bg-background hover:bg-muted h-7 min-w-16 rounded-md border px-2',
                        'text-left text-xs font-medium tabular-nums transition-colors'
                      )}
                      onClick={() => onOpenMeasuredQtyModal?.(line)}
                      aria-label={`Editar cantidad o monto de ${line.name}`}
                      title="Cantidad o monto (kg/mts)"
                    >
                      {line.quantity}
                    </button>
                  ) : (
                    <Input
                      type="text"
                      inputMode={isIntegerUnit ? 'numeric' : 'decimal'}
                      aria-label={`Cantidad de ${line.name}`}
                      className={cn(
                        'h-7 px-2 text-xs tabular-nums',
                        isIntegerUnit ? 'w-12' : 'w-16'
                      )}
                      value={qtyDraft}
                      onFocus={(e) => {
                        setQtyFocused(true)
                        const current = String(line.quantity)
                        setQtyDraft(current)
                        e.target.select()
                      }}
                      onChange={(e) => {
                        setQtyDraft(sanitizeDecimalInput(e.target.value, decimals))
                      }}
                      onBlur={(e) => commitQuantity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                    />
                  )}
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
                      cartLineHasPriceAdjustment(line)
                        ? 'text-violet-700 hover:text-violet-800'
                        : 'text-muted-foreground'
                    )}
                    title="Precio, descuento o aumento"
                    aria-label="Precio, descuento o aumento"
                    onClick={() => onOpenPriceModal(line)}
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
                {line.onEditDetail ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'size-7',
                      line.detail?.trim() && 'text-sky-700 hover:text-sky-800'
                    )}
                    title="Editar servicio (cantidad, precio, detalle)"
                    onClick={line.onEditDetail}
                    aria-label="Editar servicio"
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
          {line.detail?.trim() ? (
            <p className="line-clamp-2 text-xs text-sky-800/90 whitespace-pre-line">
              {line.detail.trim()}
            </p>
          ) : null}
          <div className="mt-auto flex items-end justify-end gap-2 pt-1">
            <div className="flex min-w-0 flex-col items-end gap-0.5">
              {priceAdjustment === 'discount' ? (
                <p className="text-muted-foreground text-[11px] leading-none line-through">
                  {formatFromUsd(cartLineListPrice(line))} c/u
                </p>
              ) : priceAdjustment === 'markup' ? (
                <p className="text-muted-foreground text-[11px] leading-none">
                  Lista {formatFromUsd(cartLineListPrice(line))} c/u
                </p>
              ) : null}
              <p className="tabular-nums leading-none">
                <span className="text-sm font-bold">{formatFromUsd(cartLineSubtotal(line))}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
