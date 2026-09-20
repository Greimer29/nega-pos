import { Package, Pencil, Trash2 } from 'lucide-react'
import { PublicImage } from '@/components/public-image'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
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
import { formatInventoryQuantity } from '@/lib/inventory-units'
import { cn } from '@/lib/utils'

type MaterialCatalogTableProps = {
  materials: Material[]
  onEdit?: (material: Material) => void
  onDelete?: (material: Material) => void
  onAddToCart?: (material: Material) => void
  onOpen?: (material: Material) => void
}

const IMAGE_TONE_CLASS = {
  orange: 'bg-orange-100',
  violet: 'bg-violet-100',
  amber: 'bg-amber-100',
  sky: 'bg-sky-100',
} as const

export function MaterialCatalogTable({
  materials,
  onEdit,
  onDelete,
  onAddToCart,
  onOpen,
}: MaterialCatalogTableProps) {
  const showAdminActions = Boolean(onEdit || onDelete)
  const isClickable = Boolean(onOpen || onAddToCart)

  function activate(material: Material) {
    if (onOpen) {
      onOpen(material)
      return
    }
    onAddToCart?.(material)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[1%] px-[10px]">Material</TableHead>
          <TableHead className="w-full min-w-0">Descripción</TableHead>
          <TableHead className="w-[1%] px-[10px] text-right">Existencia</TableHead>
          <TableHead className="w-[1%] text-right">Precio venta</TableHead>
          {showAdminActions || onAddToCart ? <TableHead className="w-16" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {materials.map((material) => {
          const hasImage = Boolean(material.imagePath)
          const imageTone = catalogImageTone(material.id)
          const { disponible } = materialStockDisponible(material)
          const minStock = Number(material.minimumStock)
          const stockIsLow = disponible <= 0 || (minStock > 0 && disponible < minStock)
          const unit = UNIT_ABREV[material.unit] ?? material.unit

          return (
            <TableRow
              key={material.id}
              className={cn(isClickable && 'cursor-pointer')}
              onClick={isClickable ? () => activate(material) : undefined}
            >
              <TableCell className="w-[1%] whitespace-normal px-[10px] py-[6px]">
                <div className="flex w-max min-w-11 flex-col items-start gap-1">
                  <span
                    className={cn(
                      'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md',
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
                      <Package className="text-muted-foreground/60 size-5" />
                    )}
                  </span>
                  <div className="text-left font-mono text-[11px] leading-tight whitespace-nowrap">
                    <p className="text-foreground">{material.code}</p>
                    {material.supplierCode ? (
                      <p className="text-muted-foreground">{material.supplierCode}</p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell className="w-full min-w-0 whitespace-normal">
                <p className="line-clamp-2 font-medium text-slate-800">{material.name}</p>
                {material.description ? (
                  <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px]">
                    {material.description}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                  <DisplayMoneyFromUsd
                    amountUsd={material.lastPurchasePriceUsd}
                    size="sm"
                    className="text-[11px] font-medium text-slate-800"
                  />
                  {' · '}
                  Min. {formatInventoryQuantity(material.minimumStock, material.unit)} {unit}
                </p>
              </TableCell>
              <TableCell className="w-[1%] px-[10px] py-[6px] text-right tabular-nums">
                <span className={cn(stockIsLow && 'font-medium text-destructive')}>
                  {formatInventoryQuantity(disponible, material.unit)} {unit}
                </span>
              </TableCell>
              <TableCell className="w-[1%] text-right">
                <DisplayMoneyFromUsd
                  amountUsd={materialSaleUnitPriceUsd(material)}
                  size="sm"
                  className="font-semibold"
                />
              </TableCell>
              {showAdminActions || onAddToCart ? (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-0.5">
                    {onAddToCart ? (
                      <span onClick={(event) => event.stopPropagation()}>
                        <CatalogCardActionButton
                          compact
                          onClick={() => onAddToCart(material)}
                        />
                      </span>
                    ) : null}
                    {onEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Editar"
                        aria-label={`Editar ${material.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onEdit(material)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                    {onDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive size-7"
                        title="Eliminar"
                        aria-label={`Eliminar ${material.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onDelete(material)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
