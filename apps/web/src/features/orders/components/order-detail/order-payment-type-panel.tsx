import { Label } from '@/components/ui/label'
import type { OrderPaymentType } from '@/features/orders/types'
import { cn } from '@/lib/utils'

type OrderPaymentTypePanelProps = {
  paymentType: OrderPaymentType
  canUseCredit: boolean
  creditDays: number | null
  onChange: (paymentType: OrderPaymentType) => void
}

export function OrderPaymentTypePanel({
  paymentType,
  canUseCredit,
  creditDays,
  onChange,
}: OrderPaymentTypePanelProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-md border bg-neutral-50 p-4">
      <div className="space-y-2">
        <Label className="text-xs">Forma de pago al facturar</Label>
        <div className="bg-muted inline-flex rounded-lg p-1">
          <button
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium',
              paymentType === 'CASH' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
            onClick={() => onChange('CASH')}
          >
            Contado
          </button>
          <button
            type="button"
            disabled={!canUseCredit}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium',
              paymentType === 'CREDIT' ? 'bg-background shadow-sm' : 'text-muted-foreground',
              !canUseCredit && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => onChange('CREDIT')}
          >
            Crédito
          </button>
        </div>
        {paymentType === 'CREDIT' && creditDays != null ? (
          <p className="text-muted-foreground text-xs">Plazo: {creditDays} días</p>
        ) : null}
      </div>
      <p className="text-muted-foreground max-w-md text-xs">
        La forma de pago se aplica al confirmar o entregar la venta. Si venís desde Ventas, se
        conserva la selección que hayas hecho allí.
      </p>
    </div>
  )
}
