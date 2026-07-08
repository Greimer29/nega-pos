import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useActivePaymentMethodsQuery } from '@/features/payment-methods/hooks/use-payment-methods'
import type { PaymentMethod } from '@/features/payment-methods/types'
import { formatUsd } from '@/features/ventas/constants'
import { cn } from '@/lib/utils'

type VentasPaymentMethodDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalUsd: number
  isSubmitting?: boolean
  onConfirm: (method: PaymentMethod) => void
}

export function VentasPaymentMethodDialog({
  open,
  onOpenChange,
  totalUsd,
  isSubmitting = false,
  onConfirm,
}: VentasPaymentMethodDialogProps) {
  const { data: methods = [], isLoading } = useActivePaymentMethodsQuery()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSelectedCode(methods[0]?.code ?? null)
    }
  }, [open, methods])

  const selected = methods.find((method) => method.code === selectedCode) ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Método de pago</DialogTitle>
          <DialogDescription>
            Total a cobrar: <strong>{formatUsd(totalUsd)} USD</strong>. Elegí cómo pagó el cliente.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando métodos…
          </div>
        ) : methods.length === 0 ? (
          <p className="text-muted-foreground py-6 text-sm">
            No hay métodos de pago activos. Configuralos en Ajustes → Ventas.
          </p>
        ) : (
          <div className="grid gap-2">
            {methods.map((method) => (
              <button
                key={method.code}
                type="button"
                className={cn(
                  'rounded-lg border px-4 py-3 text-left transition-colors',
                  selectedCode === method.code
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => setSelectedCode(method.code)}
              >
                <div className="font-medium">{method.name}</div>
                <div className="text-muted-foreground text-xs">Moneda: {method.currency_code}</div>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selected || isSubmitting || methods.length === 0}
            onClick={() => selected && onConfirm(selected)}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Confirmar venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
