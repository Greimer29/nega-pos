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
  CatalogCardActionButton,
  catalogImageTone,
  catalogProductCode,
} from '@/features/ventas/components/ventas-order-cart'
import { catalogImageUrl, productSaleUnitAbrev } from '@/features/ventas/constants'
import type { CatalogProduct } from '@/features/ventas/types'
import { isProductStockLow } from '@/features/ventas/utils/product-stock'
import { formatInventoryQuantity } from '@/lib/inventory-units'
import { cn } from '@/lib/utils'

type CatalogProductTableProps = {
  products: CatalogProduct[]
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

export function CatalogProductTable({
  products,
  onEdit,
  onDelete,
  onAddToCart,
  onOpen,
  showActions = false,
}: CatalogProductTableProps) {
  const showAdminActions = showActions && (onEdit || onDelete)
  const isClickable = Boolean(onOpen || onAddToCart)

  function activate(product: CatalogProduct) {
    if (onOpen) {
      onOpen(product)
      return
    }
    onAddToCart?.(product)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[1%] px-[10px]">Producto</TableHead>
          <TableHead className="w-full min-w-0">Descripción</TableHead>
          <TableHead className="w-[1%] px-[10px] text-right">Existencia</TableHead>
          <TableHead className="w-[1%] text-right">Precio venta</TableHead>
          {showAdminActions || onAddToCart ? <TableHead className="w-16" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const isService = product.item_kind === 'SERVICE' || product.is_service
          const hasImage = Boolean(product.image_path)
          const imageTone = catalogImageTone(product.id)
          const unit = product.sale_unit ?? 'UND'
          const stockIsLow = isProductStockLow(product)

          return (
            <TableRow
              key={product.id}
              className={cn(isClickable && 'cursor-pointer')}
              onClick={isClickable ? () => activate(product) : undefined}
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
                        src={catalogImageUrl(product.id)}
                        alt={product.name}
                        className="size-full object-cover"
                        showFallbackIcon
                        fallbackClassName="size-full"
                      />
                    ) : (
                      <Package className="text-muted-foreground/60 size-5" />
                    )}
                  </span>
                  <div className="text-left font-mono text-[11px] leading-tight whitespace-nowrap">
                    <p className="text-foreground">{catalogProductCode(product.id)}</p>
                    {product.supplier_code ? (
                      <p className="text-muted-foreground">{product.supplier_code}</p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell className="w-full min-w-0 whitespace-normal">
                <p className="line-clamp-2 font-medium text-slate-800">{product.name}</p>
                {product.description ? (
                  <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px]">
                    {product.description}
                  </p>
                ) : null}
                {isService ? null : (
                  <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                    <DisplayMoneyFromUsd
                      amountUsd={product.cost_usd}
                      size="sm"
                      className="text-[11px] font-medium text-slate-800"
                    />
                    {' · '}
                    Min. {formatInventoryQuantity(product.minimum_stock ?? 0, unit)}{' '}
                    {productSaleUnitAbrev(unit)}
                  </p>
                )}
              </TableCell>
              <TableCell className="w-[1%] px-[10px] py-[6px] text-right tabular-nums">
                {isService ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className={cn(stockIsLow && 'font-medium text-destructive')}>
                    {formatInventoryQuantity(product.stock_quantity, unit)}{' '}
                    {productSaleUnitAbrev(unit)}
                  </span>
                )}
              </TableCell>
              <TableCell className="w-[1%] text-right">
                <DisplayMoneyFromUsd
                  amountUsd={product.sale_price_usd}
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
                          onClick={() => onAddToCart(product)}
                        />
                      </span>
                    ) : null}
                    {showAdminActions && onEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Editar"
                        aria-label={`Editar ${product.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onEdit(product)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                    {showAdminActions && onDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive size-7"
                        title="Eliminar"
                        aria-label={`Eliminar ${product.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          onDelete(product)
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
