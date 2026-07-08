import { Package, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { PublicImage } from '@/components/public-image'
import { catalogImageUrl, productSaleUnitAbrev } from '@/features/ventas/constants'
import {
  CatalogCardActionButton,
  catalogImageTone,
  catalogProductCode,
} from '@/features/ventas/components/ventas-order-cart'
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

const IMAGE_TONE_CLASS = {
  orange: 'bg-orange-100',
  violet: 'bg-violet-100',
  amber: 'bg-amber-100',
  sky: 'bg-sky-100',
} as const

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
  const stock = Number(product.stock_quantity)
  const stockIsLow = isProductStockLow(product)
  const imageTone = catalogImageTone(product.id)

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-md',
        onOpen && 'cursor-pointer'
      )}
      onClick={onOpen ? () => onOpen(product) : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(product)
              }
            }
          : undefined
      }
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      {showActions && (onEdit || onDelete) ? (
        <div className="absolute top-2.5 right-2.5 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(product)
              }}
            >
              <Pencil className="size-3" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(product)
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'relative mb-2 flex aspect-[2/1] items-center justify-center overflow-hidden rounded-lg',
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

      <div className="flex flex-1 flex-col gap-1 px-0.5">
        <h3 className="line-clamp-2 min-h-[1.75rem] text-xs leading-snug font-semibold text-slate-800">
          {product.name}
        </h3>
        <div className="text-muted-foreground space-y-0.5 text-[11px] leading-tight">
          <p>Código: {catalogProductCode(product.id)}</p>
          <p>
            Disponible:{' '}
            <span className={cn(stockIsLow && 'font-medium text-destructive')}>
              {stock.toLocaleString('es-VE')}
            </span>{' '}
            {productSaleUnitAbrev(product.sale_unit ?? 'UND')}
          </p>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
            <span className="inline-flex items-baseline gap-1">
              <span>Costo</span>
              <DisplayMoneyFromUsd
                amountUsd={product.cost_usd}
                size="sm"
                className="text-[10px] font-normal [&>span]:text-[10px] [&>span]:font-normal"
              />
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span
              className={cn(
                'font-medium tabular-nums',
                profitMarginIsNegative(profitMargin) && 'text-destructive',
                profitMargin !== null && profitMargin > 0 && 'text-emerald-700'
              )}
            >
              {formatSignedProfitMarginPercent(profitMargin)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-1.5 px-0.5">
        <div className="min-w-0">
          {belowCost ? (
            <p className="mb-0.5 text-[10px] font-medium text-destructive">
              Venta por debajo del costo
            </p>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-1.5">
            <DisplayMoneyFromUsd
              amountUsd={product.sale_price_usd}
              size="sm"
              className={belowCost ? 'text-destructive font-semibold' : undefined}
            />
            {priceDropped ? (
              <p className="text-muted-foreground text-[11px] line-through">
                <DisplayMoneyFromUsd amountUsd={product.previous_sale_price_usd} size="sm" />
              </p>
            ) : null}
          </div>
        </div>
        {onAddToCart ? (
          <CatalogCardActionButton compact onClick={() => onAddToCart(product)} />
        ) : null}
      </div>
    </article>
  )
}

