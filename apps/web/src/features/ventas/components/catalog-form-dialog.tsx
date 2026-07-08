import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { CircularImageField } from '@/components/circular-image-field'
import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { PRODUCT_SALE_UNITS, catalogImageUrl, productSaleUnitLabel } from '@/features/ventas/constants'
import { useFormatMoney } from '@/features/currencies/context/display-currency-context'
import {
  useCatalogProductQuery,
  useCreateCatalogProductMutation,
  useDeleteCatalogImageMutation,
  useUpdateCatalogProductMutation,
  useUploadCatalogImageMutation,
} from '@/features/ventas/hooks/use-catalog'
import { FormulaFormDialog } from '@/features/formulas/components/formula-form-dialog'
import { useFormulaMaterialsQuery, useFormulasQuery } from '@/features/formulas/hooks/use-formulas'
import type { Formula } from '@/features/formulas/types'
import type { CatalogProduct } from '@/features/ventas/types'
import type { ProductSaleUnit } from '@/features/ventas/constants'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatCostWarningsMessage, isBelowCost } from '@/lib/cost-warnings'
import {
  calcProfitMarginPercent,
  calcSalePriceFromMargin,
  profitMarginIsNegative,
} from '@/lib/profit-margin'
import { cn } from '@/lib/utils'

type CatalogFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: CatalogProduct | null
  onSaved?: () => void
  onCreated?: (product: CatalogProduct) => void
  purchaseFlow?: boolean
}

function formatMarginValue(cost: number, sale: string) {
  const margin = calcProfitMarginPercent(sale, cost)
  return margin !== null ? margin.toFixed(1) : ''
}

export function CatalogFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
  onCreated,
  purchaseFlow = false,
}: CatalogFormDialogProps) {
  const isEditing = product != null
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [saleUnit, setSaleUnit] = useState<ProductSaleUnit>('UND')
  const [salePrice, setSalePrice] = useState('')
  const [costPrice, setCostPrice] = useState('0')
  const [marginPercent, setMarginPercent] = useState('')
  const [formulaId, setFormulaId] = useState<number | ''>('')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [costWarning, setCostWarning] = useState<string | null>(null)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [formulaDialogOpen, setFormulaDialogOpen] = useState(false)
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null)

  const { data: categories = [] } = useActiveCategoriesQuery()
  const { data: liveProduct } = useCatalogProductQuery(isEditing ? product?.id : undefined)
  const displayProduct = liveProduct ?? product ?? null
  const createMutation = useCreateCatalogProductMutation()
  const updateMutation = useUpdateCatalogProductMutation()
  const uploadImageMutation = useUploadCatalogImageMutation()
  const deleteImageMutation = useDeleteCatalogImageMutation()
  const { data: formulasData } = useFormulasQuery({ page: 1, perPage: 100, active: true })
  const formulas = formulasData?.formulas ?? []
  const selectedFormulaId = formulaId === '' ? undefined : Number(formulaId)
  const selectedFormula = formulas.find((formula) => formula.id === selectedFormulaId) ?? null
  const { data: formulaMaterials } = useFormulaMaterialsQuery(selectedFormulaId)
  const hasFormula = selectedFormulaId != null
  const isPending = createMutation.isPending || updateMutation.isPending
  const imagePending = uploadImageMutation.isPending || deleteImageMutation.isPending
  const { formatFromUsd } = useFormatMoney()

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl)
      }
    }
  }, [pendingPreviewUrl])

  function clearPendingImage() {
    setPendingImageFile(null)
    setPendingPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return null
    })
  }

  async function handleSelectImage(file: File) {
    setImageError(null)

    clearPendingImage()
    setPendingImageFile(file)
    setPendingPreviewUrl(URL.createObjectURL(file))

    if (isEditing && displayProduct) {
      try {
        await uploadImageMutation.mutateAsync({ id: displayProduct.id, file })
        clearPendingImage()
      } catch (err) {
        setImageError(getApiErrorMessage(err))
      }
    }
  }

  async function handleRemoveImage() {
    setImageError(null)

    const hadServerImage = Boolean(isEditing && displayProduct?.image_path)

    clearPendingImage()

    if (hadServerImage && displayProduct) {
      try {
        await deleteImageMutation.mutateAsync(displayProduct.id)
      } catch (err) {
        setImageError(getApiErrorMessage(err))
      }
    }
  }

  const formulaCost = useMemo(() => {
    if (!formulaMaterials?.length) {
      return 0
    }

    return formulaMaterials.reduce((total, item) => {
      const unitCost = Number(item.material?.last_purchase_price_usd ?? 0)
      return total + unitCost * Number(item.quantity)
    }, 0)
  }, [formulaMaterials])

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)
    setCostWarning(null)
    setImageError(null)
    clearPendingImage()

    if (product) {
      setName(product.name)
      setDescription(product.description ?? '')
      setCategory(product.category)
      setSaleUnit(product.sale_unit ?? 'UND')
      setSalePrice(product.sale_price_usd)
      setCostPrice(product.cost_usd)
      setMarginPercent(formatMarginValue(Number(product.cost_usd), product.sale_price_usd))
      setFormulaId(product.formula_id ?? '')
      setStockQuantity(product.stock_quantity)
    } else {
      setName('')
      setDescription('')
      setCategory(categories[0]?.name ?? '')
      setSaleUnit('UND')
      setSalePrice('')
      setCostPrice('0')
      setMarginPercent('')
      setFormulaId('')
      setStockQuantity('0')
    }
  }, [open, product, categories])

  useEffect(() => {
    if (!hasFormula || !formulaMaterials) {
      return
    }

    const cost = formulaCost
    setCostPrice(cost.toFixed(2))

    if (marginPercent.trim()) {
      const sale = calcSalePriceFromMargin(cost, Number(marginPercent))
      if (sale !== null) {
        setSalePrice(sale.toFixed(2))
      }
    } else if (salePrice.trim()) {
      setMarginPercent(formatMarginValue(cost, salePrice))
    }
  }, [hasFormula, formulaCost, formulaMaterials])

  const effectiveCostUsd = hasFormula ? formulaCost : Number(costPrice)
  const saleBelowCost = isBelowCost(salePrice, effectiveCostUsd)
  const marginValue = Number(marginPercent)
  const marginIsNegative = profitMarginIsNegative(
    Number.isFinite(marginValue) ? marginValue : null
  )

  function applySaleFromMargin(cost: number, margin: string) {
    const sale = calcSalePriceFromMargin(cost, Number(margin))
    if (sale !== null) {
      setSalePrice(sale.toFixed(2))
    }
  }

  function applyMarginFromSale(cost: number, sale: string) {
    setMarginPercent(formatMarginValue(cost, sale))
  }

  function handleCostChange(value: string) {
    setCostPrice(value)
    if (hasFormula) return

    const cost = Number(value)
    if (!Number.isFinite(cost) || cost <= 0) return

    if (marginPercent.trim()) {
      applySaleFromMargin(cost, marginPercent)
    } else if (salePrice.trim()) {
      applyMarginFromSale(cost, salePrice)
    }
  }

  function handleMarginChange(value: string) {
    setMarginPercent(value)
    const cost = effectiveCostUsd
    if (!Number.isFinite(cost) || cost <= 0) return
    applySaleFromMargin(cost, value)
  }

  function handleSaleChange(value: string) {
    setSalePrice(value)
    const cost = effectiveCostUsd
    if (!Number.isFinite(cost) || cost <= 0) return
    applyMarginFromSale(cost, value)
  }

  function openCreateFormulaDialog() {
    setEditingFormula(null)
    setFormulaDialogOpen(true)
  }

  function openEditFormulaDialog() {
    if (!selectedFormula) {
      return
    }
    setEditingFormula(selectedFormula)
    setFormulaDialogOpen(true)
  }

  function handleFormulaSaved(saved: Pick<Formula, 'id' | 'name'>) {
    setFormulaId(saved.id)
  }

  async function handleSave() {
    setError(null)
    setCostWarning(null)

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      sale_unit: saleUnit,
      sale_price_usd: Number(salePrice),
      ...(hasFormula
        ? { formula_id: selectedFormulaId }
        : {
            cost_usd: Number(costPrice),
            formula_id: null,
            stock_quantity: purchaseFlow && !isEditing ? 0 : Number(stockQuantity),
          }),
    }

    try {
      if (isEditing) {
        const productId = displayProduct?.id ?? product?.id
        if (productId == null) {
          setError('No se pudo identificar el producto a editar.')
          return
        }

        const { costWarnings } = await updateMutation.mutateAsync({ id: productId, payload })
        const warningMessage = formatCostWarningsMessage(costWarnings)
        if (warningMessage) {
          setCostWarning(warningMessage)
          return
        }
      } else {
        const created = await createMutation.mutateAsync(payload)
        let createdProduct = created
        if (pendingImageFile) {
          createdProduct = await uploadImageMutation.mutateAsync({
            id: created.id,
            file: pendingImageFile,
          })
        }
        onCreated?.(createdProduct)
      }

      onSaved?.()
      onOpenChange(false)
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex w-1/3 shrink-0 justify-center">
              <CircularImageField
                imageUrl={
                  displayProduct?.image_path ? catalogImageUrl(displayProduct.id) : null
                }
                pendingPreviewUrl={pendingPreviewUrl}
                alt={name || 'Producto'}
                pending={imagePending}
                error={imageError}
                onSelectFile={(file) => void handleSelectImage(file)}
                onRemove={() => void handleRemoveImage()}
              />
            </div>
            <div className="flex h-[150px] w-2/3 flex-col justify-start py-0.5">
              <div className="space-y-0.5">
                <Label htmlFor="catalog-name" className="text-xs">
                  Nombre
                </Label>
                <Input
                  id="catalog-name"
                  className="h-8"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-[7fr_3fr] gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="catalog-category" className="text-xs">
                    Categoría
                  </Label>
                  <select
                    id="catalog-category"
                    className="border-input bg-background flex h-8 w-full rounded-md border px-3 text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="catalog-sale-unit" className="text-xs">
                    Unidad
                  </Label>
                  <select
                    id="catalog-sale-unit"
                    className="border-input bg-background flex h-8 w-full rounded-md border px-3 text-sm"
                    value={saleUnit}
                    onChange={(e) => setSaleUnit(e.target.value as ProductSaleUnit)}
                  >
                    {PRODUCT_SALE_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div
              className={cn(
                'grid gap-4',
                purchaseFlow && !isEditing ? 'grid-cols-1' : 'sm:grid-cols-2'
              )}
            >
              {purchaseFlow && !isEditing ? null : hasFormula ? (
                isEditing ? (
                  <div className="space-y-2">
                    <Label>Stock disponible</Label>
                    <p className="text-sm font-semibold tabular-nums">
                      {Number(stockQuantity).toLocaleString('es-VE')}{' '}
                      {productSaleUnitLabel(saleUnit).toLowerCase()}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Calculado según los materiales de la fórmula.
                    </p>
                  </div>
                ) : null
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="catalog-stock">Stock inicial</Label>
                  <DecimalInput
                    id="catalog-stock"
                    min={0}
                    decimals={2}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    También podés cargarlo por compra, cargo o ajuste manual.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="catalog-formula">Fórmula (opcional)</Label>
                <div className="flex gap-2">
                  <select
                    id="catalog-formula"
                    className="border-input bg-background flex h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
                    value={formulaId}
                    onChange={(e) => setFormulaId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Sin fórmula</option>
                    {formulas.map((formula) => (
                      <option key={formula.id} value={formula.id}>
                        {formula.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    aria-label="Nueva fórmula"
                    onClick={openCreateFormulaDialog}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0"
                    aria-label="Editar fórmula"
                    disabled={!hasFormula}
                    onClick={openEditFormulaDialog}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
                {hasFormula ? (
                  <p className="text-muted-foreground text-xs">
                    Costo desde fórmula: {formatFromUsd(formulaCost)}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="catalog-cost">Precio costo</Label>
                <MoneyInput
                  id="catalog-cost"
                  min={0}
                  value={costPrice}
                  readOnly={hasFormula}
                  className={hasFormula ? 'bg-muted/40' : undefined}
                  onChange={(e) => handleCostChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="catalog-margin"
                  className={cn(marginIsNegative && 'text-destructive')}
                >
                  Margen %
                </Label>
                <DecimalInput
                  id="catalog-margin"
                  min={0}
                  decimals={1}
                  value={marginPercent}
                  onChange={(e) => handleMarginChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalog-price" className={cn(saleBelowCost && 'text-destructive')}>
                  Precio venta
                </Label>
                <MoneyInput
                  id="catalog-price"
                  min={0}
                  value={salePrice}
                  className={cn(
                    saleBelowCost &&
                      'border-destructive text-destructive focus-visible:ring-destructive/30'
                  )}
                  onChange={(e) => handleSaleChange(e.target.value)}
                />
                {saleBelowCost ? (
                  <p className="text-destructive text-xs">
                    Por debajo del costo ({formatFromUsd(effectiveCostUsd)}).
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog-desc">Descripción (opcional)</Label>
              <Textarea
                id="catalog-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        {costWarning ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm whitespace-pre-line text-amber-900">
            {costWarning}
          </p>
        ) : null}
        {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isPending} onClick={() => void handleSave()}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEditing ? 'Guardar' : purchaseFlow ? 'Crear y agregar' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <FormulaFormDialog
      open={formulaDialogOpen}
      onOpenChange={setFormulaDialogOpen}
      formula={editingFormula}
      onSaved={handleFormulaSaved}
    />
    </>
  )
}
