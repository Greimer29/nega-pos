import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, DollarSign, Package, Pencil, Tag, Trash2, TrendingUp } from 'lucide-react'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { PublicImage } from '@/components/public-image'
import { catalogImageUrl } from '@/features/ventas/constants'
import { catalogImageTone, catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import type { CatalogProduct } from '@/features/ventas/types'
import { cn } from '@/lib/utils'
import { isBelowCost } from '@/lib/cost-warnings'
import { isProductStockLow } from '@/features/ventas/utils/product-stock'
import {
  calcProfitMarginPercent,
  formatSignedProfitMarginPercent,
  profitMarginIsNegative,
} from '@/lib/profit-margin'

type CatalogProductCardProps = {
  product: CatalogProduct
  onEdit?: (product: CatalogProduct) => void
  onDelete?: (product: CatalogProduct) => void
  onAddToCart?: (product: CatalogProduct) => void
  onOpen?: (product: CatalogProduct) => void
  showActions?: boolean
}

export const catalogProductGridClassName =
  'grid w-full min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-2 sm:gap-3'

const IMAGE_TONE_CLASS = {
  orange: 'bg-orange-100',
  violet: 'bg-violet-100',
  amber: 'bg-amber-100',
  sky: 'bg-sky-100',
} as const

const ICON_SIZE = 'size-[clamp(0.65rem,4cqi,0.9rem)]'
const LABEL_SIZE = 'text-[length:clamp(0.5625rem,2.6cqi,0.6875rem)]'
const VALUE_SIZE = 'text-[length:clamp(0.7rem,3.6cqi,0.875rem)]'
const PRICE_SIZE = 'text-[length:clamp(0.85rem,4.6cqi,1.05rem)]'

function formatCatalogQty(value: string | number) {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    return '0'
  }
  return n.toLocaleString('es-VE', { maximumFractionDigits: 3 })
}

export function CatalogProductCard({
  product,
  onEdit,
  onDelete,
  onAddToCart,
  onOpen,
  showActions = false,
}: CatalogProductCardProps) {
  const hasImage = Boolean(product.image_path)
  const priceDropped =
    product.previous_sale_price_usd &&
    Number(product.sale_price_usd) < Number(product.previous_sale_price_usd)
  const belowCost = isBelowCost(product.sale_price_usd, product.cost_usd)
  const profitMargin = calcProfitMarginPercent(product.sale_price_usd, product.cost_usd)
  const marginNegative = profitMarginIsNegative(profitMargin)
  const marginPositive = profitMargin !== null && profitMargin > 0
  const stock = Number(product.stock_quantity)
  const stockIsLow = isProductStockLow(product)
  const imageTone = catalogImageTone(product.id)
  const isClickable = Boolean(onOpen || onAddToCart)

  function handleActivate() {
    if (onOpen) {
      onOpen(product)
      return
    }
    onAddToCart?.(product)
  }

  return (
    <article
      className={cn(
        '@container group relative flex h-full min-w-0 w-full flex-col rounded-xl border bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-md',
        isClickable && 'cursor-pointer'
      )}
      onClick={isClickable ? handleActivate : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.currentTarget !== event.target) {
                return
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleActivate()
              }
            }
          : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={
        isClickable
          ? onOpen
            ? `Ver ${product.name}`
            : `Agregar ${product.name} al carrito`
          : undefined
      }
    >
      <div className="relative mb-2">
        <div
          className={cn(
            'flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg',
            hasImage ? 'bg-muted' : IMAGE_TONE_CLASS[imageTone ?? 'violet']
          )}
        >
          {hasImage ? (
            <PublicImage
              src={catalogImageUrl(product.id)}
              alt={product.name}
              className="size-full object-cover"
              showFallbackIcon
              fallbackClassName="size-full"
            />
          ) : (
            <Package className="text-muted-foreground/60 size-7" />
          )}
        </div>

        {showActions && (onEdit || onDelete) ? (
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            {onEdit ? (
              <button
                type="button"
                aria-label={`Editar ${product.name}`}
                className="flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-900 shadow-none"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(product)
                }}
              >
                <Pencil className="size-3.5" strokeWidth={1.75} />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                aria-label={`Eliminar ${product.name}`}
                className="flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-900 shadow-none"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(product)
                }}
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            ) : null}
          </div>
        ) : null}

        <CatalogStockBadge product={product} stock={stock} stockIsLow={stockIsLow} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-0.5 pb-1.5">
        <h3 className="line-clamp-2 min-h-[2.5em] text-xs leading-snug font-semibold text-slate-800">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-[11px] leading-tight">{catalogProductCode(product.id)}</p>
      </div>

      <div className="mt-auto border-t border-slate-100 px-0.5 pt-1.5">
        <div className="grid grid-cols-2 gap-1.5 border-b border-slate-100 pb-1.5">
          <MetricCell
            label="Costo"
            iconClassName="bg-violet-100 text-violet-600"
            icon={<DollarSign className={ICON_SIZE} />}
          >
            <DisplayMoneyFromUsd
              amountUsd={product.cost_usd}
              size="sm"
              className={cn(VALUE_SIZE, 'font-bold text-slate-900')}
            />
          </MetricCell>

          <MetricCell
            label="Margen"
            iconClassName={
              marginNegative
                ? 'bg-red-100 text-red-600'
                : 'bg-emerald-100 text-emerald-700'
            }
            icon={<TrendingUp className={ICON_SIZE} />}
          >
            <span
              title={formatSignedProfitMarginPercent(profitMargin)}
              className={cn(
                VALUE_SIZE,
                'block truncate font-bold tabular-nums',
                marginNegative && 'text-red-700',
                marginPositive && 'text-emerald-700',
                !marginNegative && !marginPositive && 'text-slate-900'
              )}
            >
              {formatSignedProfitMarginPercent(profitMargin)}
            </span>
          </MetricCell>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1.5">
          <div className="flex min-w-0 items-center gap-[clamp(0.3rem,2cqi,0.5rem)]">
            <span className="flex size-[clamp(1.3rem,8cqi,1.85rem)] shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Tag className={ICON_SIZE} />
            </span>
            <span className={cn(LABEL_SIZE, 'text-muted-foreground')}>Precio</span>
          </div>
          <div className="flex min-w-0 items-baseline justify-end gap-1.5">
            {priceDropped ? (
              <span className="text-muted-foreground min-w-0 truncate text-[length:clamp(0.6rem,3cqi,0.75rem)] line-through">
                <DisplayMoneyFromUsd
                  amountUsd={product.previous_sale_price_usd}
                  size="sm"
                  className="text-[length:clamp(0.6rem,3cqi,0.75rem)] font-normal text-inherit"
                />
              </span>
            ) : null}
            <DisplayMoneyFromUsd
              amountUsd={product.sale_price_usd}
              size="sm"
              className={cn(
                PRICE_SIZE,
                'font-bold leading-none',
                belowCost ? 'text-destructive' : 'text-slate-900'
              )}
            />
          </div>
        </div>

        {belowCost ? (
          <p className="text-destructive mt-1 text-[length:clamp(0.5625rem,2.6cqi,0.6875rem)] font-medium">
            Venta por debajo del costo
          </p>
        ) : null}
      </div>
    </article>
  )
}

function MetricCell({
  label,
  icon,
  iconClassName,
  children,
}: {
  label: string
  icon: ReactNode
  iconClassName: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-[clamp(0.3rem,2cqi,0.5rem)]">
      <span
        className={cn(
          'flex size-[clamp(1.3rem,8cqi,1.85rem)] shrink-0 items-center justify-center rounded-lg',
          iconClassName
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className={cn(LABEL_SIZE, 'text-muted-foreground leading-tight')}>{label}</p>
        <div className="min-w-0 truncate leading-tight">{children}</div>
      </div>
    </div>
  )
}

function CatalogStockBadge({
  product,
  stock,
  stockIsLow,
}: {
  product: CatalogProduct
  stock: number
  stockIsLow: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()
  const sizes = product.sizes ?? []
  const hasSizes = sizes.length > 0
  const outOfStock = stock <= 0
  const alert = outOfStock || stockIsLow
  const label = outOfStock ? 'Sin stock' : `${formatCatalogQty(stock)} disponibles`

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const badgeClassName = cn(
    'inline-flex max-w-[calc(100%-0.5rem)] items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none font-medium',
    alert
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  )

  const content = (
    <>
      <span
        className={cn('size-1.5 shrink-0 rounded-full', alert ? 'bg-red-500' : 'bg-emerald-500')}
        aria-hidden
      />
      <span className="truncate">{label}</span>
      {hasSizes ? (
        <ChevronDown
          className={cn('size-2.5 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      ) : null}
    </>
  )

  if (!hasSizes) {
    return (
      <span className={cn(badgeClassName, 'absolute top-1.5 right-1.5 z-10')} aria-label={`Stock: ${label}`}>
        {content}
      </span>
    )
  }

  return (
    <div ref={rootRef} className="absolute top-1.5 right-1.5 z-20">
      <button
        type="button"
        className={badgeClassName}
        aria-label={`Stock: ${label}. Ver stock por talla`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
      >
        {content}
      </button>
      {open ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label={`Stock por talla de ${product.name}`}
          className="animate-in fade-in-0 zoom-in-95 absolute top-[calc(100%+4px)] right-0 origin-top-right rounded-lg border border-slate-200 bg-white p-2 shadow-lg duration-150"
          onClick={(event) => event.stopPropagation()}
        >
          <ul className="min-w-[8.5rem] space-y-1">
            {sizes.map((size) => (
              <li
                key={size.id}
                className="text-muted-foreground flex items-center justify-between gap-3 text-[11px]"
              >
                <span className="font-medium text-slate-800">{size.size}</span>
                <span className="tabular-nums">{formatCatalogQty(size.stock_quantity)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
