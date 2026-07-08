import { Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { PublicImage } from '@/components/public-image'
import { catalogImageUrl, categoryLabel, productSaleUnitAbrev } from '@/features/ventas/constants'
import type { DailySoldProduct } from '@/features/dashboard/types'

type DailySoldProductCardProps = {
  product: DailySoldProduct
}

function PriceColumn({
  label,
  value,
  amountUsd,
}: {
  label: string
  value?: string | number | null
  amountUsd?: string | number | null
}) {
  return (
    <div className="min-w-[88px] space-y-0.5 text-right">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      {amountUsd !== undefined ? (
        <DisplayMoneyFromUsd amountUsd={amountUsd} size="sm" />
      ) : (
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      )}
    </div>
  )
}

export function DailySoldProductCard({ product }: DailySoldProductCardProps) {
  const hasImage = Boolean(product.image_path)
  const stock = Number(product.stock_quantity)

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:gap-4">
      <Link
        to={`/productos/${product.id}`}
        className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border transition-opacity hover:opacity-90"
        aria-label={`Ver ${product.name}`}
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
          <Package className="text-muted-foreground size-7" />
        )}
      </Link>

      <div className="min-w-0 flex-1 space-y-2">
        <Link to={`/productos/${product.id}`} className="min-w-0 space-y-1">
          <p className="truncate font-semibold hover:underline">{product.name}</p>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {catalogProductCode(product.id)}
          </p>
        </Link>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
            {categoryLabel(product.category)}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            Stock: {stock} {productSaleUnitAbrev(product.sale_unit)}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            Vendido: {product.quantity_sold} {productSaleUnitAbrev(product.sale_unit)}
          </span>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-4 sm:flex">
        <PriceColumn label="Precio venta" amountUsd={product.unit_price_usd} />
        <PriceColumn label="Total" amountUsd={product.total_usd} />
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-4 border-t pt-3 sm:hidden">
        <PriceColumn label="Precio venta" amountUsd={product.unit_price_usd} />
        <PriceColumn label="Total" amountUsd={product.total_usd} />
      </div>
    </div>
  )
}
