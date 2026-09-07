import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CatalogProductSearchPicker } from '@/components/search-picker/catalog-product-search-picker'
import { DecimalInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { notifyApiError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { useBulkAjusteStockProductoMutation } from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { productHasSizes } from '@/features/ventas/utils/product-sizes'
import {
  INVENTORY_ADJUSTMENT_MODE_DESCRIPTIONS,
  INVENTORY_ADJUSTMENT_MODE_LABELS,
  INVENTORY_ADJUSTMENT_MODES,
  inventoryAdjustmentQuantityLabel,
  inventoryAdjustmentSubmitLabel,
  type InventoryAdjustmentMode,
} from '@/lib/inventory-adjustment'
import {
  formatInventoryQuantity,
  inventoryQuantityDecimals,
  inventoryQuantityMinPositive,
  normalizeInventoryQuantity,
} from '@/lib/inventory-units'
import { parseDecimalInput } from '@/lib/numeric-input'
import { cn } from '@/lib/utils'

type BulkLine = {
  key: string
  product: CatalogProduct
  sizeId: number | null
  sizeLabel: string | null
  quantity: string
}

function lineKey(productId: number, sizeId: number | null) {
  return `${productId}:${sizeId ?? 'nosize'}`
}

function currentStockForLine(line: BulkLine) {
  if (line.sizeId != null) {
    const size = line.product.sizes?.find((item) => item.id === line.sizeId)
    return Number(size?.stock_quantity ?? 0)
  }
  return Number(line.product.stock_quantity)
}

export function ProductInventoryBulkAdjustmentPage() {
  const navigate = useNavigate()
  const mutation = useBulkAjusteStockProductoMutation()
  const [mode, setMode] = useState<InventoryAdjustmentMode>('DESCARGO')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<BulkLine[]>([])
  const [pendingSizeProduct, setPendingSizeProduct] = useState<CatalogProduct | null>(null)
  const [error, setError] = useState<string | null>(null)

  const excludeIds = useMemo(() => {
    const ids = new Set<number>()
    for (const line of lines) {
      if (!productHasSizes(line.product)) {
        ids.add(line.product.id)
      }
    }
    return [...ids]
  }, [lines])

  function addProduct(product: CatalogProduct) {
    setError(null)

    if (product.formula_id) {
      toast.warning(
        `"${product.name}" usa fórmula: el stock se calcula por materiales, no se ajusta a mano.`,
        'Producto con fórmula'
      )
      return
    }

    if (productHasSizes(product)) {
      const available = (product.sizes ?? []).filter(
        (size) => !lines.some((line) => line.key === lineKey(product.id, size.id))
      )
      if (available.length === 0) {
        toast.warning('Ya agregaste todas las tallas de este producto.', 'Sin tallas libres')
        return
      }
      setPendingSizeProduct(product)
      return
    }

    const key = lineKey(product.id, null)
    if (lines.some((line) => line.key === key)) {
      toast.warning('Ese producto ya está en la lista.', 'Duplicado')
      return
    }

    setLines((prev) => [
      ...prev,
      {
        key,
        product,
        sizeId: null,
        sizeLabel: null,
        quantity: mode === 'AJUSTE' ? String(Number(product.stock_quantity) || 0) : '',
      },
    ])
  }

  function addSizedProduct(product: CatalogProduct, sizeId: number) {
    const size = product.sizes?.find((item) => item.id === sizeId)
    if (!size) return

    const key = lineKey(product.id, sizeId)
    if (lines.some((line) => line.key === key)) {
      toast.warning('Esa talla ya está en la lista.', 'Duplicado')
      return
    }

    setLines((prev) => [
      ...prev,
      {
        key,
        product,
        sizeId,
        sizeLabel: size.size,
        quantity: mode === 'AJUSTE' ? String(Number(size.stock_quantity) || 0) : '',
      },
    ])
    setPendingSizeProduct(null)
  }

  function updateQuantity(key: string, raw: string) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, quantity: raw } : line)))
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((line) => line.key !== key))
  }

  async function handleSubmit() {
    setError(null)

    if (lines.length === 0) {
      setError('Agregá al menos un producto.')
      return
    }

    const items: Array<{
      catalog_product_id: number
      catalog_product_size_id?: number | null
      quantity: number
    }> = []

    for (const line of lines) {
      const unit = line.product.sale_unit ?? 'UND'
      const decimals = inventoryQuantityDecimals(unit)
      const parsed = parseDecimalInput(line.quantity, decimals)
      if (parsed === null) {
        setError(`Indicá la cantidad de «${line.product.name}».`)
        return
      }

      const quantity = normalizeInventoryQuantity(parsed, unit)
      if (mode !== 'AJUSTE' && quantity < inventoryQuantityMinPositive(unit)) {
        setError(`La cantidad de «${line.product.name}» debe ser mayor a cero.`)
        return
      }
      if (mode === 'AJUSTE' && quantity < 0) {
        setError(`El stock de «${line.product.name}» no puede ser negativo.`)
        return
      }

      items.push({
        catalog_product_id: line.product.id,
        catalog_product_size_id: line.sizeId,
        quantity,
      })
    }

    try {
      const result = await mutation.mutateAsync({
        mode,
        note: note.trim() || undefined,
        items,
      })
      toast.success(
        `Se registraron ${result.count} movimiento${result.count === 1 ? '' : 's'}.`,
        inventoryAdjustmentSubmitLabel(mode)
      )
      void navigate('/productos')
    } catch (submitError) {
      notifyApiError(submitError)
      setError('No se pudo registrar el movimiento. Revisá las cantidades y el stock disponible.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-start gap-3">
        <Button type="button" variant="outline" size="icon" asChild className="mt-0.5 shrink-0">
          <Link to="/productos" aria-label="Volver a productos">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Movimiento de inventario</h1>
          <p className="text-muted-foreground text-sm">
            Registrá un cargo, descargo o ajuste sobre varios productos a la vez.
          </p>
        </div>
      </div>

      <PermissionGate
        permission="catalog.edit"
        fallback={
          <Card>
            <CardContent className="text-muted-foreground py-10 text-sm">
              No tenés permiso para editar el catálogo.
            </CardContent>
          </Card>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo de movimiento</CardTitle>
            <CardDescription>{INVENTORY_ADJUSTMENT_MODE_DESCRIPTIONS[mode]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-2">
              {INVENTORY_ADJUSTMENT_MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={cn(
                    'rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                    mode === option
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:text-foreground'
                  )}
                >
                  {INVENTORY_ADJUSTMENT_MODE_LABELS[option]}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-note">Nota (opcional)</Label>
              <Textarea
                id="bulk-note"
                rows={2}
                placeholder="Motivo del movimiento…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Productos</Label>
              <CatalogProductSearchPicker
                variant="dropdown"
                keepOpenOnSelect
                clearOnSelect
                excludeIds={excludeIds}
                onSelect={addProduct}
                label=""
                placeholder="Buscar y agregar producto…"
              />

              {pendingSizeProduct ? (
                <div className="rounded-lg border border-dashed p-3">
                  <p className="mb-2 text-sm font-medium">
                    Elegí la talla de {pendingSizeProduct.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(pendingSizeProduct.sizes ?? [])
                      .filter(
                        (size) =>
                          !lines.some(
                            (line) => line.key === lineKey(pendingSizeProduct.id, size.id)
                          )
                      )
                      .map((size) => (
                        <Button
                          key={size.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addSizedProduct(pendingSizeProduct, size.id)}
                        >
                          {size.size}
                          <span className="text-muted-foreground ml-1 text-xs tabular-nums">
                            ({formatInventoryQuantity(size.stock_quantity, pendingSizeProduct.sale_unit)})
                          </span>
                        </Button>
                      ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setPendingSizeProduct(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : null}

              {lines.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-sm">
                  Todavía no hay productos. Buscá arriba para agregar líneas.
                </p>
              ) : (
                <div className="space-y-2">
                  {lines.map((line) => {
                    const unit = line.product.sale_unit ?? 'UND'
                    const decimals = inventoryQuantityDecimals(unit)
                    const stock = currentStockForLine(line)

                    return (
                      <div
                        key={line.key}
                        className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            <span className="text-muted-foreground font-mono text-xs">
                              {catalogProductCode(line.product.id)}
                            </span>
                            {' · '}
                            {line.product.name}
                            {line.sizeLabel ? ` · ${line.sizeLabel}` : ''}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Stock actual: {formatInventoryQuantity(stock, unit)} {unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="space-y-1">
                            <Label className="text-muted-foreground text-[10px]">
                              {inventoryAdjustmentQuantityLabel(mode)}
                            </Label>
                            <DecimalInput
                              className="h-8 w-24"
                              decimals={decimals}
                              min={mode === 'AJUSTE' ? 0 : inventoryQuantityMinPositive(unit)}
                              value={line.quantity}
                              onChange={(e) => updateQuantity(line.key, e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            aria-label={`Quitar ${line.product.name}`}
                            onClick={() => removeLine(line.key)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to="/productos">Cancelar</Link>
              </Button>
              <Button type="button" disabled={mutation.isPending} onClick={() => void handleSubmit()}>
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {inventoryAdjustmentSubmitLabel(mode)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PermissionGate>
    </div>
  )
}
