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
import { getMaterial } from '@/features/materials/services/material-service'
import type { Material } from '@/features/materials/types'
import { useSalesQuery } from '@/features/ventas/hooks/use-sales'
import { getCatalogProduct } from '@/features/ventas/services/catalog-service'
import { getSale } from '@/features/ventas/services/sales-service'
import type { CatalogProduct, Sale } from '@/features/ventas/types'
import {
  createCartLineId,
  mapApiFormulaMaterialsToLine,
  type SaleLineFormulaMaterial,
} from '@/features/ventas/utils/sale-line-formula'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'

export type LoadedDraftCartLine =
  | {
      id: string
      kind: 'catalog'
      product: CatalogProduct
      quantity: number
      formulaMaterials?: SaleLineFormulaMaterial[] | null
      unitPriceUsd?: number
      kitchenNote?: string | null
      detail?: string | null
      catalogProductSizeId?: number | null
      size?: string | null
    }
  | {
      id: string
      kind: 'material'
      material: Material
      quantity: number
      unitPriceUsd?: number
    }

export type LoadedDraft = {
  saleId: number
  saleLabel: string
  customerId: number | null
  customerName: string | null
  customerCreditDays: number | null
  guestName: string | null
  paymentType: 'CASH' | 'CREDIT'
  billingMethod: 'FAST' | 'ORDER'
  cart: LoadedDraftCartLine[]
  invoiceDiscountUsd?: number
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
    try {
      const detail = await getSale(sale.id)
      const lines = detail.lines ?? []
      if (lines.length === 0) {
        toast.warning('El borrador no tiene líneas.')
        return
      }

      const cart: LoadedDraft['cart'] = []
      for (const line of lines) {
        if (line.material_id) {
          const material = await getMaterial(line.material_id)
          cart.push({
            id: createCartLineId(),
            kind: 'material',
            material,
            quantity: Number(line.quantity),
            unitPriceUsd: Number(line.unit_price_usd),
          })
          continue
        }

        if (!line.catalog_product_id) continue
        const product = await getCatalogProduct(line.catalog_product_id)
        const formulaMaterials = line.has_custom_formula
          ? mapApiFormulaMaterialsToLine(line.formula_materials ?? [])
          : null
        cart.push({
          id: createCartLineId(),
          kind: 'catalog',
          product,
          quantity: Number(line.quantity),
          formulaMaterials,
          kitchenNote: line.kitchen_note?.trim() ? line.kitchen_note.trim() : null,
          detail:
            product.item_kind === 'SERVICE' || product.is_service
              ? line.description?.trim() && line.description.trim() !== product.name
                ? line.description.trim()
                : null
              : null,
          unitPriceUsd: Number(line.unit_price_usd),
          catalogProductSizeId: line.catalog_product_size_id ?? null,
          size: line.size ?? null,
        })
      }

      if (cart.length === 0) {
        toast.warning('El borrador no tiene líneas cargables.')
        return
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
        invoiceDiscountUsd: Number(detail.discount_usd ?? 0),
      })
      onOpenChange(false)
    } catch (loadErr) {
      notifyApiError(loadErr)
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
            <QueryErrorState isError error={error} title="No se pudieron cargar los borradores" />
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
