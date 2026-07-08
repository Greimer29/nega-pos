import { ArrowLeft, Loader2, Pencil, Scale, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import { CatalogProductDeleteDialog } from '@/features/ventas/components/catalog-product-delete-dialog'
import { ProfitMarginLink } from '@/features/purchases/components/profit-margin-link'
import { ProductStockAdjustmentDialog } from '@/features/ventas/components/product-stock-adjustment-dialog'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { catalogImageUrl, categoryLabel, productSaleUnitLabel } from '@/features/ventas/constants'
import { PublicImage } from '@/components/public-image'
import { PRODUCT_MOVIMIENTO_LABELS } from '@/features/ventas/product-inventory-constants'
import { productSaleUnitAbrev } from '@/features/ventas/constants'
import { useCatalogProductQuery, useDeleteCatalogProductMutation } from '@/features/ventas/hooks/use-catalog'
import { getApiErrorMessage } from '@/lib/api-error'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import { isBelowCost } from '@/lib/cost-warnings'
import {
  calcProfitMarginPercent,
  formatProfitMarginPercent,
  profitMarginIsNegative,
} from '@/lib/profit-margin'
import { cn } from '@/lib/utils'

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { id: productId, isValid: isValidProductId } = parsePositiveIntRouteParam(id)
  const [ajusteOpen, setAjusteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteMutation = useDeleteCatalogProductMutation()
  const { data: product, isLoading, isError, error, refetch } = useCatalogProductQuery(productId)

  useEffect(() => {
    if (searchParams.get('edit') !== '1') {
      return
    }
    setEditOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  if (!isValidProductId) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-destructive text-sm">
          {detailPageErrorMessage({
            isValidId: false,
            isError: false,
            error: null,
            entityLabel: 'producto',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/productos">Volver al catálogo</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando producto…
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-destructive text-sm whitespace-pre-line">
          {detailPageErrorMessage({
            isValidId: true,
            isError,
            error,
            entityLabel: 'producto',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/productos">Volver al catálogo</Link>
        </Button>
      </div>
    )
  }

  const movimientos = product.movimientos ?? []
  const displayCategory = categoryLabel(product.category)
  const stock = Number(product.stock_quantity)
  const isFormulaStock = product.stock_source === 'formula' || Boolean(product.formula_id)
  const saleBelowCost = isBelowCost(product.sale_price_usd, product.cost_usd)
  const profitMargin = calcProfitMarginPercent(product.sale_price_usd, product.cost_usd)

  async function confirmDelete() {
    if (!product) return
    setDeleteError(null)
    try {
      const result = await deleteMutation.mutateAsync(productId)
      setDeleteOpen(false)
      if (result.modo === 'soft') {
        void navigate('/productos', {
          state: { message: `"${product.name}" fue desactivado (tiene ventas registradas).` },
        })
      } else {
        void navigate('/productos')
      }
    } catch (err) {
      setDeleteError(getApiErrorMessage(err))
      setDeleteOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/productos">
              <ArrowLeft />
              Productos
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {catalogProductCode(product.id)} — {product.name}
          </h1>
          <p className="text-muted-foreground text-sm">{displayCategory}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ProfitMarginLink productId={product.id} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditOpen(true)}
            title="Editar producto"
            aria-label="Editar producto"
          >
            <Pencil className="size-4" />
          </Button>
          {isFormulaStock ? null : (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAjusteOpen(true)}
              title="Ajuste de inventario"
              aria-label="Ajuste de inventario"
            >
              <Scale className="size-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            title="Eliminar producto"
            aria-label="Eliminar producto"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.image_path ? (
              <PublicImage
                src={catalogImageUrl(product.id)}
                alt={product.name}
                className="aspect-square w-full rounded-lg border object-cover"
              />
            ) : null}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Unidad de venta</dt>
                <dd>{productSaleUnitLabel(product.sale_unit ?? 'UND')}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Stock disponible</dt>
                <dd className="font-semibold tabular-nums">
                  {stock.toLocaleString('es-VE')}{' '}
                  {productSaleUnitLabel(product.sale_unit ?? 'UND').toLowerCase()}
                </dd>
              </div>
              {isFormulaStock ? (
                <p className="text-muted-foreground text-xs">
                  Calculado según los materiales de la fórmula.
                </p>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Costo</dt>
                <dd>
                  <DisplayMoneyFromUsd amountUsd={product.cost_usd} size="sm" />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Precio venta</dt>
                <dd className={cn(saleBelowCost && 'text-destructive font-semibold')}>
                  <DisplayMoneyFromUsd
                    amountUsd={product.sale_price_usd}
                    size="sm"
                    className={saleBelowCost ? 'text-destructive' : undefined}
                  />
                </dd>
              </div>
              {saleBelowCost ? (
                <p className="text-destructive text-xs">Vendés por debajo del costo.</p>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Ganancia</dt>
                <dd
                  className={cn(
                    'font-semibold tabular-nums',
                    profitMarginIsNegative(profitMargin) && 'text-destructive',
                    profitMargin !== null && profitMargin > 0 && 'text-emerald-700'
                  )}
                >
                  {formatProfitMarginPercent(profitMargin)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Fórmula</dt>
                <dd>{product.formula?.name ?? 'Sin fórmula (producto terminado)'}</dd>
              </div>
            </dl>
            {product.description ? (
              <p className="text-muted-foreground text-sm">{product.description}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Movimientos de inventario</CardTitle>
            <CardDescription>
              {isFormulaStock
                ? 'El stock se deriva de los materiales; no hay movimientos directos del producto.'
                : 'Compras, ventas y ajustes manuales del producto terminado.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movimientos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin movimientos todavía.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b text-left">
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Cantidad</th>
                      <th className="px-4 py-3 font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((mov) => (
                      <tr key={mov.id} className="border-b last:border-b-0">
                        <td className="text-muted-foreground px-4 py-3">
                          {formatFechaHora(mov.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {PRODUCT_MOVIMIENTO_LABELS[mov.type] ?? mov.type}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 font-medium tabular-nums',
                            Number(mov.quantity) > 0 ? 'text-emerald-700' : 'text-red-600'
                          )}
                        >
                        {Number(mov.quantity) > 0 ? '+' : ''}
                        {mov.quantity}{' '}
                        {productSaleUnitAbrev(product.sale_unit ?? 'UND')}
                        </td>
                        <td className="text-muted-foreground px-4 py-3">{mov.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isFormulaStock ? null : (
        <ProductStockAdjustmentDialog
          open={ajusteOpen}
          onOpenChange={setAjusteOpen}
          product={product}
          onSuccess={() => void refetch()}
        />
      )}

      <CatalogFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
        onSaved={() => void refetch()}
      />

      <CatalogProductDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        product={product}
        isPending={deleteMutation.isPending}
        onConfirm={() => void confirmDelete()}
      />

      {deleteError ? <p className="text-destructive text-sm whitespace-pre-line">{deleteError}</p> : null}
    </div>
  )
}
