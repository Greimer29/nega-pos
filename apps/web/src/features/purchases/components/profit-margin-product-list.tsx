import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import type { CatalogProduct } from '@/features/ventas/types'
import { cn } from '@/lib/utils'
import {
  calcProfitMarginPercent,
  calcSalePriceFromMargin,
  formatSignedProfitMarginPercent,
  profitMarginIsNegative,
} from '@/lib/profit-margin'

type PaginationMeta = {
  currentPage: number
  lastPage: number
}

type ProfitMarginProductListProps = {
  products: CatalogProduct[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  selectedIds: Set<number>
  onToggleProduct: (id: number) => void
  allVisibleSelected: boolean
  someVisibleSelected: boolean
  onToggleAllVisible: () => void
  meta?: PaginationMeta
  onPageChange: (page: number) => void
  scrollHeight?: number
  marginPercent?: number
  marginValid?: boolean
}

function hasCostPrice(product: CatalogProduct) {
  return product.cost_usd != null && Number(product.cost_usd) > 0
}

export function ProfitMarginProductList({
  products,
  isLoading,
  isError,
  errorMessage,
  selectedIds,
  onToggleProduct,
  allVisibleSelected,
  someVisibleSelected,
  onToggleAllVisible,
  meta,
  onPageChange,
  scrollHeight,
  marginPercent,
  marginValid = false,
}: ProfitMarginProductListProps) {
  const selectAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
    }
  }, [someVisibleSelected, allVisibleSelected])

  const tableContainerStyle =
    scrollHeight != null && scrollHeight > 0
      ? { height: scrollHeight, maxHeight: scrollHeight }
      : undefined

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="space-y-1 lg:hidden">
        <h4 className="text-sm font-medium">Productos</h4>
        <p className="text-muted-foreground text-xs">
          Marcá los productos a los que querés aplicar el margen de ganancia.
        </p>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-col overflow-hidden rounded-md border',
          scrollHeight == null && 'max-h-80'
        )}
        style={tableContainerStyle}
      >
        {isLoading ? (
          <div className="text-muted-foreground flex flex-1 items-center gap-2 p-4 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando productos…
          </div>
        ) : isError ? (
          <p className="text-destructive p-4 text-sm">{errorMessage}</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground flex flex-1 items-center p-4 text-sm">
            No hay productos que coincidan con los filtros.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Table containerClassName="overflow-visible" className="text-xs">
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      ref={selectAllRef}
                      checked={allVisibleSelected}
                      onChange={onToggleAllVisible}
                      aria-label="Seleccionar todos los productos visibles"
                    />
                  </TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Venta</TableHead>
                  <TableHead className="text-right">Ganancia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const canApply = hasCostPrice(product)
                  const isSelected = selectedIds.has(product.id)
                  const profitMargin = calcProfitMarginPercent(
                    product.sale_price_usd,
                    product.cost_usd
                  )
                  const projectedSale =
                    marginValid && marginPercent !== undefined && canApply
                      ? calcSalePriceFromMargin(product.cost_usd, marginPercent)
                      : null
                  const showProjected =
                    projectedSale !== null && isSelected && canApply

                  return (
                    <TableRow
                      key={product.id}
                      data-state={isSelected ? 'selected' : undefined}
                      className={cn(!canApply && 'opacity-60')}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => onToggleProduct(product.id)}
                          aria-label={`Seleccionar ${product.name}`}
                        />
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate">{product.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {canApply ? (
                          <DisplayMoneyFromUsd amountUsd={product.cost_usd} size="sm" />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="flex flex-col items-end gap-0.5">
                          <DisplayMoneyFromUsd amountUsd={product.sale_price_usd} size="sm" />
                          {showProjected && projectedSale !== null ? (
                            <span className="text-emerald-700 text-[10px] font-medium">
                              →{' '}
                              <DisplayMoneyFromUsd
                                amountUsd={projectedSale.toFixed(4)}
                                size="sm"
                                className="inline text-[10px] font-medium text-emerald-700 [&>span]:text-[10px] [&>span]:font-medium [&>span]:text-emerald-700"
                              />
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium tabular-nums',
                          profitMarginIsNegative(profitMargin) && 'text-destructive',
                          profitMargin !== null && profitMargin > 0 && 'text-emerald-700'
                        )}
                      >
                        {canApply ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{formatSignedProfitMarginPercent(profitMargin)}</span>
                            {showProjected && marginPercent !== undefined ? (
                              <span className="text-emerald-700 text-[10px]">
                                → {formatSignedProfitMarginPercent(marginPercent)}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {meta && meta.lastPage > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            Página {meta.currentPage} de {meta.lastPage}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.currentPage <= 1}
              onClick={() => onPageChange(Math.max(1, meta.currentPage - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.currentPage >= meta.lastPage}
              onClick={() => onPageChange(meta.currentPage + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
