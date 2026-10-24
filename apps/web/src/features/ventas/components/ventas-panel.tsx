import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { VentasCatalogFiltersPanel } from '@/features/ventas/components/ventas-catalog-filters-panel'
import { CustomerFormDialog } from '@/features/customers/components/customer-form-dialog'
import type { Customer } from '@/features/customers/types'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { sessionFilterKey, useSessionPersistedState } from '@/lib/session-persisted-state'
import {
  useConfirmSaleMutation,
  useCreateSaleMutation,
  useNextSaleCodeQuery,
  useUpdateSaleMutation,
} from '@/features/ventas/hooks/use-sales'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import { VentasCatalogResults } from '@/features/ventas/components/ventas-catalog-results'
import { VentasCatalogToolbar } from '@/features/ventas/components/ventas-catalog-toolbar'
import { VentasCustomerPickDialog } from '@/features/ventas/components/ventas-customer-pick-dialog'
import {
  VentasLoadDraftDialog,
  type LoadedDraft,
} from '@/features/ventas/components/ventas-load-draft-dialog'
import { VentasCheckoutPanel } from '@/features/ventas/components/ventas-checkout-panel'
import {
  SaleQuoteDialog,
  type SaleQuoteTarget,
} from '@/features/ventas/components/sale-quote-dialog'
import { useActiveCategoriesQuery } from '@/features/categories/hooks/use-categories'
import { useMaterialsQuery } from '@/features/materials/hooks/use-materials'
import type { Material } from '@/features/materials/types'
import type { BillingMethod } from '@/features/ventas/constants'
import { useCatalogProductsQuery } from '@/features/ventas/hooks/use-catalog'
import { useCatalogLayout } from '@/features/ventas/hooks/use-catalog-layout'
import type { CatalogProduct, CatalogProductSize, ConfirmSaleInput } from '@/features/ventas/types'
import { cartHasStockIssues } from '@/features/ventas/utils/product-stock'
import { productHasSizes, sizesWithStock } from '@/features/ventas/utils/product-sizes'
import { SizePickDialog } from '@/features/ventas/components/size-pick-dialog'
import { materialSaleUnitPriceUsd } from '@/features/ventas/utils/material-sale-price'
import {
  addMaterialToCartLines,
  addSimpleCatalogProductToCart,
  addSizedCatalogProductToCart,
} from '@/features/ventas/utils/ventas-cart-add'
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
import { notifyApiError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { isValidEntityId } from '@/lib/route-id'
import {
  lookupInventoryBarcode,
  lookupMaterialByBarcode,
  lookupProductByBarcode,
  normalizeBarcodeInput,
} from '@/lib/barcode-scan'
import { VentasPaymentMethodDialog } from '@/features/ventas/components/ventas-payment-method-dialog'
import { useCurrentSalesShiftQuery } from '@/features/ventas/hooks/use-sales-shifts'
import { useOfflinePos } from '@/features/offline/use-offline-pos'
import {
  applyLocalStockDeduction,
  mapOfflineMaterials,
  mapOfflineProducts,
} from '@/features/offline/map-offline-catalog'
import { writeOfflineCatalogSnapshot } from '@/features/offline/offline-storage'
import { getElectronPrintingApi, isElectronPrintingAvailable } from '@/lib/electron-bridge'
import { SaleLineFormulaDialog } from '@/features/ventas/components/sale-line-formula-dialog'
import { SaleLineKitchenNoteDialog } from '@/features/ventas/components/sale-line-kitchen-note-dialog'
import { ServiceLineDialog } from '@/features/ventas/components/service-line-dialog'
import {
  createCartLineId,
  type SaleLineFormulaMaterial,
  type SaleLineFormulaMaterialRef,
} from '@/features/ventas/utils/sale-line-formula'
import {
  clampInvoiceDiscountUsd,
  invoiceTotalAfterDiscount,
} from '@/features/ventas/utils/invoice-discount'
import {
  buildSaleDraftPayload,
  buildSaleLines,
  finalizeSaleConfirmation,
  persistSaleDraft,
} from '@/features/ventas/utils/sales-checkout'
import {
  cartLineUnitPrice,
  normalizeDraftCartLine,
  type CartLine,
} from '@/features/ventas/utils/ventas-cart-lines'
import {
  removeCartLine,
  setCartLineFormulaMaterials,
  setCartLineKitchenNote,
  setCartLineQuantity,
  setCartLineUnitPrice,
  toggleCartLineWholesale,
  updateServiceCartLine,
} from '@/features/ventas/utils/ventas-cart-edit'
import { buildVentasCartLines } from '@/features/ventas/utils/ventas-cart-view'
import {
  DEFAULT_VENTAS_CATALOG_FILTERS,
  defaultSortForSource,
  filterCatalogByPrice,
  getCatalogPriceBounds,
  getCatalogSizeOptions,
} from '@/features/ventas/utils/ventas-catalog'

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
  const { can, company } = useAuth()
  const canConfirmSale = can('ventas.confirm')
  const canCreditSale = can('ventas.credit')
  const { data: currentShift, isLoading: shiftLoading } = useCurrentSalesShiftQuery()
  const {
    offlineEnabled,
    connectivity,
    catalog: offlineCatalog,
    canSellOffline,
    syncMessage,
    clearSyncMessage,
    persistOfflineSale,
  } = useOfflinePos({ salesShiftId: currentShift ? Number(currentShift.id) : null })
  const shiftOpen = Boolean(currentShift) || canSellOffline
  const [initialDraft] = useState(() => loadVentasCartDraft())
  const [catalogFilters, setCatalogFilters] = useSessionPersistedState(
    sessionFilterKey('ventas-catalog', company?.id),
    DEFAULT_VENTAS_CATALOG_FILTERS
  )
  const [searchInput, setSearchInput] = useState(catalogFilters.search)
  const { layout, toggleLayout } = useCatalogLayout()
  const [sizeFilter, setSizeFilter] = useState(catalogFilters.size)
  const [minPriceInput, setMinPriceInput] = useState(catalogFilters.minPrice)
  const [maxPriceInput, setMaxPriceInput] = useState(catalogFilters.maxPrice)
  const catalogSource = catalogFilters.source
  const category = catalogFilters.category
  const page = catalogFilters.page
  const sortBy = catalogFilters.sortBy ?? defaultSortForSource(catalogSource)
  const [sizePickProduct, setSizePickProduct] = useState<CatalogProduct | null>(null)
  const [sizePickOpen, setSizePickOpen] = useState(false)
  const [quoteTarget, setQuoteTarget] = useState<SaleQuoteTarget | null>(null)
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
  const [servicePickProduct, setServicePickProduct] = useState<CatalogProduct | null>(null)
  const [servicePickOpen, setServicePickOpen] = useState(false)
  const [serviceEditLineId, setServiceEditLineId] = useState<string | null>(null)
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
      search: catalogFilters.barcode ? undefined : catalogFilters.search || undefined,
      barcode: catalogFilters.barcode || undefined,
      category: category || undefined,
      size: catalogFilters.size || undefined,
      active: true,
      itemKind: 'PRODUCT',
      sortBy: sortBy === 'name' ? 'name' : 'most_sold',
      sortDir: sortBy === 'name' ? 'asc' : 'desc',
    },
    { enabled: catalogSource === 'products' }
  )

  const {
    data: servicesData,
    isLoading: loadingServices,
    isError: servicesError,
    error: servicesQueryError,
  } = useCatalogProductsQuery(
    {
      page,
      perPage: CATALOG_PER_PAGE,
      search: catalogFilters.search || undefined,
      category: category || undefined,
      active: true,
      itemKind: 'SERVICE',
      sortBy: 'name',
      sortDir: 'asc',
    },
    { enabled: catalogSource === 'services' }
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
      search: catalogFilters.barcode ? undefined : catalogFilters.search || undefined,
      barcode: catalogFilters.barcode || undefined,
      category: category || undefined,
      status: 'active',
      sortBy: sortBy === 'most_sold' ? 'most_used' : 'name',
      sortDir: sortBy === 'most_sold' ? 'desc' : 'asc',
    },
    { enabled: catalogSource === 'materials' }
  )

  useEffect(() => {
    setSearchInput(catalogFilters.search)
  }, [catalogFilters.search])

  useEffect(() => {
    setSizeFilter(catalogFilters.size)
  }, [catalogFilters.size])

  useEffect(() => {
    setMinPriceInput(catalogFilters.minPrice ?? '')
  }, [catalogFilters.minPrice])

  useEffect(() => {
    setMaxPriceInput(catalogFilters.maxPrice ?? '')
  }, [catalogFilters.maxPrice])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCatalogFilters((prev) => {
        if ((prev.minPrice ?? '') === minPriceInput && (prev.maxPrice ?? '') === maxPriceInput) {
          return prev
        }
        return { ...prev, minPrice: minPriceInput, maxPrice: maxPriceInput, page: 1 }
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [minPriceInput, maxPriceInput, setCatalogFilters])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      setCatalogFilters((prev) => {
        if (!nextSearch) {
          if (!prev.search && !prev.barcode) return prev
          return { ...prev, search: '', barcode: '', page: 1 }
        }
        if (prev.barcode && nextSearch === prev.barcode) {
          return prev
        }
        return {
          ...prev,
          search: nextSearch,
          barcode: '',
          page: nextSearch === prev.search ? prev.page : 1,
        }
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput, setCatalogFilters])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSize = sizeFilter.trim()
      setCatalogFilters((prev) => ({
        ...prev,
        size: nextSize,
        page: nextSize === prev.size ? prev.page : 1,
      }))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [sizeFilter, setCatalogFilters])

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

  const offlineProducts = useMemo(
    () =>
      canSellOffline && offlineCatalog
        ? mapOfflineProducts(offlineCatalog, {
            itemKind: 'PRODUCT',
            search: catalogFilters.search || undefined,
            category: category || undefined,
          })
        : null,
    [canSellOffline, offlineCatalog, catalogFilters.search, category]
  )
  const offlineServices = useMemo(
    () =>
      canSellOffline && offlineCatalog
        ? mapOfflineProducts(offlineCatalog, {
            itemKind: 'SERVICE',
            search: catalogFilters.search || undefined,
            category: category || undefined,
          })
        : null,
    [canSellOffline, offlineCatalog, catalogFilters.search, category]
  )
  const offlineMaterials = useMemo(
    () =>
      canSellOffline && offlineCatalog
        ? mapOfflineMaterials(offlineCatalog, {
            search: catalogFilters.search || undefined,
          })
        : null,
    [canSellOffline, offlineCatalog, catalogFilters.search]
  )

  const productsRaw = offlineProducts ?? catalogData?.catalog_products ?? []
  const catalogMeta = offlineProducts
    ? {
        total: offlineProducts.length,
        perPage: offlineProducts.length,
        currentPage: 1,
        lastPage: 1,
        firstPage: 1,
      }
    : catalogData?.meta
  const servicesRaw = offlineServices ?? servicesData?.catalog_products ?? []
  const servicesMeta = offlineServices
    ? {
        total: offlineServices.length,
        perPage: offlineServices.length,
        currentPage: 1,
        lastPage: 1,
        firstPage: 1,
      }
    : servicesData?.meta
  const materialsRaw = offlineMaterials ?? materialsData?.materials ?? []
  const materialsMeta = offlineMaterials
    ? {
        total: offlineMaterials.length,
        perPage: offlineMaterials.length,
        currentPage: 1,
        lastPage: 1,
        firstPage: 1,
      }
    : materialsData?.meta

  useEffect(() => {
    if (syncMessage) {
      setSuccessMessage(syncMessage)
      clearSyncMessage()
    }
  }, [syncMessage, clearSyncMessage])

  const priceBounds = useMemo(() => {
    if (catalogSource === 'materials') {
      return getCatalogPriceBounds(materialsRaw, materialSaleUnitPriceUsd)
    }
    return getCatalogPriceBounds(catalogSource === 'products' ? productsRaw : servicesRaw, (item) =>
      Number(item.sale_price_usd)
    )
  }, [catalogSource, productsRaw, servicesRaw, materialsRaw])

  const products = useMemo(() => {
    return filterCatalogByPrice(
      productsRaw,
      catalogFilters.minPrice,
      catalogFilters.maxPrice,
      (item) => Number(item.sale_price_usd)
    )
  }, [productsRaw, catalogFilters.minPrice, catalogFilters.maxPrice])

  const services = useMemo(() => {
    return filterCatalogByPrice(
      servicesRaw,
      catalogFilters.minPrice,
      catalogFilters.maxPrice,
      (item) => Number(item.sale_price_usd)
    )
  }, [servicesRaw, catalogFilters.minPrice, catalogFilters.maxPrice])

  const materials = useMemo(() => {
    return filterCatalogByPrice(
      materialsRaw,
      catalogFilters.minPrice,
      catalogFilters.maxPrice,
      materialSaleUnitPriceUsd
    )
  }, [materialsRaw, catalogFilters.minPrice, catalogFilters.maxPrice])

  const sizeOptions = useMemo(() => getCatalogSizeOptions(productsRaw), [productsRaw])

  const defaultSort = defaultSortForSource(catalogSource)
  const activeFilterCount =
    (category ? 1 : 0) +
    (sizeFilter.trim() ? 1 : 0) +
    (sortBy !== defaultSort ? 1 : 0) +
    (catalogFilters.minPrice.trim() || catalogFilters.maxPrice.trim() ? 1 : 0)

  function clearCatalogFilters() {
    setSearchInput('')
    setSizeFilter('')
    setMinPriceInput('')
    setMaxPriceInput('')
    setCatalogFilters((prev) => ({
      ...prev,
      search: '',
      barcode: '',
      category: '',
      size: '',
      sortBy: defaultSortForSource(prev.source),
      minPrice: '',
      maxPrice: '',
      page: 1,
    }))
  }

  function renderFiltersPanel() {
    return (
      <VentasCatalogFiltersPanel
        catalogSource={catalogSource}
        categories={categories}
        category={category}
        onCategoryChange={(value) => {
          setCatalogFilters((prev) => ({ ...prev, category: value, page: 1 }))
        }}
        sortBy={sortBy}
        onSortByChange={(value) => {
          setCatalogFilters((prev) => ({ ...prev, sortBy: value, page: 1 }))
        }}
        sizeFilter={sizeFilter}
        onSizeFilterChange={setSizeFilter}
        sizeOptions={sizeOptions}
        minPrice={minPriceInput}
        maxPrice={maxPriceInput}
        onMinPriceChange={setMinPriceInput}
        onMaxPriceChange={setMaxPriceInput}
        priceBounds={priceBounds}
        onClearAll={clearCatalogFilters}
      />
    )
  }
  const cartItemCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart])
  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity * cartLineUnitPrice(line), 0),
    [cart]
  )
  const invoiceDiscount = clampInvoiceDiscountUsd(cartTotal, invoiceDiscountUsd)
  const payableTotal = invoiceTotalAfterDiscount(cartTotal, invoiceDiscountUsd)
  const stockBlocked = cartHasStockIssues(cart)

  const cartLines = useMemo(
    () =>
      buildVentasCartLines(cart, {
        onToggleWholesale: toggleCartWholesale,
        onAdjustFormula: setFormulaDialogLineId,
        onEditKitchenNote: setKitchenNoteDialogLineId,
        onEditDetail: setServiceEditLineId,
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

  const serviceEditLine = useMemo(() => {
    const line = cart.find((item) => item.id === serviceEditLineId) ?? null
    return line?.kind === 'catalog' ? line : null
  }, [cart, serviceEditLineId])

  const orderLabel = sourceSaleLabel
    ? sourceSaleLabel
    : nextCode
      ? `Factura N° ${nextCode}`
      : 'Factura nueva'

  function addSizedProductToCart(product: CatalogProduct, size: CatalogProductSize) {
    setSuccessMessage(null)
    setCart((prev) =>
      addSizedCatalogProductToCart(prev, product, size, () => ({
        id: createCartLineId(),
        kind: 'catalog' as const,
        product,
        quantity: 1,
        formulaMaterials: null,
        catalogProductSizeId: size.id,
        size: size.size,
      }))
    )
  }

  function addToCart(product: CatalogProduct) {
    if (product.item_kind === 'SERVICE' || product.is_service) {
      setServicePickProduct(product)
      setServicePickOpen(true)
      return
    }

    if (productHasSizes(product)) {
      const available = sizesWithStock(product)
      if (available.length === 0) {
        toast.error('Este producto no tiene tallas con stock.')
        return
      }
      setSizePickProduct(product)
      setSizePickOpen(true)
      return
    }

    setSuccessMessage(null)
    setCart((prev) =>
      addSimpleCatalogProductToCart(prev, product, () => ({
        id: createCartLineId(),
        kind: 'catalog' as const,
        product,
        quantity: 1,
        formulaMaterials: null,
        catalogProductSizeId: null,
        size: null,
      }))
    )
  }

  function addServiceToCart(values: {
    quantity: number
    unitPriceUsd: number
    detail: string | null
  }) {
    if (!servicePickProduct) return
    setSuccessMessage(null)
    setCart((prev) => [
      ...prev,
      {
        id: createCartLineId(),
        kind: 'catalog' as const,
        product: servicePickProduct,
        quantity: values.quantity,
        unitPriceUsd: values.unitPriceUsd,
        detail: values.detail,
        formulaMaterials: null,
        catalogProductSizeId: null,
        size: null,
      },
    ])
  }

  function saveServiceLineEdit(values: {
    quantity: number
    unitPriceUsd: number
    detail: string | null
  }) {
    if (!serviceEditLineId) return
    setSuccessMessage(null)
    setCart((prev) => updateServiceCartLine(prev, serviceEditLineId, values))
  }

  function addMaterialToCart(material: Material) {
    setSuccessMessage(null)
    setCart((prev) =>
      addMaterialToCartLines(prev, material, () => ({
        id: createCartLineId(),
        kind: 'material' as const,
        material,
        quantity: 1,
      }))
    )
  }

  async function filterCatalogByBarcode(rawCode: string) {
    const code = normalizeBarcodeInput(rawCode)
    if (!code) return

    try {
      if (catalogSource === 'products') {
        const product = await lookupProductByBarcode(code)
        if (!product) {
          toast.error('Código no encontrado')
          return
        }
        setSearchInput(code)
        setCatalogFilters((prev) => ({
          ...prev,
          search: code,
          barcode: code,
          page: 1,
        }))
        return
      }

      if (catalogSource === 'materials') {
        const material = await lookupMaterialByBarcode(code)
        if (!material) {
          toast.error('Código no encontrado')
          return
        }
        setSearchInput(code)
        setCatalogFilters((prev) => ({
          ...prev,
          search: code,
          barcode: code,
          page: 1,
        }))
        return
      }

      toast.error('Código no encontrado')
    } catch (error) {
      notifyApiError(error)
    }
  }

  async function addToCartByBarcode(rawCode: string) {
    const code = normalizeBarcodeInput(rawCode)
    if (!code) return

    try {
      const hit = await lookupInventoryBarcode(code)
      if (!hit) {
        toast.error('Código no encontrado')
        return
      }
      if (hit.kind === 'product') {
        addToCart(hit.product)
        return
      }
      addMaterialToCart(hit.material)
    } catch (error) {
      notifyApiError(error)
    }
  }

  function openEditProduct(product: CatalogProduct) {
    setEditProduct(product)
    setEditProductOpen(true)
  }

  function removeFromCart(lineId: string) {
    setSuccessMessage(null)
    setCart((prev) => removeCartLine(prev, lineId))
  }

  function updateCartQty(lineId: string, quantity: number) {
    setSuccessMessage(null)
    setCart((prev) => setCartLineQuantity(prev, lineId, quantity))
  }

  function saveLineFormulaMaterials(
    lineId: string,
    materials: SaleLineFormulaMaterial[] | null,
    materialRefs: SaleLineFormulaMaterialRef[],
    baseMaterialIds: number[]
  ) {
    setSuccessMessage(null)
    setCart((prev) =>
      setCartLineFormulaMaterials(prev, lineId, materials, materialRefs, baseMaterialIds)
    )
  }

  function toggleCartWholesale(lineId: string, checked: boolean) {
    setSuccessMessage(null)
    setCart((prev) => toggleCartLineWholesale(prev, lineId, checked))
  }

  function updateCartUnitPrice(lineId: string, unitPriceUsd: number) {
    setSuccessMessage(null)
    setCart((prev) => setCartLineUnitPrice(prev, lineId, unitPriceUsd))
  }

  function saveLineKitchenNote(lineId: string, note: string | null) {
    setSuccessMessage(null)
    setCart((prev) => setCartLineKitchenNote(prev, lineId, note))
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

  function clearLocalCart() {
    setCart([])
    setInvoiceDiscountUsd(0)
    resetLoadedDraft()
    clearVentasCartDraft()
  }

  /** Leaves the POS ready for the next customer (keeps the Rápido / Pedido mode). */
  function startNewInvoice() {
    clearLocalCart()
    setCustomerId('')
    setCustomerCreditDays(null)
    setClientName('Generico')
    setPaymentType('CASH')
  }

  async function persistDraftSale(): Promise<number> {
    const payload = buildSaleDraftPayload({
      cart,
      client: buildClientPayload(),
      paymentType,
      billingMode: billingMethod,
      discountUsd: invoiceDiscount,
    })

    return persistSaleDraft({
      sourceSaleId,
      payload,
      updateSale: (id, salePayload) => updateSaleMutation.mutateAsync({ id, payload: salePayload }),
      createSale: (salePayload) => createSaleMutation.mutateAsync(salePayload),
      onCreated: (saleId) => {
        setSourceSaleId(saleId)
        setSourceSaleLabel(`Borrador #${saleId}`)
      },
    })
  }

  async function saveBudget() {
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const saleId = await persistDraftSale()
      setQuoteTarget({ saleId, customerName: clientName.trim() || null })
      startNewInvoice()
      setSuccessMessage(
        `Presupuesto N° ${saleId} guardado. No se descontó stock; podés retomarlo desde Cargar factura.`
      )
    } catch (error) {
      notifyApiError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function finalizeConfirm(saleId: number, payload: ConfirmSaleInput = {}) {
    await finalizeSaleConfirmation({
      saleId,
      paymentType,
      billingMode: billingMethod,
      payload: {
        ...payload,
      },
      confirmSale: (id, confirmPayload) =>
        confirmSaleMutation.mutateAsync({ id, payload: confirmPayload }),
      clearDraft: clearVentasCartDraft,
      getSale,
      printSale: printSaleDocumentsOnConfirm,
      formatPrintErrors,
      getPrintErrorMessage: getApiErrorMessage,
      onNavigate: (confirmedSaleId, printNotice) => {
        void navigate(`/ventas/${confirmedSaleId}`, {
          state: printNotice ? { printNotice } : undefined,
        })
      },
    })
  }

  async function printOfflineTicket(localRef: string, totalUsd: number) {
    if (!isElectronPrintingAvailable()) {
      return
    }
    const printing = getElectronPrintingApi()
    if (!printing) {
      return
    }
    try {
      const printers = await printing.listPrinters()
      const deviceName = printers.find((printer) => printer.isDefault)?.name ?? printers[0]?.name
      if (!deviceName) {
        return
      }
      const html = `<html><body style="font-family:monospace;font-size:12px">
        <h3>Venta sin conexión</h3>
        <p>Ref: ${localRef}</p>
        <p>Total USD: ${totalUsd.toFixed(2)}</p>
        <p>Se sincronizará al recuperar la red.</p>
      </body></html>`
      await printing.printHtml({ html, deviceName, jobName: `Offline ${localRef}` })
    } catch {
      // Ticket local is best-effort.
    }
  }

  async function finalizeOfflineConfirm(payments?: ConfirmSaleInput['payments']) {
    if (!canSellOffline) {
      if (offlineEnabled) {
        throw new Error(
          'Sin conexión y sin copia local del catálogo. Abrí el POS con internet al menos una vez.'
        )
      }
      throw new Error('La venta sin conexión no está habilitada para esta empresa.')
    }

    const lines = buildSaleLines(cart)
    const { localRef } = await persistOfflineSale({
      customerId: customerId === '' ? null : Number(customerId),
      guestName: clientName.trim() || null,
      paymentType,
      billingMode: billingMethod,
      discountUsd: invoiceDiscount,
      lines,
      payments,
      salesShiftId: currentShift ? Number(currentShift.id) : null,
    })

    if (offlineCatalog) {
      const updated = applyLocalStockDeduction(offlineCatalog, lines)
      await writeOfflineCatalogSnapshot(updated)
    }

    clearLocalCart()
    setSuccessMessage(`Venta guardada sin conexión (${localRef}). Se subirá al recuperar la red.`)
    await printOfflineTicket(localRef, payableTotal)
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
      if (canSellOffline) {
        if (paymentType === 'CASH') {
          setPendingSaleId(-1)
          setPaymentDialogOpen(true)
          return
        }
        await finalizeOfflineConfirm()
        return
      }

      if (connectivity === 'offline' && offlineEnabled && !offlineCatalog) {
        toast.warning(
          'Sin conexión y sin copia local. Abrí el POS con internet al menos una vez para vender offline.'
        )
        return
      }

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

  async function handlePaymentMethodConfirm(payments: ConfirmSaleInput['payments']) {
    if (pendingSaleId === null) return

    setIsSubmitting(true)

    try {
      if (pendingSaleId === -1 || canSellOffline) {
        await finalizeOfflineConfirm(payments)
      } else {
        await finalizeConfirm(pendingSaleId, { payments })
      }
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
      <VentasCheckoutPanel
        orderLabel={orderLabel}
        lines={cartLines}
        subtotalUsd={cartTotal}
        discountUsd={invoiceDiscount}
        totalUsd={payableTotal}
        billingMethod={billingMethod}
        paymentType={paymentType}
        customerName={clientName}
        customerLinked={Boolean(customerId)}
        customerCreditDays={customerCreditDays}
        canCreditSale={canCreditSale}
        canConfirmSale={canConfirmSale}
        isSubmitting={isSubmitting}
        stockBlocked={stockBlocked}
        successMessage={successMessage}
        shiftOpen={shiftOpen}
        shiftLoading={shiftLoading}
        confirmButtonLabel={confirmButtonLabel}
        onClear={clearLocalCart}
        onRemoveLine={removeFromCart}
        onUpdateQuantity={updateCartQty}
        onUpdateUnitPrice={updateCartUnitPrice}
        onUpdateInvoiceDiscount={setInvoiceDiscountUsd}
        onBillingMethodChange={setBillingMethod}
        onPaymentTypeChange={setPaymentType}
        onCustomerNameChange={handleClientNameChange}
        onScanBarcode={(code) => void addToCartByBarcode(code)}
        onLoadDraft={() => setLoadDraftOpen(true)}
        onRegisterCustomer={() => setCustomerDialogOpen(true)}
        onFindCustomer={() => setCustomerPickOpen(true)}
        onSaveBudget={() => void saveBudget()}
        onConfirm={() => void confirmOrder()}
        onClose={options?.onClose}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 items-stretch gap-6 xl:grid-cols-3">
        <div className="hidden min-h-0 xl:col-span-1 xl:flex">{renderBillingCart()}</div>

        <Card className="flex h-full min-h-0 flex-col overflow-hidden border-violet-100/80 bg-gradient-to-b from-violet-50/40 to-white xl:col-span-2">
          <VentasCatalogToolbar
            source={catalogSource}
            description={
              catalogSource === 'products'
                ? catalogMeta
                  ? `${catalogMeta.total} producto${catalogMeta.total === 1 ? '' : 's'}`
                  : 'Filtrá y agregá productos a la venta'
                : catalogSource === 'services'
                  ? servicesMeta
                    ? `${servicesMeta.total} servicio${servicesMeta.total === 1 ? '' : 's'}`
                    : 'Filtrá y agregá servicios a la venta'
                  : materialsMeta
                    ? `${materialsMeta.total} material${materialsMeta.total === 1 ? '' : 'es'}`
                    : 'Filtrá y agregá materiales a la venta'
            }
            offlineEnabled={offlineEnabled}
            connectivity={connectivity}
            canSellOffline={canSellOffline}
            cartItemCount={cartItemCount}
            layout={layout}
            searchInput={searchInput}
            activeFilterCount={activeFilterCount}
            filtersOpen={filtersOpen}
            filterPanel={renderFiltersPanel()}
            onSourceChange={(source) =>
              setCatalogFilters((prev) => ({
                ...prev,
                source,
                sortBy: defaultSortForSource(source),
                page: 1,
              }))
            }
            onSearchChange={setSearchInput}
            onSearchEnter={(search) => {
              if (catalogSource === 'services') return
              const code = search.trim()
              if (code) void filterCatalogByBarcode(code)
            }}
            onToggleLayout={toggleLayout}
            onOpenFilters={() => setFiltersOpen(true)}
            onFiltersOpenChange={setFiltersOpen}
            onScanBarcode={(code) => void filterCatalogByBarcode(code)}
            onOpenCart={() => setCartOpen(true)}
          />
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-3 pt-0 sm:px-6">
            <VentasCatalogResults
              source={catalogSource}
              layout={layout}
              products={products}
              services={services}
              materials={materials}
              productsMeta={catalogMeta}
              servicesMeta={servicesMeta}
              materialsMeta={materialsMeta}
              loadingProducts={loadingCatalog}
              productsError={catalogError}
              productsQueryError={catalogQueryError}
              loadingServices={loadingServices}
              servicesError={servicesError}
              servicesQueryError={servicesQueryError}
              loadingMaterials={loadingMaterials}
              materialsError={materialsError}
              materialsQueryError={materialsQueryError}
              onEditProduct={openEditProduct}
              onAddProduct={addToCart}
              onAddMaterial={addMaterialToCart}
              onPageChange={(page) =>
                setCatalogFilters((prev) => ({
                  ...prev,
                  page,
                }))
              }
            />
          </CardContent>
        </Card>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 xl:hidden md:left-56',
          cartOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!cartOpen}
        onClick={() => setCartOpen(false)}
      />
      <div
        className={cn(
          'fixed inset-y-0 left-0 right-0 z-50 flex flex-col bg-white shadow-xl transition-transform duration-300 xl:hidden md:left-56',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          cartOpen ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        )}
        role="dialog"
        aria-modal={cartOpen}
        aria-label="Facturación"
      >
        <div className="flex h-full min-h-0 w-full flex-col p-3">
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
      <SaleQuoteDialog
        quote={quoteTarget}
        onOpenChange={(open) => {
          if (!open) setQuoteTarget(null)
        }}
      />
      <VentasLoadDraftDialog
        open={loadDraftOpen}
        onOpenChange={setLoadDraftOpen}
        onLoaded={handleLoadedDraft}
        onDeleted={(saleId) => {
          if (sourceSaleId === saleId) {
            clearLocalCart()
          }
        }}
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
        onConfirm={(payments) => void handlePaymentMethodConfirm(payments)}
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
              result.materialRefs,
              result.baseMaterialIds
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
      <ServiceLineDialog
        open={servicePickOpen}
        onOpenChange={(open) => {
          setServicePickOpen(open)
          if (!open) {
            setServicePickProduct(null)
          }
        }}
        service={servicePickProduct}
        mode="add"
        onConfirm={addServiceToCart}
      />
      <ServiceLineDialog
        open={serviceEditLineId != null}
        onOpenChange={(open) => {
          if (!open) {
            setServiceEditLineId(null)
          }
        }}
        service={serviceEditLine?.product ?? null}
        mode="edit"
        initialQuantity={serviceEditLine?.quantity ?? 1}
        initialUnitPriceUsd={serviceEditLine ? cartLineUnitPrice(serviceEditLine) : undefined}
        initialDetail={serviceEditLine?.detail ?? ''}
        onConfirm={saveServiceLineEdit}
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
      <SizePickDialog
        open={sizePickOpen}
        product={sizePickProduct}
        onOpenChange={(open) => {
          setSizePickOpen(open)
          if (!open) {
            setSizePickProduct(null)
          }
        }}
        onPick={(size) => {
          if (sizePickProduct) {
            addSizedProductToCart(sizePickProduct, size)
          }
        }}
      />
    </div>
  )
}
