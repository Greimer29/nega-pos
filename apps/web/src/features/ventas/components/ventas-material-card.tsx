import { Package } from 'lucide-react'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { PublicImage } from '@/components/public-image'
import {
  UNIT_ABREV,
  materialImageUrl,
  materialStockDisponible,
} from '@/features/materials/constants'
import type { Material } from '@/features/materials/types'
import {
  CatalogCardActionButton,
  catalogImageTone,
} from '@/features/ventas/components/ventas-order-cart'
import { materialSaleUnitPriceUsd } from '@/features/ventas/utils/material-sale-price'
import { cn } from '@/lib/utils'
import { isBelowCost } from '@/lib/cost-warnings'

type VentasMaterialCardProps = {
  material: Material
  onAddToCart: (material: Material) => void
}

const IMAGE_TONE_CLASS = {
  orange: 'bg-orange-100',
  violet: 'bg-violet-100',
  amber: 'bg-amber-100',
  sky: 'bg-sky-100',
} as const

export function VentasMaterialCard({ material, onAddToCart }: VentasMaterialCardProps) {
  const hasImage = Boolean(material.imagePath)
  const { disponible } = materialStockDisponible(material)
  const salePrice = materialSaleUnitPriceUsd(material)
  const cost = material.lastPurchasePriceUsd
  const belowCost = isBelowCost(String(salePrice), cost ?? 0)
  const stockIsLow =
    disponible <= 0 ||
    (Number(material.minimumStock) > 0 && disponible < Number(material.minimumStock))
  const imageTone = catalogImageTone(material.id)

  return (
    <article className="group relative flex h-full min-w-0 w-full flex-col overflow-hidden rounded-xl border bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-md">
      <div
        className={cn(
          'relative mb-2 flex aspect-[2/1] items-center justify-center overflow-hidden rounded-lg',
          hasImage ? 'bg-muted' : IMAGE_TONE_CLASS[imageTone ?? 'violet']
        )}
      >
        {hasImage ? (
          <PublicImage
            src={materialImageUrl(material.id)}
            alt={material.name}
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
          {material.name}
        </h3>
        <div className="text-muted-foreground space-y-0.5 text-[11px] leading-tight">
          <p>Código: {material.code}</p>
          <p>
            Disponible:{' '}
            <span className={cn(stockIsLow && 'font-medium text-destructive')}>
              {disponible.toLocaleString('es-VE')}
            </span>{' '}
            {UNIT_ABREV[material.unit] ?? material.unit}
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
          <DisplayMoneyFromUsd
            amountUsd={salePrice}
            size="sm"
            className={belowCost ? 'text-destructive font-semibold' : undefined}
          />
        </div>
        <CatalogCardActionButton compact onClick={() => onAddToCart(material)} />
      </div>
    </article>
  )
}
