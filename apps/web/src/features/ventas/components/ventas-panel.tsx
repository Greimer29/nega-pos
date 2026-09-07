import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen, Loader2, Plus, Search, ShoppingCart, SlidersHorizontal } from 'lucide-react'
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
import {
  CatalogProductCard,
  catalogProductGridClassName,
} from '@/features/ventas/components/catalog-product-card'
import { VentasMaterialCard } from '@/features/ventas/components/ventas-material-card'
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
import { materialImageUrl, UNIT_ABREV } from '@/features/materials/constants'
import { useMaterialsQuery } from '@/features/materials/hooks/use-materials'
import type { Material } from '@/features/materials/types'
import { catalogImageUrl } from '@/features/ventas/constants'
import type { BillingMethod } from '@/features/ventas/constants'
import { useCatalogProductsQuery } from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { cartHasStockIssues } from '@/features/ventas/utils/product-stock'
import { materialSaleUnitPriceUsd } from '@/features/ventas/utils/material-sale-price'
import {
  clearVentasCartDraft,
  isVentasCartDraftEmpty,
  loadVentasCartDraft,
  saveVentasCartDraft,
} from '@/features/ventas/utils/ventas-cart-draft'
import {
  formatPrintErrors,
  printSaleDocumentsOnConfirm,
} from '@/features/printing/services/printing-service'
import { getSale } from '@/features/ventas/services/sales-service'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { isValidEntityId } from '@/lib/route-id'
import { normalizeInventoryQuantity } from '@/lib/inventory-units'
import { VentasPaymentMethodDialog } from '@/features/ventas/components/ventas-payment-method-dialog'
import { useCurrentSalesShiftQuery } from '@/features/ventas/hooks/use-sales-shifts'
import { SaleLineFormulaDialog } from '@/features/ventas/components/sale-line-formula-dialog'
import { SaleLineKitchenNoteDialog } from '@/features/ventas/components/sale-line-kitchen-note-dialog'
import type { PaymentMethod } from '@/features/payment-methods/types'
import {
  createCartLineId,
  formulaMaterialsSignature,
  getBaseFormulaMaterialIds,
  hasAddedMaterialsBeyondBase,
  resolveCartLineUnitPriceUsd,
  type SaleLineFormulaMaterial,
  type SaleLineFormulaMaterialRef,
} from '@/features/ventas/utils/sale-line-formula'
import { clampInvoiceDiscountUsd, invoiceTotalAfterDiscount } from '@/features/ventas/utils/invoice-discount'

type CartLine =
  | {
      id: string
      kind: 'catalog'
      product: CatalogProduct
      quantity: number
      formulaMaterials?: SaleLineFormulaMaterial[] | null
      unitPriceUsd?: number
      kitchenNote?: string | null
    }
  | {
      id: string
      kind: 'material'
      material: Material
      quantity: number
      unitPriceUsd?: number
    }

type CatalogSource = 'products' | 'materials'

function cartLineUnitPrice(line: CartLine): number {
  if (line.kind === 'material') {
    return line.unitPriceUsd ?? materialSaleUnitPriceUsd(line.material)
  }
  return line.unitPriceUsd ?? Number(line.product.sale_price_usd)
}

function normalizeDraftCartLine(
  line: NonNullable<ReturnType<typeof loadVentasCartDraft>>['cart'][number]
): CartLine | null {
  if (line.kind === 'material' && line.material) {
    return {
      id: line.id ?? createCartLineId(),
      kind: 'material',
      material: line.material,
      quantity: line.quantity,
      unitPriceUsd: line.unitPriceUsd,
    }
  }
  if (line.product) {
    return {
      id: line.id ?? createCartLineId(),
      kind: 'catalog',
      product: line.product,
      quantity: line.quantity,
      formulaMaterials: line.formulaMaterials ?? null,
      unitPriceUsd: line.unitPriceUsd,
      kitchenNote: line.kitchenNote ?? null,
    }
  }
  return null
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
  const { data: currentShift, isLoading: shiftLoading } = useCurrentSalesShiftQuery()
  const shiftOpen = Boolean(currentShift)
  const [initialDraft] = useState(() => loadVentasCartDraft())
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [catalogSource, setCatalogSource] = useState<CatalogSource>('products')
  const [customerId, setCustomerId] = useState<number | ''>(() => initialDraft?.customerId ?? '')
  const [clientName, setClientName] = useState(() =>
    initialDraft?.clientName?.trim() ? initialDraft.clientName : 'Generico'
  )
  const [customerCreditDays, setCustomerCreditDays] = useState<number | null>(
    () => initialDraft?.customerCreditDays ?? null
  )
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>(
    () => initialDraft?.paymentType ?? 'CASH'
  )
  const [billingMethod, setBillingMethod] = useState<BillingMethod>(
    () => initialDraft?.billingMethod ?? 'FAST'
  )
  const [cartOpen, setCartOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [cart, setCart] = useState<CartLine[]>(() =>
    (initialDraft?.cart ?? [])
      .map((line) => normalizeDraftCartLine(line))
      .filter((line): line is CartLine => line !== null)
  )
  const [sourceSaleId, setSourceSaleId] = useState<number | null>(
    () => initialDraft?.sourceSaleId ?? null
  )
  const [sourceSaleLabel, setSourceSaleLabel] = useState<string | null>(
    () => initialDraft?.sourceSaleLabel ?? null
  )
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerPickOpen, setCustomerPickOpen] = useState(false)
  const [loadDraftOpen, setLoadDraftOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [pendingSaleId, setPendingSaleId] = useState<number | null>(null)
  const [formulaDialogLineId, setFormulaDialogLineId] = useState<string | null>(null)
  const [kitchenNoteDialogLineId, setKitchenNoteDialogLineId] = useState<string | null>(null)
  const [invoiceDiscountUsd, setInvoiceDiscountUsd] = useState(
    () => initialDraft?.invoiceDiscountUsd ?? 0
  )
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null)
  const [editProductOpen, setEditProductOpen] = useState(false)
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
  } = useCatalogProductsQuery(
    {
      page,
      perPage: CATALOG_PER_PAGE,
      search: debouncedSearch || undefined,
      category: category || undefined,
      active: true,
      sortBy: 'most_sold',
      sortDir: 'desc',
    },
    { enabled: catalogSource === 'products' }
  )

  const {
    data: materialsData,
    isLoading: loadingMaterials,
    isError: materialsError,
    error: materialsQueryError,
  } = useMaterialsQuery(
    {
      page,
      perPage: CATALOG_PER_PAGE,
      search: debouncedSearch || undefined,
      category: category || undefined,
      status: 'active',
      sortBy: 'name',
      sortDir: 'asc',
    },
    { enabled: catalogSource === 'materials' }
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!cartOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setCartOpen(false)
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [cartOpen])

  useEffect(() => {
    if (initialDraft && !isVentasCartDraftEmpty(initialDraft)) {
      setSuccessMessage('Se restauró el borrador de venta de esta sesión.')
    }
  }, [initialDraft])

  useEffect(() => {
    const draft = {
      cart,
      customerId,
      clientName,
      customerCreditDays,
      paymentType,
      billingMethod,
      sourceSaleId,
      sourceSaleLabel,
      invoiceDiscountUsd,
    }

    if (isVentasCartDraftEmpty(draft)) {
      clearVentasCartDraft()
      return
    }

    saveVentasCartDraft(draft)
  }, [
    cart,
    customerId,
    clientName,
    customerCreditDays,
    paymentType,
    billingMethod,
    sourceSaleId,
    sourceSaleLabel,
    invoiceDiscountUsd,
  ])

  const products = catalogData?.catalog_products ?? []
  const catalogMeta = catalogData?.meta
  const materials = materialsData?.materials ?? []
  const materialsMeta = materialsData?.meta
  const activeFilterCount = category ? 1 : 0
  const cartItemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  )
  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * cartLineUnitPrice(line), 0),
    [cart]
  )
  const invoiceDiscount = clampInvoiceDiscountUsd(cartTotal, invoiceDiscountUsd)
  const payableTotal = invoiceTotalAfterDiscount(cartTotal, invoiceDiscountUsd)
  const stockBlocked = cartHasStockIssues(cart)

  const cartLines = useMemo<VentasCartLine[]>(
    () =>
      cart.map((line) => {
        if (line.kind === 'material') {
          return {
            key: line.id,
            name: line.material.name,
            code: line.material.code,
            quantity: line.quantity,
            unitPriceUsd: cartLineUnitPrice(line),
            listPriceUsd: materialSaleUnitPriceUsd(line.material),
            saleUnit: line.material.unit,
            imageUrl: line.material.imagePath ? materialImageUrl(line.material.id) : null,
            imageTone: catalogImageTone(line.material.id),
            metaLabel: UNIT_ABREV[line.material.unit] ?? line.material.unit,
          }
        }

        return {
          key: line.id,
          name: line.product.name,
          code: catalogProductCode(line.product.id),
          quantity: line.quantity,
          unitPriceUsd: cartLineUnitPrice(line),
          listPriceUsd: Number(line.product.sale_price_usd),
          saleUnit: line.product.sale_unit ?? 'UND',
          imageUrl: line.product.image_path ? catalogImageUrl(line.product.id) : null,
          imageTone: catalogImageTone(line.product.id),
          hasFormula: Boolean(line.product.formula_id),
          hasCustomFormula: line.formulaMaterials != null && line.formulaMaterials.length > 0,
          kitchenNote: line.kitchenNote ?? null,
          onAdjustFormula: line.product.formula_id
            ? () => setFormulaDialogLineId(line.id)
            : undefined,
          onEditKitchenNote: () => setKitchenNoteDialogLineId(line.id),
        }
      }),
    [cart]
  )

  const formulaDialogLine = useMemo(() => {
    const line = cart.find((item) => item.id === formulaDialogLineId) ?? null
    return line?.kind === 'catalog' ? line : null
  }, [cart, formulaDialogLineId])

  const kitchenNoteDialogLine = useMemo(() => {
    const line = cart.find((item) => item.id === kitchenNoteDialogLineId) ?? null
    return line?.kind === 'catalog' ? line : null
  }, [cart, kitchenNoteDialogLineId])

  const orderLabel = sourceSaleLabel
    ? sourceSaleLabel
    : nextCode
      ? `Factura N° ${nextCode}`
      : 'Factura nueva'

  function addToCart(product: CatalogProduct) {
    setSuccessMessage(null)
    setCart((prev) => {
      const existing = prev.find(
        (line) =>
          line.kind === 'catalog' &&
          line.product.id === product.id &&
          formulaMaterialsSignature(line.formulaMaterials) === formulaMaterialsSignature(null)
      )
      if (existing) {
        return prev.map((line) =>
          line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [
        ...prev,
        {
          id: createCartLineId(),
          kind: 'catalog' as const,
          product,
          quantity: 1,
          formulaMaterials: null,
        },
      ]
    })
  }

  function addMaterialToCart(material: Material) {
    setSuccessMessage(null)
    setCart((prev) => {
      const existing = prev.find(
        (line) => line.kind === 'material' && line.material.id === material.id
      )
      if (existing) {
        return prev.map((line) =>
          line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line
        )
      }
      return [
        ...prev,
        {
          id: createCartLineId(),
          kind: 'material' as const,
          material,
          quantity: 1,
        },
      ]
    })
  }

  function openEditProduct(product: CatalogProduct) {
    setEditProduct(product)
    setEditProductOpen(true)
  }

  function removeFromCart(lineId: string) {
    setSuccessMessage(null)
    setCart((prev) => prev.filter((item) => item.id !== lineId))
  }

  function updateCartQty(lineId: string, quantity: number) {
    setSuccessMessage(null)
    const line = cart.find((item) => item.id === lineId)
    if (!line) return

    const unit =
      line.kind === 'material' ? line.material.unit : (line.product.sale_unit ?? 'UND')

    if (quantity <= 0) {
      removeFromCart(lineId)
      return
    }

    const normalized = normalizeInventoryQuantity(quantity, unit)

    setCart((prev) =>
      prev.map((item) => (item.id === lineId ? { ...item, quantity: normalized } : item))
    )
  }

  function saveLineFormulaMaterials(
    lineId: string,
    materials: SaleLineFormulaMaterial[] | null,
    materialRefs: SaleLineFormulaMaterialRef[] = []
  ) {
    setSuccessMessage(null)
    setCart((prev) =>
      prev.map((line) => {
        if (line.id !== lineId || line.kind !== 'catalog') {
          return line
        }

        if (materials === null) {
          return {
            ...line,
            formulaMaterials: null,
          }
        }

        const baseIds = getBaseFormulaMaterialIds(line.product)
        const hasAdded = hasAddedMaterialsBeyondBase(baseIds, materials)

        return {
          ...line,
          formulaMaterials: materials,
          unitPriceUsd: hasAdded
            ? resolveCartLineUnitPriceUsd(line.product, materials, materialRefs)
            : line.unitPriceUsd,
        }
      })
    )
  }

  function updateCartUnitPrice(lineId: string, unitPriceUsd: number) {
    setSuccessMessage(null)
    setCart((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, unitPriceUsd: Math.max(0, unitPriceUsd) } : line
      )
    )
  }

  function saveLineKitchenNote(lineId: string, note: string | null) {
    setSuccessMessage(null)
    setCart((prev) =>
      prev.map((line) =>
        line.id === lineId && line.kind === 'catalog'
          ? { ...line, kitchenNote: note?.trim() ? note.trim() : null }
          : line
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
    const name = clientName.trim() || 'Generico'
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
      setClientName(draft.guestName?.trim() ? draft.guestName : 'Generico')
    }
    setPaymentType(draft.paymentType)
    setBillingMethod(draft.billingMethod)
    setSourceSaleId(draft.saleId)
    setSourceSaleLabel(draft.saleLabel)
    setInvoiceDiscountUsd(draft.invoiceDiscountUsd ?? 0)
    setSuccessMessage(`Cargaste ${draft.saleLabel} para editar.`)
  }

  function resetLoadedDraft() {
    setSourceSaleId(null)
    setSourceSaleLabel(null)
  }

  function buildSaleLines() {
    return cart.map((item) => {
      if (item.kind === 'material') {
        return {
          material_id: item.material.id,
          quantity: item.quantity,
          unit_price_usd: cartLineUnitPrice(item),
        }
      }

      return {
        catalog_product_id: item.product.id,
        quantity: item.quantity,
        unit_price_usd: cartLineUnitPrice(item),
        ...(item.kitchenNote?.trim() ? { kitchen_note: item.kitchenNote.trim() } : {}),
        ...(item.formulaMaterials && item.formulaMaterials.length > 0
          ? {
              formula_materials: item.formulaMaterials.map((material) => ({
                material_id: material.material_id,
                quantity_per_unit: material.quantity_per_unit,
              })),
            }
          : {}),
      }
    })
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
      discount_usd: invoiceDiscount,
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
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const saleId = await persistDraftSale()
      setSuccessMessage(`Borrador guardado (#${saleId}). No se descontó stock.`)
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function finalizeConfirm(
    saleId: number,
    paymentMethodCode?: string,
    paymentOptions?: { currency_code?: string; usd_rate?: number }
  ) {
    const sale = await confirmSaleMutation.mutateAsync({
      id: saleId,
      payload: {
        payment_type: paymentType,
        billing_mode: billingMethod,
        ...(paymentType === 'CASH' && paymentMethodCode
          ? {
              payment_method_code: paymentMethodCode,
              ...(paymentOptions?.currency_code
                ? { currency_code: paymentOptions.currency_code }
                : {}),
              ...(paymentOptions?.usd_rate != null
                ? { usd_rate: paymentOptions.usd_rate }
                : {}),
            }
          : {}),
      },
    })

    clearVentasCartDraft()

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
      toast.warning('Agregá al menos un producto al carrito.')
      return
    }
    if (stockBlocked) {
      toast.warning('Hay productos sin stock suficiente en el carrito.')
      return
    }

    if (paymentType === 'CREDIT') {
      if (!customerId) {
        toast.warning('El crédito solo está disponible para clientes registrados.')
        return
      }
      if (!customerCreditDays || customerCreditDays <= 0) {
        toast.warning('El cliente no tiene días de crédito configurados.')
        return
      }
    }

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
      notifyApiError(submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePaymentMethodConfirm(
    method: PaymentMethod,
    options: { currency_code: string; usd_rate?: number }
  ) {
    if (!pendingSaleId) return

    setIsSubmitting(true)

    try {
      await finalizeConfirm(pendingSaleId, method.code, options)
      setPaymentDialogOpen(false)
      setPendingSaleId(null)
    } catch (submitError) {
      notifyApiError(submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmButtonLabel =
    billingMethod === 'FAST'
      ? paymentType === 'CREDIT'
        ? 'Confirmar venta a crédito'
        : 'Confirmar venta'
      : paymentType === 'CREDIT'
        ? 'Confirmar pedido a crédito'
        : 'Confirmar pedido'

  function renderBillingCart(options?: { onClose?: () => void }) {
    return (
      <VentasOrderCart
        className="h-full min-h-0 w-full"
        orderLabel={orderLabel}
        lines={cartLines}
        subtotalUsd={cartTotal}
        discountUsd={invoiceDiscount}
        totalUsd={payableTotal}
        onClear={() => {
          setCart([])
          setInvoiceDiscountUsd(0)
          resetLoadedDraft()
          clearVentasCartDraft()
        }}
        onRemoveLine={removeFromCart}
        onUpdateQuantity={updateCartQty}
        onUpdateUnitPrice={updateCartUnitPrice}
        onUpdateInvoiceDiscount={setInvoiceDiscountUsd}
        emptyMessage="Agregá productos desde el catálogo."
        billingMethod={billingMethod}
        onBillingMethodChange={setBillingMethod}
        onClose={options?.onClose}
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
                placeholder="Generico"
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

          {canConfirmSale ? (
            <Button
              className="w-full"
              disabled={
                isSubmitting || cart.length === 0 || stockBlocked || !shiftOpen || shiftLoading
              }
              onClick={() => void confirmOrder()}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {!shiftLoading && !shiftOpen
                ? 'Abrí un turno para vender'
                : confirmButtonLabel}
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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 items-stretch gap-6 xl:grid-cols-3">
        <div className="hidden min-h-0 xl:col-span-1 xl:flex">{renderBillingCart()}</div>

        <Card className="flex h-full min-h-0 flex-col overflow-hidden border-violet-100/80 bg-gradient-to-b from-violet-50/40 to-white xl:col-span-2">
          <CardHeader className="shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <CardTitle className="text-base">
                  {catalogSource === 'products' ? 'Catálogo de productos' : 'Materiales'}
                </CardTitle>
                <CardDescription>
                  {catalogSource === 'products'
                    ? catalogMeta
                      ? `${catalogMeta.total} producto${catalogMeta.total === 1 ? '' : 's'}`
                      : 'Filtrá y agregá productos a la venta'
                    : materialsMeta
                      ? `${materialsMeta.total} material${materialsMeta.total === 1 ? '' : 'es'}`
                      : 'Filtrá y agregá materiales a la venta'}
                </CardDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="relative shrink-0 md:hidden"
                  title="Filtros"
                  aria-label="Filtros"
                  aria-expanded={filtersOpen}
                  aria-controls="ventas-catalog-filters"
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <SlidersHorizontal className="size-4" />
                  {activeFilterCount > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="relative shrink-0 xl:hidden"
                  title="Abrir carrito"
                  aria-label="Abrir carrito"
                  onClick={() => setCartOpen(true)}
                >
                  <ShoppingCart className="size-4" />
                  {cartItemCount > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-3 pt-0 sm:px-6">
            <div className="flex shrink-0 flex-col gap-3">
              <div className="bg-muted inline-flex w-fit rounded-lg p-1">
                <button
                  type="button"
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium',
                    catalogSource === 'products'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground'
                  )}
                  onClick={() => {
                    setCatalogSource('products')
                    setPage(1)
                  }}
                >
                  Productos
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium',
                    catalogSource === 'materials'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground'
                  )}
                  onClick={() => {
                    setCatalogSource('materials')
                    setPage(1)
                  }}
                >
                  Materiales
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={
                    catalogSource === 'products' ? 'Buscar producto…' : 'Buscar material…'
                  }
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="min-w-0 flex-1 bg-white md:max-w-xs"
                />
              </div>
              <div
                id="ventas-catalog-filters"
                className={cn('flex-wrap gap-3', filtersOpen ? 'flex' : 'hidden', 'md:flex')}
              >
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
            </div>

            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto pr-1">
              {catalogSource === 'products' ? (
                loadingCatalog ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="text-muted-foreground size-6 animate-spin" />
                  </div>
                ) : catalogError ? (
                  <QueryErrorState
                    isError
                    error={catalogQueryError}
                    title="No se pudo cargar el catálogo"
                  />
                ) : products.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No hay productos en el catálogo.
                  </p>
                ) : (
                  <div className={cn(catalogProductGridClassName, 'pb-1')}>
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
                )
              ) : loadingMaterials ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="text-muted-foreground size-6 animate-spin" />
                </div>
              ) : materialsError ? (
                <QueryErrorState
                  isError
                  error={materialsQueryError}
                  title="No se pudieron cargar los materiales"
                />
              ) : materials.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No hay materiales activos.
                </p>
              ) : (
                <div className={cn(catalogProductGridClassName, 'pb-1')}>
                  {materials.map((material) => (
                    <VentasMaterialCard
                      key={material.id}
                      material={material}
                      onAddToCart={addMaterialToCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {catalogSource === 'products' && catalogMeta && catalogMeta.lastPage > 1 ? (
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

            {catalogSource === 'materials' && materialsMeta && materialsMeta.lastPage > 1 ? (
              <div className="flex shrink-0 items-center justify-between gap-4 border-t pt-3">
                <p className="text-muted-foreground text-sm">
                  Página {materialsMeta.currentPage} de {materialsMeta.lastPage}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={materialsMeta.currentPage <= 1 || loadingMaterials}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      materialsMeta.currentPage >= materialsMeta.lastPage || loadingMaterials
                    }
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

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 xl:hidden',
          cartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!cartOpen}
        onClick={() => setCartOpen(false)}
      />
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 xl:hidden',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          cartOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        )}
        role="dialog"
        aria-modal={cartOpen}
        aria-label="Facturación"
      >
        <div className="min-h-0 flex-1 p-3">
          {renderBillingCart({ onClose: () => setCartOpen(false) })}
        </div>
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
        totalUsd={payableTotal}
        isSubmitting={isSubmitting}
        onConfirm={(method, options) => void handlePaymentMethodConfirm(method, options)}
      />
      <SaleLineFormulaDialog
        open={formulaDialogLineId != null}
        onOpenChange={(open) => {
          if (!open) {
            setFormulaDialogLineId(null)
          }
        }}
        product={formulaDialogLine?.product ?? null}
        initialMaterials={formulaDialogLine?.formulaMaterials}
        onSave={(result) => {
          if (formulaDialogLineId) {
            saveLineFormulaMaterials(
              formulaDialogLineId,
              result.materials,
              result.materialRefs
            )
          }
          setFormulaDialogLineId(null)
        }}
      />
      <SaleLineKitchenNoteDialog
        open={kitchenNoteDialogLineId != null}
        onOpenChange={(open) => {
          if (!open) {
            setKitchenNoteDialogLineId(null)
          }
        }}
        productName={kitchenNoteDialogLine?.product.name ?? ''}
        quantity={kitchenNoteDialogLine?.quantity ?? 0}
        initialNote={kitchenNoteDialogLine?.kitchenNote ?? ''}
        onSave={(note) => {
          if (kitchenNoteDialogLineId) {
            saveLineKitchenNote(kitchenNoteDialogLineId, note)
          }
          setKitchenNoteDialogLineId(null)
        }}
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
