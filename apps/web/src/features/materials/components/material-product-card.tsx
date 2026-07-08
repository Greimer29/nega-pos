import { Package, Pencil, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { PublicImage } from '@/components/public-image'
import {
  CATEGORIA_LABELS,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUS_STYLES,
  UNIT_ABREV,
  deriveMaterialStatus,
  materialImageUrl,
  materialStockDisponible,
} from '@/features/materials/constants'
import type { Material } from '@/features/materials/types'
import { cn } from '@/lib/utils'

type MaterialProductCardProps = {
  material: Material
  onEdit: (material: Material) => void
  onDelete: (material: Material) => void
  onOpen?: (material: Material) => void
}

function PriceColumn({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="min-w-[120px] space-y-0.5 text-right">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <DisplayMoneyFromUsd amountUsd={value} size="sm" />
    </div>
  )
}

export function MaterialProductCard({
  material,
  onEdit,
  onDelete,
  onOpen,
}: MaterialProductCardProps) {
  const status = deriveMaterialStatus(material)
  const { stock, comprometido, disponible } = materialStockDisponible(material)
  const minStock = Number(material.minimumStock)
  const isLow = status === 'active' && disponible > 0 && disponible < minStock
  const hasImage = Boolean(material.imagePath)
  const rating = material.rating ?? 0

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <button
        type="button"
        className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border transition-opacity hover:opacity-90"
        onClick={() => onOpen?.(material)}
        aria-label={`Ver ${material.name}`}
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
          <Package className="text-muted-foreground size-7" />
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-2">
        <button
          type="button"
          className="min-w-0 space-y-1 text-left"
          onClick={() => onOpen?.(material)}
        >
          <p className="truncate font-semibold hover:underline">{material.name}</p>
          <p className="text-muted-foreground truncate font-mono text-xs">{material.code}</p>
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
            {CATEGORIA_LABELS[material.category]}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              MATERIAL_STATUS_STYLES[status]
            )}
          >
            {MATERIAL_STATUS_LABELS[status]}
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {comprometido > 0 ? (
              <>
                Stock: {stock} {UNIT_ABREV[material.unit]} · Comprometido: {comprometido}{' '}
                {UNIT_ABREV[material.unit]} · Disponible: {disponible}{' '}
                {UNIT_ABREV[material.unit]}
              </>
            ) : (
              <>
                Stock: {stock} {UNIT_ABREV[material.unit]}
              </>
            )}
          </span>
          {isLow ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
              Bajo
            </span>
          ) : null}
          {rating > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
              <Star className="size-3 fill-current" />
              {rating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex h-5 shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Editar"
            aria-label={`Editar ${material.name}`}
            className="h-5 w-5 gap-0.5"
            onClick={() => onEdit(material)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar"
            aria-label={`Eliminar ${material.name}`}
            className="h-5 w-5 gap-0.5 text-destructive hover:text-destructive"
            onClick={() => onDelete(material)}
          >
            <Trash2 />
          </Button>
        </div>
        <div className="hidden shrink-0 items-center gap-6 sm:flex">
          <PriceColumn label="Precio costo" value={material.lastPurchasePriceUsd} />
        </div>
      </div>
    </div>
  )
}

