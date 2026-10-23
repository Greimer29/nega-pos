import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { MIN_WHOLESALE_UNITS_PER_PACK } from '@/lib/wholesale'

type CatalogWholesalePriceFieldsProps = {
  units: string
  cost: string
  margin: string
  sale: string
  retailUnitCostLabel: string
  onUnitsChange: (value: string) => void
  onCostChange: (value: string) => void
  onMarginChange: (value: string) => void
  onSaleChange: (value: string) => void
}

export function CatalogWholesalePriceFields({
  units,
  cost,
  margin,
  sale,
  retailUnitCostLabel,
  onUnitsChange,
  onCostChange,
  onMarginChange,
  onSaleChange,
}: CatalogWholesalePriceFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="catalog-pack-units">Unidades por paquete</Label>
        <DecimalInput
          id="catalog-pack-units"
          min={MIN_WHOLESALE_UNITS_PER_PACK}
          decimals={0}
          value={units}
          onChange={(e) => onUnitsChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="catalog-pack-cost">Precio costo paquete</Label>
        <MoneyInput
          id="catalog-pack-cost"
          min={0}
          value={cost}
          onChange={(e) => onCostChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="catalog-pack-margin">Margen paquete %</Label>
        <DecimalInput
          id="catalog-pack-margin"
          min={0}
          decimals={1}
          value={margin}
          onChange={(e) => onMarginChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="catalog-pack-sale">Precio venta paquete</Label>
        <MoneyInput
          id="catalog-pack-sale"
          min={0}
          value={sale}
          onChange={(e) => onSaleChange(e.target.value)}
        />
      </div>
      <p className="text-muted-foreground sm:col-span-2 text-xs">
        Costo unitario detal: {retailUnitCostLabel} (costo paquete ÷ unidades).
      </p>
    </div>
  )
}

type CatalogRetailPriceFieldsProps = {
  costValue: string
  costReadOnly: boolean
  costFromPack: boolean
  margin: string
  marginIsNegative: boolean
  sale: string
  saleBelowCost: boolean
  effectiveCostLabel: string
  onCostChange: (value: string) => void
  onMarginChange: (value: string) => void
  onSaleChange: (value: string) => void
}

export function CatalogRetailPriceFields({
  costValue,
  costReadOnly,
  costFromPack,
  margin,
  marginIsNegative,
  sale,
  saleBelowCost,
  effectiveCostLabel,
  onCostChange,
  onMarginChange,
  onSaleChange,
}: CatalogRetailPriceFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="catalog-cost">Precio costo</Label>
        <MoneyInput
          id="catalog-cost"
          min={0}
          value={costValue}
          readOnly={costReadOnly}
          className={costReadOnly ? 'bg-muted/40' : undefined}
          onChange={(e) => onCostChange(e.target.value)}
        />
        {costFromPack ? (
          <p className="text-muted-foreground text-xs">Se calcula desde el costo del paquete.</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="catalog-margin" className={cn(marginIsNegative && 'text-destructive')}>
          Margen %
        </Label>
        <DecimalInput
          id="catalog-margin"
          min={0}
          decimals={1}
          value={margin}
          onChange={(e) => onMarginChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="catalog-price" className={cn(saleBelowCost && 'text-destructive')}>
          Precio venta
        </Label>
        <MoneyInput
          id="catalog-price"
          min={0}
          value={sale}
          className={cn(
            saleBelowCost && 'border-destructive text-destructive focus-visible:ring-destructive/30'
          )}
          onChange={(e) => onSaleChange(e.target.value)}
        />
        {saleBelowCost ? (
          <p className="text-destructive text-xs">Por debajo del costo ({effectiveCostLabel}).</p>
        ) : null}
      </div>
    </div>
  )
}
