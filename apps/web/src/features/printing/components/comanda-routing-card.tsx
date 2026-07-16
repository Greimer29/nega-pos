import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { PrinterSelect } from '@/features/printing/components/printer-select'
import type { PrintConfig, PrinterInfo } from '@/features/printing/types'
import {
  UNCATEGORIZED_CATEGORY,
  UNCATEGORIZED_CATEGORY_LABEL,
  getRuleDeviceName,
  upsertCategoryRule,
} from '@/features/printing/utils/comanda-routing'

type ComandaRoutingCardProps = {
  config: PrintConfig
  printers: PrinterInfo[]
  canEdit: boolean
  electronAvailable: boolean
  onChange: (config: PrintConfig) => void
}

export function ComandaRoutingCard({
  config,
  printers,
  canEdit,
  electronAvailable,
  onChange,
}: ComandaRoutingCardProps) {
  const { data: categories = [] } = useActiveCategoriesQuery()
  const routing = config.categoryRouting.comanda
  const defaultPrinter = config.documents.comanda.deviceName

  const rows = [
    ...categories.map((category) => ({
      key: category.name,
      label: category.name,
    })),
    { key: UNCATEGORIZED_CATEGORY, label: UNCATEGORIZED_CATEGORY_LABEL },
  ]

  function updateRouting(patch: Partial<typeof routing>) {
    onChange({
      ...config,
      categoryRouting: {
        ...config.categoryRouting,
        comanda: {
          ...routing,
          ...patch,
        },
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comanda por categoría</CardTitle>
        <CardDescription>
          Enruta comandas a distintas impresoras según la categoría del producto vendido.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={routing.enabled}
            onChange={(event) => updateRouting({ enabled: event.target.checked })}
          />
          Usar impresoras distintas por categoría
        </label>

        <p className="text-muted-foreground text-xs">
          Se usa la <strong>categoría del producto</strong> en catálogo. Los materiales de la
          fórmula (si activaste &quot;Imprimir fórmula en comanda&quot;) salen <strong>debajo del
          producto en el mismo ticket</strong>, no en otra impresora. Si una venta mezcla categorías
          con impresoras distintas, se imprimen varias comandas (una por impresora). Las categorías
          sin regla usan la impresora de <strong>Comanda</strong>
          {defaultPrinter ? ` (${defaultPrinter})` : ' (sin asignar)'}.
        </p>

        {routing.enabled ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Categoría</th>
                  <th className="px-3 py-2 font-medium">Impresora de comanda</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b last:border-b-0">
                    <td className="px-3 py-2 align-middle">{row.label}</td>
                    <td className="px-3 py-2 align-middle">
                      <PrinterSelect
                        id={`comanda-printer-${row.key}`}
                        printers={printers}
                        value={getRuleDeviceName(routing.rules, row.key)}
                        disabled={!electronAvailable}
                        onChange={(deviceName) =>
                          updateRouting({
                            rules: upsertCategoryRule(routing.rules, row.key, deviceName),
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!electronAvailable ? (
          <p className="text-muted-foreground text-xs">
            La asignación de impresoras requiere la app de escritorio.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
