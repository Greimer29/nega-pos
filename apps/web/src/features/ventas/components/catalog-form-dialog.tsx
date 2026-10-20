import { useEffect, useMemo, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { CircularImageField } from '@/components/circular-image-field'
import { BarcodeScanButton } from '@/components/barcode-scan-button'
import { DecimalInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import { OptionSwitch } from '@/components/ui/switch'
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
import { CategoryFormDialog } from '@/features/categories/components/category-form-dialog'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
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
import { notifyApiError, notifyFormError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatCostWarningsMessage, isBelowCost } from '@/lib/cost-warnings'
import { formatInventoryQuantity, inventoryQuantityDecimals } from '@/lib/inventory-units'
import { calcSalePriceFromMargin, profitMarginIsNegative } from '@/lib/profit-margin'
import { deriveUnitCostFromPack, MIN_WHOLESALE_UNITS_PER_PACK } from '@/lib/wholesale'
import {
  CatalogRetailPriceFields,
  CatalogWholesalePriceFields,
} from '@/features/ventas/components/catalog-form/catalog-price-fields'
import { CatalogFormulaPicker } from '@/features/ventas/components/catalog-form/catalog-formula-picker'
import { CatalogSizeRowsEditor } from '@/features/ventas/components/catalog-form/catalog-size-rows-editor'
import {
  buildCatalogProductPayload,
  calcFormulaMaterialsCost,
  deriveRetailCost,
  formatMarginValue,
  newSizeRow,
  sumSizeRowsStock,
  validateCatalogProductForm,
  type CatalogProductFormValues,
  type SizeRow,
} from '@/features/ventas/utils/catalog-product-form'

type CatalogFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: CatalogProduct | null
  onSaved?: () => void
  onCreated?: (product: CatalogProduct) => void
  purchaseFlow?: boolean
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
  const [barcode, setBarcode] = useState('')
  const [supplierCode, setSupplierCode] = useState('')
  const [saleUnit, setSaleUnit] = useState<ProductSaleUnit>('UND')
  const [salePrice, setSalePrice] = useState('')
  const [costPrice, setCostPrice] = useState('0')
  const [marginPercent, setMarginPercent] = useState('')
  const [formulaId, setFormulaId] = useState<number | ''>('')
  const [stockQuantity, setStockQuantity] = useState('0')
  const [minimumStock, setMinimumStock] = useState('0')
  const [useFormula, setUseFormula] = useState(false)
  const [useSizes, setUseSizes] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [sizeRows, setSizeRows] = useState<SizeRow[]>([newSizeRow()])
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [formulaDialogOpen, setFormulaDialogOpen] = useState(false)
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null)
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false)
  const [pricePanel, setPricePanel] = useState<'retail' | 'wholesale'>('retail')
  const [wholesaleUnits, setWholesaleUnits] = useState('30')
  const [wholesaleCost, setWholesaleCost] = useState('')
  const [wholesaleSale, setWholesaleSale] = useState('')
  const [wholesaleMargin, setWholesaleMargin] = useState('')

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
  const stockDecimals = inventoryQuantityDecimals(saleUnit)
  const sizesStockTotal = useMemo(
    () => sumSizeRowsStock(sizeRows, saleUnit),
    [saleUnit, sizeRows]
  )

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

  const formulaCost = useMemo(() => calcFormulaMaterialsCost(formulaMaterials), [formulaMaterials])

  useEffect(() => {
    if (!open) {
      return
    }

    setImageError(null)
    clearPendingImage()

    if (product) {
      setName(product.name)
      setDescription(product.description ?? '')
      setCategory(product.category)
      setBarcode(product.barcode ?? '')
      setSupplierCode(product.supplier_code ?? '')
      setSaleUnit(product.sale_unit ?? 'UND')
      setSalePrice(product.sale_price_usd)
      setCostPrice(product.cost_usd)
      setMarginPercent(formatMarginValue(Number(product.cost_usd), product.sale_price_usd))
      setFormulaId(product.formula_id ?? '')
      setUseFormula(Boolean(product.formula_id))
      setStockQuantity(product.stock_quantity)
      setMinimumStock(product.minimum_stock ?? '0')
      const productSizes = product.sizes ?? []
      if (productSizes.length > 0) {
        setUseSizes(true)
        setSizeRows(
          productSizes.map((size) => ({
            key: String(size.id),
            size: size.size,
            stock_quantity: String(size.stock_quantity),
          }))
        )
      } else {
        setUseSizes(false)
        setSizeRows([newSizeRow()])
      }
      const enabled = Boolean(product.wholesale_enabled)
      setWholesaleEnabled(enabled)
      setPricePanel(enabled ? 'wholesale' : 'retail')
      setWholesaleUnits(product.wholesale_units_per_pack ?? '30')
      setWholesaleCost(product.wholesale_cost_usd ?? '')
      setWholesaleSale(product.wholesale_sale_price_usd ?? '')
      setWholesaleMargin(
        formatMarginValue(
          Number(product.wholesale_cost_usd ?? 0),
          product.wholesale_sale_price_usd ?? ''
        )
      )
    } else {
      setName('')
      setDescription('')
      setCategory(categories[0]?.name ?? '')
      setBarcode('')
      setSupplierCode('')
      setSaleUnit('UND')
      setSalePrice('')
      setCostPrice('0')
      setMarginPercent('')
      setFormulaId('')
      setUseFormula(false)
      setStockQuantity('0')
      setMinimumStock('0')
      setUseSizes(false)
      setSizeRows([newSizeRow()])
      setWholesaleEnabled(false)
      setPricePanel('retail')
      setWholesaleUnits('30')
      setWholesaleCost('')
      setWholesaleSale('')
      setWholesaleMargin('')
    }
  }, [open, product, categories])

  useEffect(() => {
    if (!hasFormula || !formulaMaterials) {
      return
    }

    const cost = formulaCost
    setCostPrice(cost.toFixed(4))

    // Costo de fórmula cambió: conservar venta y actualizar margen.
    // Solo si aún no hay venta, proyectar venta desde el margen.
    if (salePrice.trim()) {
      setMarginPercent(formatMarginValue(cost, salePrice))
    } else if (marginPercent.trim()) {
      const sale = calcSalePriceFromMargin(cost, Number(marginPercent))
      if (sale !== null) {
        setSalePrice(sale.toFixed(4))
      }
    }
  }, [hasFormula, formulaCost, formulaMaterials])

  const derivedRetailCost = deriveRetailCost(
    wholesaleEnabled,
    wholesaleUnits,
    wholesaleCost,
    costPrice
  )
  const effectiveCostUsd = hasFormula ? formulaCost : derivedRetailCost
  const saleBelowCost = isBelowCost(salePrice, effectiveCostUsd)
  const marginValue = Number(marginPercent)
  const marginIsNegative = profitMarginIsNegative(
    Number.isFinite(marginValue) ? marginValue : null
  )

  function applySaleFromMargin(cost: number, margin: string) {
    const sale = calcSalePriceFromMargin(cost, Number(margin))
    if (sale !== null) {
      setSalePrice(sale.toFixed(4))
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

    // Regla: editar costo → actualizar margen (conservar precio de venta).
    // Nunca proyectar venta desde un margen previo (producía montos absurdos).
    if (salePrice.trim()) {
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
    setUseFormula(true)
    setUseSizes(false)
  }

  function clearFormula() {
    setFormulaId('')
  }

  function handleUseFormulaChange(checked: boolean) {
    setUseFormula(checked)
    if (checked) {
      setUseSizes(false)
      return
    }
    clearFormula()
  }

  function handleUseSizesChange(checked: boolean) {
    setUseSizes(checked)
    if (checked) {
      setUseFormula(false)
      clearFormula()
      setWholesaleEnabled(false)
      setPricePanel('retail')
      if (sizeRows.length === 0) {
        setSizeRows([newSizeRow()])
      }
    }
  }

  function handleWholesaleChange(checked: boolean) {
    setWholesaleEnabled(checked)
    if (checked) {
      setUseSizes(false)
      setPricePanel('wholesale')
      // Sin fórmula: el costo unitario se deriva del paquete. Con fórmula lo define la receta.
      if (!useFormula) {
        const units = Number(wholesaleUnits)
        if (Number.isFinite(units) && units >= MIN_WHOLESALE_UNITS_PER_PACK && wholesaleCost.trim()) {
          setCostPrice(deriveUnitCostFromPack(Number(wholesaleCost) || 0, units).toFixed(4))
        }
      }
      return
    }
    setPricePanel('retail')
  }

  function handleWholesaleCostChange(value: string) {
    setWholesaleCost(value)
    const units = Number(wholesaleUnits)
    const cost = Number(value)
    if (
      !useFormula &&
      Number.isFinite(units) &&
      units >= MIN_WHOLESALE_UNITS_PER_PACK &&
      Number.isFinite(cost)
    ) {
      const unitCost = deriveUnitCostFromPack(cost, units)
      setCostPrice(unitCost.toFixed(4))
      if (salePrice.trim()) {
        applyMarginFromSale(unitCost, salePrice)
      }
    }
    if (wholesaleSale.trim()) {
      setWholesaleMargin(formatMarginValue(Number(value) || 0, wholesaleSale))
    }
  }

  function handleWholesaleUnitsChange(value: string) {
    setWholesaleUnits(value)
    const units = Number(value)
    const cost = Number(wholesaleCost)
    if (Number.isFinite(units) && units >= MIN_WHOLESALE_UNITS_PER_PACK && Number.isFinite(cost)) {
      const unitCost = deriveUnitCostFromPack(cost, units)
      setCostPrice(unitCost.toFixed(4))
      if (salePrice.trim()) {
        applyMarginFromSale(unitCost, salePrice)
      }
    }
  }

  function handleWholesaleSaleChange(value: string) {
    setWholesaleSale(value)
    setWholesaleMargin(formatMarginValue(Number(wholesaleCost) || 0, value))
  }

  function handleWholesaleMarginChange(value: string) {
    setWholesaleMargin(value)
    const sale = calcSalePriceFromMargin(Number(wholesaleCost) || 0, Number(value))
    if (sale !== null) {
      setWholesaleSale(sale.toFixed(4))
    }
  }

  function handleSelectExistingFormula(idValue: string) {
    if (!idValue) {
      clearFormula()
      return
    }
    const selected = formulas.find((formula) => String(formula.id) === idValue)
    if (!selected) return
    setFormulaId(selected.id)
    setUseSizes(false)
  }

  async function handleSave() {
    const formValues: CatalogProductFormValues = {
      name,
      description,
      category,
      barcode,
      supplierCode,
      saleUnit,
      salePrice,
      costPrice,
      stockQuantity,
      minimumStock,
      useFormula,
      useSizes,
      sizeRows,
      wholesaleEnabled,
      wholesaleUnits,
      wholesaleCost,
      wholesaleSale,
    }

    const formError = validateCatalogProductForm(formValues, hasFormula)
    if (formError) {
      notifyFormError(formError)
      return
    }

    const hadSizes =
      Boolean(product?.has_sizes) || (product?.sizes?.length ?? 0) > 0 || Boolean(displayProduct?.has_sizes)
    const payload = buildCatalogProductPayload(formValues, {
      selectedFormulaId,
      hadSizes,
      isEditing,
      purchaseFlow,
    })

    try {
      if (isEditing) {
        const productId = displayProduct?.id ?? product?.id
        if (productId == null) {
          notifyFormError('No se pudo identificar el producto a editar.')
          return
        }

        const { costWarnings } = await updateMutation.mutateAsync({ id: productId, payload })
        const warningMessage = formatCostWarningsMessage(costWarnings)
        if (warningMessage) {
          toast.warning(warningMessage, 'Producto por debajo del costo')
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
      notifyApiError(saveError, 'No se pudo guardar el producto')
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
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
            <div className="flex w-2/3 flex-col justify-start py-0.5">
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
              <div className="space-y-0.5">
                <Label htmlFor="catalog-barcode" className="text-xs">
                  Código de barras
                </Label>
                <div className="flex gap-1.5">
                  <Input
                    id="catalog-barcode"
                    className="h-8 min-w-0 flex-1"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Opcional"
                  />
                  <BarcodeScanButton
                    className="size-8"
                    onScan={(code) => setBarcode(code)}
                  />
                </div>
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="catalog-supplier-code" className="text-xs">
                  Referencia
                </Label>
                <Input
                  id="catalog-supplier-code"
                  className="h-8"
                  value={supplierCode}
                  onChange={(e) => setSupplierCode(e.target.value)}
                  placeholder="Código del proveedor"
                  maxLength={50}
                />
              </div>
              <div className="grid grid-cols-[7fr_3fr] gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="catalog-category" className="text-xs">
                    Categoría
                  </Label>
                  <div className="flex gap-1.5">
                    <select
                      id="catalog-category"
                      className="border-input bg-background flex h-8 min-w-0 flex-1 rounded-md border px-3 text-sm"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.length === 0 ? (
                        <option value="">Sin categorías</option>
                      ) : (
                        categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                    <PermissionGate permission="catalog.edit">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0"
                        title="Nueva categoría"
                        aria-label="Nueva categoría"
                        onClick={() => setCategoryDialogOpen(true)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </PermissionGate>
                  </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              ) : useSizes ? (
                <div className="space-y-2">
                  <Label>Stock total</Label>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatInventoryQuantity(sizesStockTotal, saleUnit)}{' '}
                    {productSaleUnitLabel(saleUnit).toLowerCase()}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Suma automática del stock por talla.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="catalog-stock">Stock inicial</Label>
                  <DecimalInput
                    id="catalog-stock"
                    min={0}
                    decimals={stockDecimals}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    También podés cargarlo por compra, cargo o ajuste manual.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="catalog-minimum-stock">Stock mínimo</Label>
                <DecimalInput
                  id="catalog-minimum-stock"
                  min={0}
                  decimals={stockDecimals}
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Alerta cuando el stock disponible quede por debajo de este valor.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <OptionSwitch
                  label="Usar fórmula"
                  checked={useFormula}
                  disabled={useSizes}
                  onCheckedChange={handleUseFormulaChange}
                />
                <OptionSwitch
                  label="Usar tallas"
                  checked={useSizes}
                  disabled={useFormula || wholesaleEnabled}
                  onCheckedChange={handleUseSizesChange}
                />
                <OptionSwitch
                  label="Mayorista"
                  checked={wholesaleEnabled}
                  disabled={useSizes}
                  onCheckedChange={handleWholesaleChange}
                />
              </div>
              {useSizes && (useFormula || wholesaleEnabled) ? (
                <p className="text-muted-foreground text-xs">
                  Las tallas no se combinan con fórmula ni mayorista.
                </p>
              ) : useFormula && wholesaleEnabled ? (
                <p className="text-muted-foreground text-xs">
                  Mayorista vende por paquete; el stock se descuenta de los materiales de la fórmula
                  (paquetes × und/paq × cantidad de la receta).
                </p>
              ) : null}
              {useFormula && !useSizes ? (
                <CatalogFormulaPicker
                  formulas={formulas}
                  selectedFormulaId={selectedFormulaId}
                  selectedFormula={selectedFormula}
                  formulaCostLabel={formatFromUsd(formulaCost)}
                  onEdit={openEditFormulaDialog}
                  onClear={clearFormula}
                  onSelect={handleSelectExistingFormula}
                  onCreate={openCreateFormulaDialog}
                />
              ) : null}
            </div>

            <div className="space-y-3">
              {useSizes && !useFormula ? (
                <CatalogSizeRowsEditor
                  rows={sizeRows}
                  stockDecimals={stockDecimals}
                  onRowsChange={setSizeRows}
                />
              ) : null}
            </div>

            <div className="space-y-3">
              {wholesaleEnabled ? (
                <div className="flex gap-1 rounded-md border p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={pricePanel === 'retail' ? 'default' : 'ghost'}
                    className="flex-1"
                    onClick={() => setPricePanel('retail')}
                  >
                    Detal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={pricePanel === 'wholesale' ? 'default' : 'ghost'}
                    className="flex-1"
                    onClick={() => setPricePanel('wholesale')}
                  >
                    Mayorista
                  </Button>
                </div>
              ) : null}
            </div>

            {wholesaleEnabled && pricePanel === 'wholesale' ? (
              <CatalogWholesalePriceFields
                units={wholesaleUnits}
                cost={wholesaleCost}
                margin={wholesaleMargin}
                sale={wholesaleSale}
                retailUnitCostLabel={formatFromUsd(derivedRetailCost)}
                onUnitsChange={handleWholesaleUnitsChange}
                onCostChange={handleWholesaleCostChange}
                onMarginChange={handleWholesaleMarginChange}
                onSaleChange={handleWholesaleSaleChange}
              />
            ) : (
              <CatalogRetailPriceFields
                costValue={wholesaleEnabled ? derivedRetailCost.toFixed(4) : costPrice}
                costReadOnly={hasFormula || wholesaleEnabled}
                costFromPack={wholesaleEnabled}
                margin={marginPercent}
                marginIsNegative={marginIsNegative}
                sale={salePrice}
                saleBelowCost={saleBelowCost}
                effectiveCostLabel={formatFromUsd(effectiveCostUsd)}
                onCostChange={handleCostChange}
                onMarginChange={handleMarginChange}
                onSaleChange={handleSaleChange}
              />
            )}

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

    <CategoryFormDialog
      open={categoryDialogOpen}
      onOpenChange={setCategoryDialogOpen}
      onCreated={(created) => setCategory(created.name)}
    />
    </>
  )
}
