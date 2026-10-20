import { Plus } from 'lucide-react'
import { BarcodeScanButton } from '@/components/barcode-scan-button'
import { CatalogProductSearchPicker } from '@/components/search-picker/catalog-product-search-picker'
import { MachineSearchPicker } from '@/components/search-picker/machine-search-picker'
import { MaterialSearchPicker } from '@/components/search-picker/material-search-picker'
import { Button } from '@/components/ui/button'
import type { Machine } from '@/features/machines/types'
import type { Material } from '@/features/materials/types'
import type { CatalogProduct } from '@/features/ventas/types'
import { cn } from '@/lib/utils'

export type PurchaseItemAddMode = 'material' | 'product' | 'machine'

const MODES: Array<{ value: PurchaseItemAddMode; label: string }> = [
  { value: 'material', label: 'Materiales' },
  { value: 'product', label: 'Productos' },
  { value: 'machine', label: 'Máquinas' },
]

type PurchaseItemAddToolbarProps = {
  mode: PurchaseItemAddMode
  onModeChange: (mode: PurchaseItemAddMode) => void
  excludeMachineIds: number[]
  onSelectMaterial: (material: Material) => void
  onSelectProduct: (product: CatalogProduct) => void
  onSelectMachine: (machine: Machine) => void
  onScan: (code: string) => void
  onNewMaterial: () => void
  onNewProduct: () => void
  onNewMachine: () => void
}

export function PurchaseItemAddToolbar({
  mode,
  onModeChange,
  excludeMachineIds,
  onSelectMaterial,
  onSelectProduct,
  onSelectMachine,
  onScan,
  onNewMaterial,
  onNewProduct,
  onNewMachine,
}: PurchaseItemAddToolbarProps) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
      <div className="bg-muted inline-flex rounded-lg p-1">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium',
              mode === option.value ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
            onClick={() => onModeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex min-w-[260px] flex-1 items-end gap-2 sm:max-w-lg">
        <div className="min-w-0 flex-1">
          {mode === 'material' ? (
            <MaterialSearchPicker
              variant="dropdown"
              label=""
              placeholder="Buscar material por código, referencia o nombre…"
              onSelect={onSelectMaterial}
            />
          ) : mode === 'product' ? (
            <CatalogProductSearchPicker
              variant="dropdown"
              label=""
              placeholder="Buscar producto por nombre o referencia…"
              onSelect={onSelectProduct}
            />
          ) : (
            <MachineSearchPicker
              variant="dropdown"
              label=""
              placeholder="Buscar máquina existente…"
              excludeIds={excludeMachineIds}
              onSelect={onSelectMachine}
            />
          )}
        </div>
        {mode !== 'machine' ? <BarcodeScanButton className="shrink-0" onScan={onScan} /> : null}
      </div>

      {mode === 'material' ? (
        <Button size="sm" variant="outline" onClick={onNewMaterial}>
          <Plus />
          Nuevo material
        </Button>
      ) : mode === 'product' ? (
        <Button size="sm" variant="outline" onClick={onNewProduct}>
          <Plus />
          Nuevo producto
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onNewMachine}>
          <Plus />
          Nueva máquina
        </Button>
      )}
    </div>
  )
}
