import type { Dispatch, SetStateAction } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { DecimalInput } from '@/components/decimal-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { newSizeRow, type SizeRow } from '@/features/ventas/utils/catalog-product-form'

type CatalogSizeRowsEditorProps = {
  rows: SizeRow[]
  stockDecimals: number
  onRowsChange: Dispatch<SetStateAction<SizeRow[]>>
}

export function CatalogSizeRowsEditor({
  rows,
  stockDecimals,
  onRowsChange,
}: CatalogSizeRowsEditorProps) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <Input
            className="h-9 w-24 shrink-0"
            placeholder="Talla"
            maxLength={20}
            value={row.size}
            onChange={(e) =>
              onRowsChange((current) =>
                current.map((item) =>
                  item.key === row.key ? { ...item, size: e.target.value } : item
                )
              )
            }
          />
          <DecimalInput
            className="h-9 min-w-0 flex-1"
            min={0}
            decimals={stockDecimals}
            placeholder="Stock"
            value={row.stock_quantity}
            onChange={(e) =>
              onRowsChange((current) =>
                current.map((item) =>
                  item.key === row.key ? { ...item, stock_quantity: e.target.value } : item
                )
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label="Quitar talla"
            disabled={rows.length <= 1}
            onClick={() => onRowsChange((current) => current.filter((item) => item.key !== row.key))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onRowsChange((current) => [...current, newSizeRow()])}
      >
        <Plus className="size-4" />
        Agregar talla
      </Button>
    </div>
  )
}
