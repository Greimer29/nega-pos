import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen, Loader2, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog'
import type { Customer } from '@/features/customers/types'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  useConfirmSaleMutation,
  useCreateSaleMutation,
  useNextSaleCodeQuery,
  useUpdateSaleMutation,
} from '@/features/ventas/hooks/use-sales'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import { CatalogProductCard } from '@/features/ventas/components/catalog-product-card'
import { VentasCustomerPickDialog } from '@/features/ventas/components/ventas-customer-pick-dialog'
import {
  VentasLoadDraftDialog,
  type LoadedDraft,
} from '@/features/ventas/components/ventas-load-draft-dialog'
import {
  catalogImageTone,
  catalogProductCode,
  VentasOrderCart,
  type VentasCartLine,
} from '@/features/ventas/components/ventas-order-cart'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { catalogImageUrl } from '@/features/ventas/constants'
import type { BillingMethod } from '@/features/ventas/constants'
import { useCatalogProductsQuery } from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { cartHasStockIssues } from '@/features/ventas/utils/product-stock'
import {
  formatPrintErrors,
  printSaleDocumentsOnConfirm,
} from '@/features/printing/services/printing-service'
import { getSale } from '@/features/ventas/services/sales-service'
import { getApiErrorMessage } from '@/lib/api-error'
import { isValidEntityId } from '@/lib/route-id'
import { normalizeInventoryQuantity } from '@/lib/inventory-units'
import { VentasPaymentMethodDialog } from '@/features/ventas/components/ventas-payment-method-dialog'
import type { PaymentMethod } from '@/features/payment-methods/types'

type CartLine = {
  product: CatalogProduct
  quantity: number
}

const CATALOG_PER_PAGE = 30

export function VentasPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <VentasCreateView />
    </div>
  )
}

function VentasCreateView() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canConfirmSale = can('ventas.confirm')
  const canCreditSale = can('ventas.credit')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [clientName, setClientName] = useState('')
  const [customerCreditDays, setCustomerCreditDays] = useState<number | null>(null)
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>('CASH')
  const [billingMethod, setBillingMethod] = useState<BillingMethod>('FAST')
  const [cart, setCart] = useState<CartLine[]>([])
  const [sourceSaleId, setSourceSaleId] = useState<number | null>(null)
  const [sourceSaleLabel, setSourceSaleLabel] = useState<string | null>(null)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerPickOpen, setCustomerPickOpen] = useState(false)
  const [loadDraftOpen, setLoadDraftOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [pendingSaleId, setPendingSaleId] = useState<number | null>(null)
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null)
  const [editProductOpen, setEditProductOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createSaleMutation = useCreateSaleMutation()
  const updateSaleMutation = useUpdateSaleMutation()
  const confirmSaleMutation = useConfirmSaleMutation()
  const { data: nextCode } = useNextSaleCodeQuery()
  const { data: categories = [] } = useActiveCategoriesQuery()

  const {
    data: catalogData,
    isLoading: loadingCatalog,
    isError: catalogError,
    error: catalogQueryError,
  } = useCatalogProductsQuery({
    page,
    perPage: CATALOG_PER_PAGE,
    search: debouncedSearch || undefined,
    category: category || undefined,
    active: true,
    sortBy: 'most_sold',
    sortDir: 'desc',
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const products = catalogData?.catalog_products ?? []
  const catalogMeta = catalogData?.meta
  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * Number(line.product.sale_price_usd), 0),
    [cart]
  )
  const stockBlocked = cartHasStockIssues(cart)

  const cartLines = useMemo<VentasCartLine[]>(
    () =>
      cart.map((line) => ({
        key: String(line.product.id),
        name: line.product.name,
        code: catalogProductCode(line.product.id),
        quantity: line.quantity,
        unitPriceUsd: Number(line.product.sale_price_usd),
        saleUnit: line.product.sale_unit ?? 'UND',
        imageUrl: line.product.image_path ? catalogImageUrl(line.product.id) : null,
        imageTone: catalogImageTone(line.product.id),
      })),
    [cart]
  )

  const orderLabel = sourceSaleLabel
    ? sourceSaleLabel
    : nextCode
      ? `Factura N° ${nextCode}`
      : 'Factura nueva'

  function addToCart(product: CatalogProduct) {
    setSuccessMessage(null)
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id)
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  function openEditProduct(product: CatalogProduct) {
    setEditProduct(product)
    setEditProductOpen(true)
  }

  function removeFromCart(productId: number) {
    setSuccessMessage(null)
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  function updateCartQty(productId: number, quantity: number) {
    setSuccessMessage(null)
    const line = cart.find((item) => item.product.id === productId)
    if (!line) return

    const unit = line.product.sale_unit ?? 'UND'

    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    const normalized = normalizeInventoryQuantity(quantity, unit)

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: normalized } : item
      )
    )
  }

  function linkRegisteredCustomer(
    customer: Pick<Customer, 'id' | 'name'> & { creditDays?: number | null }
  ) {
    if (!customer.id) return
    setCustomerId(customer.id)
    setClientName(customer.name)
    setCustomerCreditDays(customer.creditDays ?? null)
  }

  function handleClientNameChange(value: string) {
    setClientName(value)
    if (customerId) {
      setCustomerId('')
      setCustomerCreditDays(null)
      if (paymentType === 'CREDIT') {
        setPaymentType('CASH')
      }
    }
  }

  function buildClientPayload() {
    if (customerId) {
      return { customer_id: Number(customerId) }
    }
    const name = clientName.trim()
    if (!name) {
      throw new Error('Ingresá el nombre del cliente.')
    }
    return { guest_name: name }
  }

  function handleLoadedDraft(draft: LoadedDraft) {
    setCart(draft.cart)
    if (draft.customerId) {
      linkRegisteredCustomer({
        id: draft.customerId,
        name: draft.customerName ?? '',
        creditDays: draft.customerCreditDays,
      })
    } else {
      setCustomerId('')
      setCustomerCreditDays(null)
      setClientName(draft.guestName ?? '')
    }
    setPaymentType(draft.paymentType)
    setBillingMethod(draft.billingMethod)
    setSourceSaleId(draft.saleId)
    setSourceSaleLabel(draft.saleLabel)
    setActionError(null)
    setSuccessMessage(`Cargaste ${draft.saleLabel} para editar.`)
  }

  function resetLoadedDraft() {
    setSourceSaleId(null)
    setSourceSaleLabel(null)
  }

  function buildSaleLines() {
    return cart.map((item) => ({
      catalog_product_id: item.product.id,
      quantity: item.quantity,
      unit_price_usd: Number(item.product.sale_price_usd),
    }))
  }

  async function persistDraftSale(): Promise<number> {
    const clientPayload = buildClientPayload()
    if (cart.length === 0) {
      throw new Error('Agregá al menos un producto al carrito.')
    }

    const payload = {
      ...clientPayload,
      payment_type: paymentType,
      billing_mode: billingMethod,
      lines: buildSaleLines(),
    }

    if (sourceSaleId) {
      await updateSaleMutation.mutateAsync({ id: sourceSaleId, payload })
      return sourceSaleId
    }

    const sale = await createSaleMutation.mutateAsync(payload)
    if (!isValidEntityId(sale.id)) {
      throw new Error('No se pudo guardar el borrador: la API no devolvió un ID válido.')
    }
    setSourceSaleId(sale.id)
    setSourceSaleLabel(`Borrador #${sale.id}`)
    return sale.id
  }

  async function saveBudget() {
    setActionError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const saleId = await persistDraftSale()
      setSuccessMessage(`Borrador guardado (#${saleId}). No se descontó stock.`)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function finalizeConfirm(saleId: number, paymentMethodCode?: string) {
    const sale = await confirmSaleMutation.mutateAsync({
      id: saleId,
      payload: {
        payment_type: paymentType,
        billing_mode: billingMethod,
        payment_method_code: paymentMethodCode,
      },
    })

    try {
      const fullSale = await getSale(sale.id)
      const printResult = await printSaleDocumentsOnConfirm(fullSale)
      void navigate(`/ventas/${sale.id}`, {
        state:
          printResult.errors.length > 0
            ? { printNotice: formatPrintErrors(printResult.errors) }
            : undefined,
      })
    } catch (printError) {
      void navigate(`/ventas/${sale.id}`, {
        state: { printNotice: getApiErrorMessage(printError) },
      })
    }
  }

  async function confirmOrder() {
    if (cart.length === 0) {
      setActionError('Agregá al menos un producto al carrito.')
      return
    }
    if (stockBlocked) {
      setActionError('Hay productos sin stock suficiente en el carrito.')
      return
    }

    if (!customerId && !clientName.trim()) {
      setActionError('Ingresá el nombre del cliente o buscá uno registrado.')
      return
    }

    if (paymentType === 'CREDIT') {
      if (!customerId) {
        setActionError('El crédito solo está disponible para clientes registrados.')
        return
      }
      if (!customerCreditDays || customerCreditDays <= 0) {
        setActionError('El cliente no tiene días de crédito configurados.')
        return
      }
    }

    setActionError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const saleId = await persistDraftSale()
      if (!isValidEntityId(saleId)) {
        throw new Error('No se pudo confirmar la venta: ID de factura inválido.')
      }

      if (paymentType === 'CASH') {
        setPendingSaleId(saleId)
        setPaymentDialogOpen(true)
        return
      }

      await finalizeConfirm(saleId)
    } catch (submitError) {
      setActionError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePaymentMethodConfirm(method: PaymentMethod) {
    if (!pendingSaleId) return

    setIsSubmitting(true)
    setActionError(null)

    try {
      await finalizeConfirm(pendingSaleId, method.code)
      setPaymentDialogOpen(false)
      setPendingSaleId(null)
    } catch (submitError) {
      setActionError(getApiErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 items-stretch gap-6 xl:grid-cols-3">
        <div className="flex min-h-0 xl:col-span-1">
          <VentasOrderCart
            className="h-full min-h-0 w-full"
            orderLabel={orderLabel}
            lines={cartLines}
            subtotalUsd={cartTotal}
            totalUsd={cartTotal}
            onClear={() => {
              setCart([])
              resetLoadedDraft()
            }}
            onRemoveLine={(key) => removeFromCart(Number(key))}
            onUpdateQuantity={(key, qty) => updateCartQty(Number(key), qty)}
            emptyMessage="Agregá productos desde el catálogo."
            billingMethod={billingMethod}
            onBillingMethodChange={setBillingMethod}
            headerAction={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                title="Cargar factura"
                aria-label="Cargar factura"
                onClick={() => setLoadDraftOpen(true)}
              >
                <FolderOpen className="size-4" />
              </Button>
            }
          >
            <div className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label className="text-xs">Cliente</Label>
                <div className="flex gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    placeholder="Nombre del cliente"
                    value={clientName}
                    onChange={(e) => handleClientNameChange(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Registrar cliente"
                    aria-label="Registrar cliente"
                    onClick={() => setCustomerDialogOpen(true)}
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
                    onClick={() => setCustomerPickOpen(true)}
                  >
                    <Search className="size-4" />
                  </Button>
                </div>
                {customerId ? (
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
                      onClick={() => setPaymentType('CASH')}
                    >
                      Contado
                    </button>
                    <button
                      type="button"
                      disabled={!customerId || !canCreditSale}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium',
                        paymentType === 'CREDIT'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground',
                        (!customerId || !canCreditSale) && 'cursor-not-allowed opacity-50'
                      )}
                      onClick={() => setPaymentType('CREDIT')}
                    >
                      Crédito
                    </button>
                  </div>
                  {paymentType === 'CREDIT' && customerId ? (
                    <p className="text-muted-foreground text-xs">
                      Plazo: {customerCreditDays ?? 0} días
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title="Generar presupuesto"
                  aria-label="Generar presupuesto"
                  disabled={isSubmitting || cart.length === 0}
                  onClick={() => void saveBudget()}
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

              {successMessage ? (
                <p className="text-emerald-700 text-sm">{successMessage}</p>
              ) : null}
              {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

              {canConfirmSale ? (
                <Button
                  className="w-full"
                  disabled={isSubmitting || cart.length === 0 || stockBlocked}
                  onClick={() => void confirmOrder()}
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {billingMethod === 'FAST' ? 'Confirmar venta' : 'Confirmar pedido'}
                </Button>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  No tenés permiso para confirmar ventas.
                </p>
              )}
            </div>
          </VentasOrderCart>
        </div>

        <Card className="flex h-full min-h-0 flex-col overflow-hidden border-violet-100/80 bg-gradient-to-b from-violet-50/40 to-white xl:col-span-2">
          <CardHeader className="shrink-0">
            <CardTitle className="text-base">Catálogo de productos</CardTitle>
            <CardDescription>
              {catalogMeta
                ? `${catalogMeta.total} producto${catalogMeta.total === 1 ? '' : 's'}`
                : 'Filtrá y agregá productos a la venta'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-0">
            <div className="flex shrink-0 flex-wrap gap-3">
              <Input
                placeholder="Buscar producto…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="max-w-xs bg-white"
              />
              <select
                className="border-input flex h-9 rounded-md border bg-white px-3 text-sm"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto pr-1">
              {loadingCatalog ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="text-muted-foreground size-6 animate-spin" />
                </div>
              ) : catalogError ? (
                <p className="text-destructive py-8 text-center text-sm whitespace-pre-line">
                  {getApiErrorMessage(catalogQueryError)}
                </p>
              ) : products.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No hay productos en el catálogo.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-3 pb-1">
                  {products.map((product) => (
                    <CatalogProductCard
                      key={product.id}
                      product={product}
                      showActions
                      onEdit={openEditProduct}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {catalogMeta && catalogMeta.lastPage > 1 ? (
              <div className="flex shrink-0 items-center justify-between gap-4 border-t pt-3">
                <p className="text-muted-foreground text-sm">
                  Página {catalogMeta.currentPage} de {catalogMeta.lastPage}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={catalogMeta.currentPage <= 1 || loadingCatalog}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={catalogMeta.currentPage >= catalogMeta.lastPage || loadingCatalog}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <CustomerFormDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onCreated={linkRegisteredCustomer}
      />
      <VentasCustomerPickDialog
        open={customerPickOpen}
        onOpenChange={setCustomerPickOpen}
        onSelected={linkRegisteredCustomer}
      />
      <VentasLoadDraftDialog
        open={loadDraftOpen}
        onOpenChange={setLoadDraftOpen}
        onLoaded={handleLoadedDraft}
      />
      <VentasPaymentMethodDialog
        open={paymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open)
          if (!open) {
            setPendingSaleId(null)
          }
        }}
        totalUsd={cartTotal}
        isSubmitting={isSubmitting}
        onConfirm={(method) => void handlePaymentMethodConfirm(method)}
      />
      {editProduct ? (
        <CatalogFormDialog
          open={editProductOpen}
          onOpenChange={(open) => {
            setEditProductOpen(open)
            if (!open) {
              setEditProduct(null)
            }
          }}
          product={editProduct}
        />
      ) : null}
    </div>
  )
}
