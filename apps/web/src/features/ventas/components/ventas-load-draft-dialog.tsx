import { Loader2, Search } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { useSalesQuery } from '@/features/ventas/hooks/use-sales'
import { getCatalogProduct } from '@/features/ventas/services/catalog-service'
import { getSale } from '@/features/ventas/services/sales-service'
import type { CatalogProduct, Sale } from '@/features/ventas/types'
import { getApiErrorMessage } from '@/lib/api-error'

export type LoadedDraft = {
  saleId: number
  saleLabel: string
  customerId: number | null
  customerName: string | null
  customerCreditDays: number | null
  guestName: string | null
  paymentType: 'CASH' | 'CREDIT'
  billingMethod: 'FAST' | 'ORDER'
  cart: { product: CatalogProduct; quantity: number }[]
}

type VentasLoadDraftDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoaded: (draft: LoadedDraft) => void
}

export function VentasLoadDraftDialog({ open, onOpenChange, onLoaded }: VentasLoadDraftDialogProps) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data, isLoading, isError, error } = useSalesQuery(
    {
      page: 1,
      perPage: 20,
      status: 'DRAFT',
      search: debouncedSearch || undefined,
    },
    { enabled: open }
  )

  const drafts = data?.sales ?? []

  async function handleSelect(sale: Sale) {
    setLoadingId(sale.id)
    setLoadError(null)
    try {
      const detail = await getSale(sale.id)
      const lines = detail.lines ?? []
      if (lines.length === 0) {
        setLoadError('El borrador no tiene productos.')
        return
      }

      const cart: LoadedDraft['cart'] = []
      for (const line of lines) {
        if (!line.catalog_product_id) continue
        const product = await getCatalogProduct(line.catalog_product_id)
        cart.push({
          product,
          quantity: Number(line.quantity),
        })
      }

      onLoaded({
        saleId: detail.id,
        saleLabel: detail.code ? `Borrador ${detail.code}` : `Borrador #${detail.id}`,
        customerId: detail.customer_id,
        customerName: detail.customer?.name ?? null,
        customerCreditDays: detail.customer?.credit_days ?? null,
        guestName: detail.guest_name,
        paymentType: detail.payment_type === 'CREDIT' ? 'CREDIT' : 'CASH',
        billingMethod: detail.billing_mode,
        cart,
      })
      onOpenChange(false)
    } catch (loadErr) {
      setLoadError(getApiErrorMessage(loadErr))
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cargar factura</DialogTitle>
          <DialogDescription>
            Elegí un borrador para editarlo en el carrito.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Buscar por cliente…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="scrollbar-subtle max-h-72 space-y-2 overflow-y-auto">
          {!open ? null : isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : isError ? (
            <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">
              {getApiErrorMessage(error)}
            </p>
          ) : drafts.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No hay borradores disponibles.
            </p>
          ) : (
            drafts.map((sale) => (
              <button
                key={sale.id}
                type="button"
                disabled={loadingId !== null}
                className="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
                onClick={() => void handleSelect(sale)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {sale.code ?? `Borrador #${sale.id}`}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {sale.customer?.name ?? sale.guest_name ?? 'Sin cliente'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DisplayMoneyFromUsd amountUsd={sale.total_usd} size="sm" />
                  {loadingId === sale.id ? <Loader2 className="size-4 animate-spin" /> : null}
                </div>
              </button>
            ))
          )}
        </div>

        {loadError ? <p className="text-destructive text-sm whitespace-pre-line">{loadError}</p> : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
