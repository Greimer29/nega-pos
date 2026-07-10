import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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
import { inventoryQuantityDecimals, inventoryUnitAbrev } from '@/lib/inventory-units'
import {
  useCreateFormulaMutation,
  useFormulaMaterialsQuery,
  useUpdateFormulaMaterialsMutation,
  useUpdateFormulaMutation,
} from '@/features/formulas/hooks/use-formulas'
import type { Formula } from '@/features/formulas/types'
import { useMaterialsQuery } from '@/features/materials/hooks/use-materials'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatCostWarningsMessage } from '@/lib/cost-warnings'

type FormulaFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formula?: Formula | null
  onSaved?: (formula: Pick<Formula, 'id' | 'name'>) => void
}

type MaterialRow = { material_id: number; quantity: string }

export function FormulaFormDialog({
  open,
  onOpenChange,
  formula,
  onSaved,
}: FormulaFormDialogProps) {
  const isEditing = formula != null
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [costWarning, setCostWarning] = useState<string | null>(null)

  const createMutation = useCreateFormulaMutation()
  const updateMutation = useUpdateFormulaMutation()
  const updateMaterialsMutation = useUpdateFormulaMaterialsMutation()
  const { data: materialsData, isLoading: loadingMaterials } = useFormulaMaterialsQuery(
    open && isEditing ? formula.id : undefined
  )
  const { data: catalogMaterialsData } = useMaterialsQuery({
    page: 1,
    perPage: 100,
    status: 'active',
  })

  const materials = catalogMaterialsData?.materials ?? []
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
    }
  }, [open, formula])

  useEffect(() => {
    if (materialsData && open && isEditing) {
      setMaterialRows(
        materialsData.map((item) => ({
          material_id: item.material_id,
          quantity: item.quantity,
        }))
      )
    }
  }, [materialsData, open, isEditing])

  function addMaterialRow() {
    setMaterialRows((rows) => [...rows, { material_id: materials[0]?.id ?? 0, quantity: '1' }])
  }

  function removeMaterialRow(index: number) {
    setMaterialRows((rows) => rows.filter((_, i) => i !== index))
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
          items: materialRows
            .filter((row) => row.material_id > 0)
            .map((row) => ({
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
            items: materialRows
              .filter((row) => row.material_id > 0)
              .map((row) => ({
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
              La cantidad se ingresa en la unidad del material seleccionado ({' '}
              <strong>MTS/KG</strong> admite decimales; <strong>UND/PAR/CAJ/ROL/SET</strong> son
              enteros).
            </p>
            {isEditing && loadingMaterials ? (
              <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Cargando materiales…
              </div>
            ) : materialRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin materiales. Agregá al menos uno.</p>
            ) : (
              materialRows.map((row, index) => {
                const material = materials.find((m) => m.id === row.material_id)
                const unit = material?.unit ?? 'UND'
                const decimals = inventoryQuantityDecimals(unit)
                const min = decimals === 0 ? 1 : 0.001

                return (
                  <div key={index} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <select
                        className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                        value={row.material_id}
                        onChange={(e) =>
                          setMaterialRows((rows) =>
                            rows.map((r, i) =>
                              i === index ? { ...r, material_id: Number(e.target.value) } : r
                            )
                          )
                        }
                      >
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.code} — {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-muted-foreground w-10 shrink-0 text-center text-xs font-semibold">
                      {inventoryUnitAbrev(unit)}
                    </span>
                    <DecimalInput
                      className="w-24 shrink-0"
                      decimals={decimals}
                      min={min}
                      value={row.quantity}
                      onChange={(e) =>
                        setMaterialRows((rows) =>
                          rows.map((r, i) =>
                            i === index ? { ...r, quantity: e.target.value } : r
                          )
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeMaterialRow(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )
              })
            )}
            <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
              <Plus className="size-4" />
              Agregar material
            </Button>
          </div>
        </div>

        {costWarning ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 whitespace-pre-line">
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
