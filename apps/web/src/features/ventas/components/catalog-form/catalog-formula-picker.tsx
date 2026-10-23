import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Formula } from '@/features/formulas/types'

type CatalogFormulaPickerProps = {
  formulas: Formula[]
  selectedFormulaId: number | undefined
  selectedFormula: Formula | null
  formulaCostLabel: string
  onEdit: () => void
  onClear: () => void
  onSelect: (idValue: string) => void
  onCreate: () => void
}

export function CatalogFormulaPicker({
  formulas,
  selectedFormulaId,
  selectedFormula,
  formulaCostLabel,
  onEdit,
  onClear,
  onSelect,
  onCreate,
}: CatalogFormulaPickerProps) {
  const hasFormula = selectedFormulaId != null

  return (
    <div className="space-y-3">
      {hasFormula ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="border-input bg-muted/30 flex min-w-0 flex-1 items-center rounded-md border px-3 py-2 text-sm">
            <span className="truncate font-medium">
              {selectedFormula?.name ?? `Fórmula #${selectedFormulaId}`}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            aria-label="Editar fórmula"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            Cambiar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {formulas.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="catalog-formula-pick">Elegir fórmula existente</Label>
              <select
                id="catalog-formula-pick"
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
                value=""
                onChange={(e) => onSelect(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {formulas.map((formula) => (
                  <option key={formula.id} value={formula.id}>
                    {formula.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Todavía no hay fórmulas. Creá una nueva.</p>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onCreate}>
            <Plus className="size-4" />
            Crear fórmula nueva
          </Button>
        </div>
      )}
      {hasFormula ? (
        <p className="text-muted-foreground text-xs">Costo desde fórmula: {formulaCostLabel}</p>
      ) : null}
    </div>
  )
}
