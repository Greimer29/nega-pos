import { FileText, FolderOpen, Loader2, Plus, Search } from 'lucide-react'
import { BarcodeScanButton } from '@/components/barcode-scan-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BillingMethod } from '@/features/ventas/constants'
import {
  VentasOrderCart,
  type VentasCartLine,
} from '@/features/ventas/components/ventas-order-cart'
import type { ConfirmSaleInput } from '@/features/ventas/types'
import { cn } from '@/lib/utils'

type PaymentType = NonNullable<ConfirmSaleInput['payment_type']>

type VentasCheckoutPanelProps = {
  orderLabel: string
  lines: VentasCartLine[]
  subtotalUsd: number
  discountUsd: number
  totalUsd: number
  billingMethod: BillingMethod
  paymentType: PaymentType
  customerName: string
  customerLinked: boolean
  customerCreditDays: number | null
  canCreditSale: boolean
  canConfirmSale: boolean
  isSubmitting: boolean
  stockBlocked: boolean
  successMessage: string | null
  shiftOpen: boolean
  shiftLoading: boolean
  confirmButtonLabel: string
  onClear: () => void
  onRemoveLine: (lineId: string) => void
  onUpdateQuantity: (lineId: string, quantity: number) => void
  onUpdateUnitPrice: (lineId: string, unitPriceUsd: number) => void
  onUpdateInvoiceDiscount: (discountUsd: number) => void
  onBillingMethodChange: (method: BillingMethod) => void
  onPaymentTypeChange: (paymentType: PaymentType) => void
  onCustomerNameChange: (name: string) => void
  onScanBarcode: (code: string) => void
  onLoadDraft: () => void
  onRegisterCustomer: () => void
  onFindCustomer: () => void
  onSaveBudget: () => void
  onConfirm: () => void
  onClose?: () => void
}

export function VentasCheckoutPanel({
  orderLabel,
  lines,
  subtotalUsd,
  discountUsd,
  totalUsd,
  billingMethod,
  paymentType,
  customerName,
  customerLinked,
  customerCreditDays,
  canCreditSale,
  canConfirmSale,
  isSubmitting,
  stockBlocked,
  successMessage,
  shiftOpen,
  shiftLoading,
  confirmButtonLabel,
  onClear,
  onRemoveLine,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onUpdateInvoiceDiscount,
  onBillingMethodChange,
  onPaymentTypeChange,
  onCustomerNameChange,
  onScanBarcode,
  onLoadDraft,
  onRegisterCustomer,
  onFindCustomer,
  onSaveBudget,
  onConfirm,
  onClose,
}: VentasCheckoutPanelProps) {
  return (
    <VentasOrderCart
      className="h-full min-h-0 w-full"
      orderLabel={orderLabel}
      lines={lines}
      subtotalUsd={subtotalUsd}
      discountUsd={discountUsd}
      totalUsd={totalUsd}
      onClear={onClear}
      onRemoveLine={onRemoveLine}
      onUpdateQuantity={onUpdateQuantity}
      onUpdateUnitPrice={onUpdateUnitPrice}
      onUpdateInvoiceDiscount={onUpdateInvoiceDiscount}
      emptyMessage="Agregá productos desde el catálogo."
      billingMethod={billingMethod}
      onBillingMethodChange={onBillingMethodChange}
      onClose={onClose}
      headerAction={
        <div className="flex items-center gap-1">
          <BarcodeScanButton
            className="size-8"
            title="Escanear para agregar al carrito"
            onScan={onScanBarcode}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            title="Cargar factura"
            aria-label="Cargar factura"
            onClick={onLoadDraft}
          >
            <FolderOpen className="size-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-3 pt-1">
        <div className="space-y-2">
          <Label className="text-xs">Cliente</Label>
          <div className="flex gap-2">
            <Input
              className="min-w-0 flex-1"
              placeholder="Generico"
              value={customerName}
              onChange={(event) => onCustomerNameChange(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Registrar cliente"
              aria-label="Registrar cliente"
              onClick={onRegisterCustomer}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Buscar cliente registrado"
              aria-label="Buscar cliente registrado"
              onClick={onFindCustomer}
            >
              <Search className="size-4" />
            </Button>
          </div>
          {customerLinked ? (
            <p className="text-muted-foreground text-xs">Cliente registrado vinculado</p>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <Label className="text-xs">Forma de pago</Label>
            <div className="bg-muted inline-flex rounded-lg p-1">
              <button
                type="button"
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  paymentType === 'CASH' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
                onClick={() => onPaymentTypeChange('CASH')}
              >
                Contado
              </button>
              <button
                type="button"
                disabled={!customerLinked || !canCreditSale}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  paymentType === 'CREDIT' ? 'bg-background shadow-sm' : 'text-muted-foreground',
                  (!customerLinked || !canCreditSale) && 'cursor-not-allowed opacity-50'
                )}
                onClick={() => onPaymentTypeChange('CREDIT')}
              >
                Crédito
              </button>
            </div>
            {paymentType === 'CREDIT' && customerLinked ? (
              <p className="text-muted-foreground text-xs">Plazo: {customerCreditDays ?? 0} días</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Generar presupuesto"
            aria-label="Generar presupuesto"
            disabled={isSubmitting || lines.length === 0}
            onClick={onSaveBudget}
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
          </Button>
        </div>

        {stockBlocked ? (
          <p className="text-destructive text-xs">
            Hay productos sin stock o por debajo del mínimo en el carrito.
          </p>
        ) : null}

        {successMessage ? <p className="text-emerald-700 text-sm">{successMessage}</p> : null}

        {canConfirmSale ? (
          <Button
            className="w-full"
            disabled={
              isSubmitting || lines.length === 0 || stockBlocked || !shiftOpen || shiftLoading
            }
            onClick={onConfirm}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {!shiftLoading && !shiftOpen ? 'Abrí un turno para vender' : confirmButtonLabel}
          </Button>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            No tenés permiso para confirmar ventas.
          </p>
        )}
      </div>
    </VentasOrderCart>
  )
}
