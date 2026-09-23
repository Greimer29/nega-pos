import { Loader2, Search, Trash2 } from 'lucide-react'
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
import { useDeleteSaleMutation, useSalesQuery } from '@/features/ventas/hooks/use-sales'
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
  onDeleted?: (saleId: number) => void
}

export function VentasLoadDraftDialog({
  open,
  onOpenChange,
  onLoaded,
  onDeleted,
}: VentasLoadDraftDialogProps) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Sale | null>(null)
  const deleteDraftMutation = useDeleteSaleMutation()

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

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return
    try {
      await deleteDraftMutation.mutateAsync(confirmDelete.id)
      onDeleted?.(confirmDelete.id)
      toast.success(
        confirmDelete.code
          ? `Se eliminó el borrador ${confirmDelete.code}.`
          : `Se eliminó el borrador #${confirmDelete.id}.`
      )
      setConfirmDelete(null)
    } catch (deleteErr) {
      notifyApiError(deleteErr)
    }
  }

  const busy = loadingId !== null || deleteDraftMutation.isPending

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmDelete(null)
          onOpenChange(nextOpen)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cargar factura</DialogTitle>
            <DialogDescription>
              Tocá un borrador para cargarlo al carrito, o <strong>Eliminar</strong> para borrarlo.
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
                <div
                  key={sale.id}
                  className="flex items-center gap-2 rounded-lg border px-2 py-1.5"
                >
                  <button
                    type="button"
                    disabled={busy}
                    className="hover:bg-muted flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    title="Eliminar borrador"
                    aria-label={`Eliminar ${sale.code ?? `borrador #${sale.id}`}`}
                    disabled={busy}
                    onClick={() => setConfirmDelete(sale)}
                  >
                    {deleteDraftMutation.isPending && confirmDelete?.id === sale.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Eliminar
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDelete !== null}
        onOpenChange={(next) => !next && setConfirmDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar documento en espera</DialogTitle>
            <DialogDescription>
              ¿Eliminar{' '}
              <span className="text-foreground font-medium">
                {confirmDelete?.code ??
                  (confirmDelete ? `Borrador #${confirmDelete.id}` : 'este borrador')}
              </span>
              ? Se borra el documento. No se descontó stock.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(null)}
              disabled={deleteDraftMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteConfirmed()}
              disabled={deleteDraftMutation.isPending}
            >
              {deleteDraftMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Eliminando…
                </>
              ) : (
                'Sí, eliminar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
