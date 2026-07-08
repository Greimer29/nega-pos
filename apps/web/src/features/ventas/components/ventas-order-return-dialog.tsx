import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DecimalInput } from '@/components/decimal-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useReturnSaleMutation } from '@/features/ventas/hooks/use-sales'
import { getSale } from '@/features/ventas/services/sales-service'
import type { SaleLine } from '@/features/ventas/types'
import { getApiErrorMessage } from '@/lib/api-error'
import { parseDecimalInput } from '@/lib/numeric-input'
import { cn } from '@/lib/utils'

type ReturnSelection = {
  lineId: number
  selected: boolean
  quantity: number
}

type VentasOrderReturnDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId: number | null
  onSuccess?: () => void
}

function remainingQty(line: SaleLine) {
  return Math.max(0, Number(line.quantity) - Number(line.returned_quantity ?? 0))
}

export function VentasOrderReturnDialog({
  open,
  onOpenChange,
  saleId,
  onSuccess,
}: VentasOrderReturnDialogProps) {
  const returnMutation = useReturnSaleMutation()
  const [loading, setLoading] = useState(false)
  const [saleCode, setSaleCode] = useState('')
  const [lines, setLines] = useState<SaleLine[]>([])
  const [selection, setSelection] = useState<ReturnSelection[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !saleId) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void getSale(saleId)
      .then((sale) => {
        if (cancelled) return
        setSaleCode(sale.code ?? `#${sale.id}`)
        const saleLines = sale.lines ?? []
        setLines(saleLines)
        setSelection(
          saleLines
            .filter((line) => remainingQty(line) > 0)
            .map((line) => ({
              lineId: line.id,
              selected: true,
              quantity: remainingQty(line),
            }))
        )
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, saleId])

  const selectedTotal = useMemo(() => {
    return selection.reduce((sum, item) => {
      if (!item.selected) return sum
      const line = lines.find((l) => l.id === item.lineId)
      if (!line) return sum
      return sum + item.quantity * Number(line.unit_price_usd)
    }, 0)
  }, [selection, lines])

  function toggleLine(lineId: number, selected: boolean) {
    setSelection((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, selected } : item))
    )
  }

  function updateQty(lineId: number, quantity: number) {
    setSelection((prev) =>
      prev.map((item) => (item.lineId === lineId ? { ...item, quantity } : item))
    )
  }

  async function handleSubmit() {
    if (!saleId) return

    const payload = selection
      .filter((item) => item.selected && item.quantity > 0)
      .map((item) => ({ line_id: item.lineId, quantity: item.quantity }))

    if (payload.length === 0) {
      setError('Seleccioná al menos un producto para devolver.')
      return
    }

    for (const item of payload) {
      const line = lines.find((l) => l.id === item.line_id)
      if (!line) continue
      if (item.quantity > remainingQty(line) + 0.0005) {
        setError('Alguna cantidad supera lo disponible para devolver.')
        return
      }
    }

    setError(null)
    try {
      await returnMutation.mutateAsync({ id: saleId, payload: { lines: payload } })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar devolución</DialogTitle>
          <DialogDescription>
            {saleCode
              ? `Elegí qué productos devolver de ${saleCode}. El ajuste impacta el día de la venta original.`
              : 'Elegí los productos a devolver.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : (
          <div className="scrollbar-subtle max-h-80 space-y-3 overflow-y-auto pr-1">
            {lines.map((line) => {
              const remaining = remainingQty(line)
              const item = selection.find((s) => s.lineId === line.id)
              const fullyReturned = remaining <= 0

              return (
                <div
                  key={line.id}
                  className={cn(
                    'rounded-lg border p-3',
                    fullyReturned && 'bg-muted/40 opacity-70',
                    item?.selected && !fullyReturned && 'border-primary/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={fullyReturned || returnMutation.isPending}
                      checked={fullyReturned ? false : (item?.selected ?? false)}
                      onChange={(e) => toggleLine(line.id, e.target.checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          fullyReturned && 'text-muted-foreground line-through'
                        )}
                      >
                        {line.catalog_product?.name ?? line.description}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Vendido: {Number(line.quantity).toLocaleString('es-VE')}
                        {Number(line.returned_quantity ?? 0) > 0 ? (
                          <span className="text-destructive">
                            {' '}
                            · Devuelto: {Number(line.returned_quantity).toLocaleString('es-VE')}
                          </span>
                        ) : null}
                      </p>
                      {fullyReturned ? (
                        <p className="text-destructive mt-1 text-xs font-medium">Devuelto</p>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <Label className="text-xs">Cantidad</Label>
                          <DecimalInput
                            min={0.001}
                            max={remaining}
                            className="h-8 w-20 px-2 text-xs"
                            value={item?.quantity ?? remaining}
                            disabled={!item?.selected || returnMutation.isPending}
                            onChange={(e) =>
                              updateQty(line.id, parseDecimalInput(e.target.value, 3) ?? 0)
                            }
                          />
                          <span className="text-muted-foreground text-xs">/ {remaining}</span>
                        </div>
                      )}
                    </div>
                    <DisplayMoneyFromUsd
                      amountUsd={Number(line.unit_price_usd) * (item?.quantity ?? remaining)}
                      size="sm"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Monto a devolver</span>
          <DisplayMoneyFromUsd amountUsd={selectedTotal} />
        </div>

        {error ? <p className="text-destructive text-sm whitespace-pre-line">{error}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={loading || returnMutation.isPending || selection.every((s) => !s.selected)}
            onClick={() => void handleSubmit()}
          >
            {returnMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmar devolución
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
