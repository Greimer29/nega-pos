import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { inventoryQuantityDecimals, inventoryQuantityMinPositive, inventoryUnitAbrev } from '@/lib/inventory-units'
import {
  useCreateFormulaMutation,
  useFormulaMaterialsQuery,
  useUpdateFormulaMaterialsMutation,
  useUpdateFormulaMutation,
} from '@/features/formulas/hooks/use-formulas'
import type { Formula } from '@/features/formulas/types'
import type { Material } from '@/features/materials/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatCostWarningsMessage } from '@/lib/cost-warnings'

type FormulaFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formula?: Formula | null
  pickableFormulas?: Formula[]
  onSaved?: (formula: Pick<Formula, 'id' | 'name'>) => void
  onPickExisting?: (formula: Pick<Formula, 'id' | 'name'>) => void
}

type MaterialRow = {
  material_id: number
  quantity: string
  materialCode: string
  materialName: string
  materialUnit: string
}

export function FormulaFormDialog({
  open,
  onOpenChange,
  formula,
  pickableFormulas = [],
  onSaved,
  onPickExisting,
}: FormulaFormDialogProps) {
  const isEditing = formula != null
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [costWarning, setCostWarning] = useState<string | null>(null)
  const [pickExistingId, setPickExistingId] = useState('')

  const createMutation = useCreateFormulaMutation()
  const updateMutation = useUpdateFormulaMutation()
  const updateMaterialsMutation = useUpdateFormulaMaterialsMutation()
  const { data: materialsData, isLoading: loadingMaterials } = useFormulaMaterialsQuery(
    open && isEditing ? formula.id : undefined
  )

  const isPending =
    createMutation.isPending || updateMutation.isPending || updateMaterialsMutation.isPending

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)

    if (formula) {
      setName(formula.name)
      setDescription(formula.description ?? '')
    } else {
      setName('')
      setDescription('')
      setMaterialRows([])
      setPickExistingId('')
    }
  }, [open, formula])

  useEffect(() => {
    if (materialsData && open && isEditing) {
      setMaterialRows(
        materialsData.map((item) => ({
          material_id: item.material_id,
          quantity: item.quantity,
          materialCode: item.material?.code ?? `#${item.material_id}`,
          materialName: item.material?.name ?? `Material #${item.material_id}`,
          materialUnit: item.material?.unit ?? 'UND',
        }))
      )
    }
  }, [materialsData, open, isEditing])

  function addMaterial(material: Material) {
    if (materialRows.some((row) => row.material_id === material.id)) {
      setError(`"${material.name}" ya está en la fórmula.`)
      return
    }

    setError(null)
    setMaterialRows((rows) => [
      ...rows,
      {
        material_id: material.id,
        quantity: '1',
        materialCode: material.code,
        materialName: material.name,
        materialUnit: material.unit,
      },
    ])
  }

  function removeMaterialRow(materialId: number) {
    setMaterialRows((rows) => rows.filter((row) => row.material_id !== materialId))
  }

  async function handleSave() {
    setError(null)
    setCostWarning(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('El nombre de la fórmula es obligatorio.')
      return
    }

    try {
      let savedFormula: Pick<Formula, 'id' | 'name'>

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: formula.id,
          payload: {
            name: trimmedName,
            description: description.trim() || undefined,
          },
        })
        const { costWarnings } = await updateMaterialsMutation.mutateAsync({
          id: formula.id,
          items: materialRows.map((row) => ({
            material_id: row.material_id,
            quantity: Number(row.quantity),
          })),
        })
        const warningMessage = formatCostWarningsMessage(costWarnings)
        if (warningMessage) {
          setCostWarning(warningMessage)
          return
        }
        savedFormula = { id: formula.id, name: trimmedName }
      } else {
        const created = await createMutation.mutateAsync({
          name: trimmedName,
          description: description.trim() || undefined,
        })
        if (materialRows.length > 0) {
          const { costWarnings } = await updateMaterialsMutation.mutateAsync({
            id: created.id,
            items: materialRows.map((row) => ({
              material_id: row.material_id,
              quantity: Number(row.quantity),
            })),
          })
          const warningMessage = formatCostWarningsMessage(costWarnings)
          if (warningMessage) {
            setCostWarning(warningMessage)
            return
          }
        }
        savedFormula = { id: created.id, name: trimmedName }
      }

      onSaved?.(savedFormula)
      onOpenChange(false)
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar fórmula' : 'Nueva fórmula'}</DialogTitle>
          <DialogDescription>
            Configurá una fórmula reutilizable con sus materiales. Luego podés asignarla a uno o
            varios productos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEditing && pickableFormulas.length > 0 && onPickExisting ? (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <Label htmlFor="formula-pick-existing">Elegir fórmula existente</Label>
              <div className="flex gap-2">
                <select
                  id="formula-pick-existing"
                  className="border-input bg-background flex h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
                  value={pickExistingId}
                  onChange={(e) => setPickExistingId(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {pickableFormulas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!pickExistingId}
                  onClick={() => {
                    const selected = pickableFormulas.find(
                      (item) => String(item.id) === pickExistingId
                    )
                    if (!selected) return
                    onPickExisting({ id: selected.id, name: selected.name })
                    onOpenChange(false)
                  }}
                >
                  Usar
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">O creá una nueva abajo.</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="formula-name">Nombre</Label>
            <Input
              id="formula-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Conjunto adidas estándar"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="formula-desc">Descripción</Label>
            <Textarea
              id="formula-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Materiales</Label>
            <p className="text-muted-foreground text-xs">
              Buscá y elegí cada material. La cantidad se ingresa en la unidad del material (
              <strong>MTS/KG</strong> admite decimales; <strong>UND/PAR/CAJ/ROL/SET</strong> son
              enteros).
            </p>

            {isEditing && loadingMaterials ? (
              <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Cargando materiales…
              </div>
            ) : materialRows.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-sm">
                Todavía no hay materiales. Usá el buscador de abajo para agregar.
              </p>
            ) : (
              <div className="space-y-2">
                {materialRows.map((row) => {
                  const decimals = inventoryQuantityDecimals(row.materialUnit)
                  const min = inventoryQuantityMinPositive(row.materialUnit)

                  return (
                    <div
                      key={row.material_id}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          <span className="text-muted-foreground font-mono text-xs">
                            {row.materialCode}
                          </span>
                          {' · '}
                          {row.materialName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Cantidad · {inventoryUnitAbrev(row.materialUnit)}
                        </p>
                      </div>
                      <DecimalInput
                        className="h-8 w-24 shrink-0"
                        decimals={decimals}
                        min={min}
                        value={row.quantity}
                        onChange={(e) =>
                          setMaterialRows((rows) =>
                            rows.map((r) =>
                              r.material_id === row.material_id
                                ? { ...r, quantity: e.target.value }
                                : r
                            )
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => removeMaterialRow(row.material_id)}
                        aria-label={`Quitar ${row.materialName}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            <MaterialSearchPicker
              enabled={open}
              excludeIds={materialRows.map((row) => row.material_id)}
              keepOpenOnSelect
              clearOnSelect
              label="Agregar material"
              onSelect={addMaterial}
            />
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
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
