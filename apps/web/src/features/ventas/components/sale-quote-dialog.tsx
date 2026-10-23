import { Download, FileText, Loader2, Share2 } from 'lucide-react'
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
import { useDisplayCurrency } from '@/features/currencies/context/display-currency-context'
import { currencySymbol } from '@/features/currencies/utils/convert-currency'
import { notifyApiError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { fetchSaleQuotePdf, saleQuoteFileName } from '@/features/ventas/services/sales-service'
import {
  deliverQuotePdf,
  quoteDeliveryTarget,
  type QuoteDeliveryTarget,
} from '@/features/ventas/utils/quote-pdf-delivery'
import { cn } from '@/lib/utils'

export type SaleQuoteTarget = {
  saleId: number
  customerName?: string | null
}

type SaleQuoteDialogProps = {
  quote: SaleQuoteTarget | null
  onOpenChange: (open: boolean) => void
}

const ACTION_LABEL: Record<QuoteDeliveryTarget, string> = {
  android: 'Compartir PDF',
  desktop: 'Guardar PDF',
  browser: 'Descargar PDF',
}

const ACTION_HINT: Record<QuoteDeliveryTarget, string> = {
  android: 'Se abre el menú de Android para enviarlo por WhatsApp, Telegram u otra app.',
  desktop: 'Se guarda en Descargas\\Presupuestos y se abre la carpeta para adjuntarlo.',
  browser: 'Se descarga el archivo PDF para adjuntarlo en WhatsApp o Telegram.',
}

export function SaleQuoteDialog({ quote, onOpenChange }: SaleQuoteDialogProps) {
  const { displayCurrency, baseCurrencyCode, currencies } = useDisplayCurrency()
  const [currency, setCurrency] = useState(displayCurrency)
  const [pending, setPending] = useState(false)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const target = quoteDeliveryTarget()
  const open = quote !== null

  useEffect(() => {
    if (open) {
      setCurrency(displayCurrency)
      setSavedPath(null)
    }
  }, [open, displayCurrency])

  const currencyCodes =
    currencies.length > 0 ? currencies.map((item) => item.code) : [baseCurrencyCode]
  const customerName = quote?.customerName?.trim()
  const showCustomer = Boolean(customerName) && customerName!.toLowerCase() !== 'generico'

  async function handleGenerate() {
    if (!quote) return
    setPending(true)
    setSavedPath(null)
    try {
      const blob = await fetchSaleQuotePdf(quote.saleId, currency)
      const result = await deliverQuotePdf(blob, saleQuoteFileName(quote.saleId))
      if (result.kind === 'saved') {
        setSavedPath(result.path)
        toast.success('Presupuesto guardado en Descargas\\Presupuestos.')
      } else if (result.kind === 'downloaded') {
        toast.success('Presupuesto descargado.')
      } else if (result.kind === 'shared') {
        onOpenChange(false)
      }
    } catch (error) {
      notifyApiError(error, 'No se pudo generar el presupuesto')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Presupuesto N° {quote?.saleId}
          </DialogTitle>
          <DialogDescription>
            {showCustomer ? `Para ${customerName}. ` : ''}
            {ACTION_HINT[target]}
          </DialogDescription>
        </DialogHeader>

        {currencyCodes.length > 1 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Moneda del PDF</p>
            <div className="bg-muted inline-flex rounded-lg p-1" role="radiogroup">
              {currencyCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={currency === code}
                  disabled={pending}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium',
                    currency === code ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  )}
                  onClick={() => setCurrency(code)}
                >
                  {currencySymbol(code)} {code}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {savedPath ? (
          <p className="text-muted-foreground break-all text-xs">Guardado en {savedPath}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button type="button" disabled={pending} onClick={() => void handleGenerate()}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : target === 'android' ? (
              <Share2 className="size-4" />
            ) : (
              <Download className="size-4" />
            )}
            {ACTION_LABEL[target]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
