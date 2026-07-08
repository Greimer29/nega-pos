import { PublicImage } from '@/components/public-image'
import type { ProductSaleUnit } from '@/features/ventas/constants'
import type { BillingMethod } from '@/features/ventas/constants'
import type { ReactNode } from 'react'
import { LayoutGrid, Package, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DecimalInput } from '@/components/decimal-input'
import { DisplayMoney, DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useFormatMoney } from '@/features/currencies/context/display-currency-context'
import { VentasBillingMethodToggle } from '@/features/ventas/components/ventas-billing-method-toggle'
import { inventoryQuantityDecimals } from '@/lib/inventory-units'
import { cn } from '@/lib/utils'
import { parseDecimalInput } from '@/lib/numeric-input'

export type VentasCartLine = {
  key: string
  name: string
  code: string
  quantity: number
  unitPriceUsd: number
  saleUnit?: ProductSaleUnit
  imageUrl?: string | null
  imageTone?: 'orange' | 'violet' | 'amber' | 'sky'
  metaLabel?: string
}

type VentasOrderCartProps = {
  orderLabel: string
  lines: VentasCartLine[]
  subtotalUsd: number
  totalUsd: number
  totalBs?: number | null
  onClear: () => void
  onRemoveLine: (key: string) => void
  onUpdateQuantity?: (key: string, quantity: number) => void
  emptyMessage?: string
  children?: ReactNode
  className?: string
  headerAction?: ReactNode
  billingMethod?: BillingMethod
  onBillingMethodChange?: (method: BillingMethod) => void
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

function CartLineSubtotal({ line }: { line: VentasCartLine }) {
  const { formatFromUsd } = useFormatMoney()
  return <span className="text-sm font-bold">{formatFromUsd(lineSubtotal(line))}</span>
}

export function VentasOrderCart({
  orderLabel,
  lines,
  subtotalUsd,
  totalUsd,
  totalBs,
  onClear,
  onRemoveLine,
  onUpdateQuantity,
  emptyMessage = 'El carrito está vacío.',
  children,
  className,
  headerAction,
  billingMethod,
  onBillingMethodChange,
}: VentasOrderCartProps) {
  const { displayCurrency } = useFormatMoney()

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
                    ) : (
                      <span>Cantidad: {line.quantity}</span>
                    )}
                  </div>
                  <p className="pt-1 text-right tabular-nums">
                    <CartLineSubtotal line={line} />
                  </p>
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
