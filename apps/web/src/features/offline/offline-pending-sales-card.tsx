import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useOfflinePos } from '@/features/offline/use-offline-pos'
import { toast } from '@/features/notifications/toast'
import { getApiErrorMessage } from '@/lib/api-error'

export function OfflinePendingSalesCard() {
  const {
    offlineEnabled,
    pendingSales,
    returnLocalSaleFully,
    returnLocalSalePartial,
    connectivity,
  } = useOfflinePos()
  const [busyFile, setBusyFile] = useState<string | null>(null)
  const [partialFile, setPartialFile] = useState<string | null>(null)
  const [partialQty, setPartialQty] = useState<Record<number, string>>({})

  if (!offlineEnabled || pendingSales.length === 0) {
    return null
  }

  async function onFullReturn(fileName: string, localRef: string) {
    setBusyFile(fileName)
    try {
      await returnLocalSaleFully(fileName)
      toast.success(`Venta local ${localRef} anulada (no se enviará al servidor).`)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusyFile(null)
    }
  }

  async function onPartialReturn(fileName: string) {
    const sale = pendingSales.find((row) => row.fileName === fileName)
    if (!sale) return

    const returns = sale.operation.lines
      .map((line, lineIndex) => ({
        lineIndex,
        quantity: Number(partialQty[lineIndex] || 0),
        available: Number(line.quantity),
      }))
      .filter((row) => row.quantity > 0)

    if (returns.length === 0) {
      toast.warning('Indicá al menos una cantidad a devolver.')
      return
    }

    for (const row of returns) {
      if (row.quantity > row.available + 0.0005) {
        toast.warning('Alguna cantidad supera lo vendido.')
        return
      }
    }

    setBusyFile(fileName)
    try {
      await returnLocalSalePartial(
        fileName,
        returns.map((row) => ({ lineIndex: row.lineIndex, quantity: row.quantity }))
      )
      toast.success('Devolución parcial aplicada en la copia local.')
      setPartialFile(null)
      setPartialQty({})
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    } finally {
      setBusyFile(null)
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ventas sin sincronizar</CardTitle>
        <CardDescription>
          {connectivity === 'offline'
            ? 'Estás sin conexión. Podés anular o devolver parcialmente estas ventas locales.'
            : 'Hay ventas locales pendientes de subir. Si quitás el permiso en plataforma, siguen activas hasta sincronizar.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingSales.map((sale) => (
          <div
            key={sale.fileName}
            className="rounded-lg border border-amber-200/80 bg-white px-3 py-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{sale.operation.local_ref}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(sale.operation.sold_at).toLocaleString('es-VE')} ·{' '}
                  {sale.operation.billing_mode === 'ORDER' ? 'Pedido' : 'Rápida'} ·{' '}
                  {sale.operation.payment_type === 'CREDIT' ? 'Crédito' : 'Contado'}
                </p>
                <p className="mt-1 text-sm">
                  <DisplayMoneyFromUsd amountUsd={sale.totalUsd} />
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyFile === sale.fileName}
                  onClick={() =>
                    setPartialFile((current) =>
                      current === sale.fileName ? null : sale.fileName
                    )
                  }
                >
                  Parcial
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busyFile === sale.fileName}
                  onClick={() => void onFullReturn(sale.fileName, sale.operation.local_ref)}
                >
                  {busyFile === sale.fileName ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  Anular
                </Button>
              </div>
            </div>

            {partialFile === sale.fileName ? (
              <div className="mt-3 space-y-2 border-t border-amber-100 pt-3">
                {sale.operation.lines.map((line, lineIndex) => (
                  <div key={lineIndex} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate">
                      {line.catalog_product_id
                        ? `Producto #${line.catalog_product_id}`
                        : `Material #${line.material_id}`}{' '}
                      · vendido {line.quantity}
                    </span>
                    <Input
                      className="h-8 w-24"
                      type="number"
                      min={0}
                      max={line.quantity}
                      step="0.001"
                      placeholder="0"
                      value={partialQty[lineIndex] ?? ''}
                      onChange={(event) =>
                        setPartialQty((prev) => ({
                          ...prev,
                          [lineIndex]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={busyFile === sale.fileName}
                  onClick={() => void onPartialReturn(sale.fileName)}
                >
                  Confirmar devolución parcial
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
