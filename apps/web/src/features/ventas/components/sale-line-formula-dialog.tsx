import { useEffect, useMemo, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { MaterialSearchPicker } from '@/components/search-picker/material-search-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DecimalInput } from '@/components/decimal-input'
import { useFormulaMaterialsQuery } from '@/features/formulas/hooks/use-formulas'
import type { CatalogProduct } from '@/features/ventas/types'
import type {
  SaleLineFormulaMaterial,
  SaleLineFormulaMaterialRef,
} from '@/features/ventas/utils/sale-line-formula'
import {
  mapCatalogFormulaToLineMaterials,
} from '@/features/ventas/utils/sale-line-formula'
import { inventoryQuantityDecimals } from '@/lib/inventory-units'
import { parseDecimalInput } from '@/lib/numeric-input'

type EditableRow = SaleLineFormulaMaterial & {
  materialName: string
  materialUnit: string
  lastPurchasePriceUsd: string | null
}

type SaleLineFormulaSaveResult = {
  materials: SaleLineFormulaMaterial[] | null
  materialRefs: SaleLineFormulaMaterialRef[]
}

type SaleLineFormulaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: CatalogProduct | null
  initialMaterials: SaleLineFormulaMaterialRef[] | null | undefined
  onSave: (result: SaleLineFormulaSaveResult) => void
}

function buildRowsFromProduct(
  product: CatalogProduct,
  formulaMaterials: Array<{
    material_id: number
    quantity: string
    material?: { name: string; unit: string; last_purchase_price_usd?: string | null }
  }>,
  initialMaterials: SaleLineFormulaMaterialRef[] | null | undefined
): EditableRow[] {
  if (initialMaterials && initialMaterials.length > 0) {
    return initialMaterials.map((item) => ({
      material_id: item.material_id,
      quantity_per_unit: item.quantity_per_unit,
      materialName: item.material?.name ?? `Material #${item.material_id}`,
      materialUnit: item.material?.unit ?? 'UND',
      lastPurchasePriceUsd: item.material?.last_purchase_price_usd ?? null,
    }))
  }

  return formulaMaterials.map((item) => ({
    material_id: item.material_id,
    quantity_per_unit: Number(item.quantity),
    materialName: item.material?.name ?? `Material #${item.material_id}`,
    materialUnit: item.material?.unit ?? 'UND',
    lastPurchasePriceUsd: item.material?.last_purchase_price_usd ?? null,
  }))
}

export function SaleLineFormulaDialog({
  open,
  onOpenChange,
  product,
  initialMaterials,
  onSave,
}: SaleLineFormulaDialogProps) {
  const formulaId = product?.formula_id ?? undefined
  const { data: fetchedFormulaMaterials, isLoading } = useFormulaMaterialsQuery(
    open && formulaId ? formulaId : undefined
  )
  const [rows, setRows] = useState<EditableRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const baseFormulaMaterials = useMemo(() => {
    if (product?.formula?.materials?.length) {
      return product.formula.materials
    }
    return fetchedFormulaMaterials ?? []
  }, [product?.formula?.materials, fetchedFormulaMaterials])

  useEffect(() => {
    if (!open || !product) {
      return
    }

    setRows(buildRowsFromProduct(product, baseFormulaMaterials, initialMaterials))
    setError(null)
  }, [open, product, baseFormulaMaterials, initialMaterials])

  function updateRowQuantity(materialId: number, quantity: number) {
    setRows((prev) =>
      prev.map((row) =>
        row.material_id === materialId ? { ...row, quantity_per_unit: quantity } : row
      )
    )
  }

  function removeRow(materialId: number) {
    setRows((prev) => prev.filter((row) => row.material_id !== materialId))
  }

  function addMaterial(material: {
    id: number
    name: string
    unit: string
    lastPurchasePriceUsd: string | null
  }) {
    setRows((prev) => [
      ...prev,
      {
        material_id: material.id,
        quantity_per_unit: 1,
        materialName: material.name,
        materialUnit: material.unit,
        lastPurchasePriceUsd: material.lastPurchasePriceUsd,
      },
    ])
  }

  const excludeMaterialIds = useMemo(() => rows.map((row) => row.material_id), [rows])

  function handleReset() {
    if (!product) {
      return
    }
    onSave({ materials: null, materialRefs: [] })
    onOpenChange(false)
  }

  function handleSave() {
    const activeRows = rows.filter((row) => row.quantity_per_unit > 0)
    if (activeRows.length === 0) {
      setError('Incluí al menos un material con cantidad mayor a cero.')
      return
    }

    const materialRefs: SaleLineFormulaMaterialRef[] = activeRows.map((row) => ({
      material_id: row.material_id,
      quantity_per_unit: row.quantity_per_unit,
      material: {
        id: row.material_id,
        code: '',
        name: row.materialName,
        unit: row.materialUnit,
        last_purchase_price_usd: row.lastPurchasePriceUsd,
      },
    }))

    onSave({
      materials: activeRows.map((row) => ({
        material_id: row.material_id,
        quantity_per_unit: row.quantity_per_unit,
      })),
      materialRefs,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Materiales de esta venta</DialogTitle>
          <DialogDescription>
            Ajustá la receta solo para esta línea. La fórmula del catálogo no cambia.
          </DialogDescription>
        </DialogHeader>

        {isLoading && rows.length === 0 ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando fórmula...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay materiales en esta receta.</p>
              ) : (
                rows.map((row) => {
                  const decimals = inventoryQuantityDecimals(row.materialUnit)
                  return (
                    <div
                      key={row.material_id}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.materialName}</p>
                        <p className="text-muted-foreground text-xs">Por unidad · {row.materialUnit}</p>
                      </div>
                      <DecimalInput
                        min={0}
                        step={decimals === 0 ? 1 : 0.001}
                        decimals={decimals}
                        className="h-8 w-20"
                        value={row.quantity_per_unit}
                        onChange={(event) =>
                          updateRowQuantity(
                            row.material_id,
                            parseDecimalInput(event.target.value, decimals) ?? 0
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => removeRow(row.material_id)}
                        aria-label={`Quitar ${row.materialName}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>

            <MaterialSearchPicker
              enabled={open}
              excludeIds={excludeMaterialIds}
              keepOpenOnSelect
              clearOnSelect
              label="Agregar material"
              onSelect={addMaterial}
            />

            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handleReset}>
            Restablecer fórmula base
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function buildInitialFormulaMaterialsFromCatalog(
  product: CatalogProduct
): SaleLineFormulaMaterial[] | null {
  if (!product.formula?.materials?.length) {
    return null
  }
  return mapCatalogFormulaToLineMaterials(product.formula.materials)
}
