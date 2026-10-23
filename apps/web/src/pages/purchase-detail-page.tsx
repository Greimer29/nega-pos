import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DecimalInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmarPurchaseDialog } from '@/features/purchases/components/confirm-purchase-dialog'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { PurchasePaymentFormDialog } from '@/features/purchases/components/purchase-payment-form-dialog'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import {
  useActiveCurrenciesQuery,
  useBaseCurrencyQuery,
} from '@/features/currencies/hooks/use-currencies'
import { currencySymbol } from '@/features/currencies/utils/convert-currency'
import { PrecioEnMonedaIngreso } from '@/features/purchases/components/purchase-entry-price'
import { PurchaseConfirmedItemRow } from '@/features/purchases/components/purchase-detail/purchase-confirmed-item-row'
import { PurchaseDraftItemRow } from '@/features/purchases/components/purchase-detail/purchase-draft-item-row'
import { PurchaseItemAddToolbar } from '@/features/purchases/components/purchase-detail/purchase-item-add-toolbar'
import { PurchaseEntryCurrencyToggle } from '@/features/purchases/components/purchase-entry-currency-toggle'
import {
  buildPurchaseItemPayload,
  entryRateLabel,
  formatItemNativeDisplay,
  inferPurchaseEntryCurrency,
  isPurchaseEntryInNative,
  isValidPurchaseRate,
  nativeToUsd,
  purchaseEntryDecimals,
  subtotalColumnLabel,
  type PurchaseEntryCurrency,
  unitPriceColumnLabel,
} from '@/features/purchases/utils/purchase-entry-currency'
import { ESTADO_LABELS, formatFecha } from '@/features/purchases/constants'
import {
  useCreatePurchaseItemMutation,
  useDeletePurchaseItemMutation,
  useDeletePurchaseMutation,
  usePurchaseQuery,
  useUpdatePurchaseItemMutation,
  useUploadFacturaMutation,
  useUpdatePurchaseMutation,
} from '@/features/purchases/hooks/use-purchases'
import { useExchangeRateQuery } from '@/features/purchases/hooks/use-settings'
import { downloadFactura } from '@/features/purchases/services/purchase-service'
import type { LocalPurchaseItem } from '@/features/purchases/types'
import { PurchaseMachineFormDialog } from '@/features/purchases/components/purchase-machine-form-dialog'
import type { Machine } from '@/features/machines/types'
import { MaterialFormDialog } from '@/features/materials/components/material-form-dialog'
import { getMaterial } from '@/features/materials/services/material-service'
import type { Material } from '@/features/materials/types'
import type { CatalogProduct } from '@/features/ventas/types'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import { getCatalogProduct } from '@/features/ventas/services/catalog-service'
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers'
import { supplierImageUrl } from '@/features/suppliers/constants'
import { PublicImage } from '@/components/public-image'
import { notifyApiError } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'
import {
  lookupMaterialByBarcode,
  lookupProductByBarcode,
} from '@/lib/barcode-scan'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { addLocalDaysIsoDate, todayLocalIsoDate } from '@/lib/format-date'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import { cn } from '@/lib/utils'
import {
  formatRateInput,
  localItemCanWholesale,
  materialToSummary,
  parseDbItemId,
  purchaseItemToLocal,
  resolveEntryRateInput,
  wholesaleTogglePriceUsd,
} from '@/features/purchases/utils/purchase-local-items'
import { pageHeaderClass, toolbarHeaderClass } from '@/components/layout/responsive-toolbar'

export function PurchaseDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { can } = useAuth()
  const canEditPurchase = can('purchases.edit')
  const { id: purchaseId, isValid: isValidPurchaseId } = parsePositiveIntRouteParam(id)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [localItems, setLocalItems] = useState<LocalPurchaseItem[]>([])
  const [syncedPurchaseId, setSyncedPurchaseId] = useState<number | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [usdRate, setUsdRate] = useState('')
  const [notes, setNotes] = useState('')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [isCredit, setIsCredit] = useState(false)
  const [creditDueDate, setCreditDueDate] = useState('')
  const [hasLocalChanges, setHasLocalChanges] = useState(false)
  const [entryCurrency, setEntryCurrency] = useState<PurchaseEntryCurrency>('XAU')
  const itemSaveTimers = useRef<Map<string, number>>(new Map())
  const itemNativeEntryRef = useRef<Map<string, number>>(new Map())
  const entryCurrencyRef = useRef<PurchaseEntryCurrency>('XAU')
  const usdRateRef = useRef('')
  const localItemsRef = useRef<LocalPurchaseItem[]>([])
  const persistItemNowRef = useRef<(purchaseId: number, localId: string) => void>(() => {})

  const [itemAddMode, setItemAddMode] = useState<'material' | 'product' | 'machine'>('material')

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [machineDialogOpen, setMachineDialogOpen] = useState(false)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null)
  const { data: purchase, isLoading, isError, error } = usePurchaseQuery(purchaseId)
  const { data: globalRate } = useExchangeRateQuery()
  const { data: activeCurrencies = [] } = useActiveCurrenciesQuery()
  const { data: baseCurrencyCode = 'XAU' } = useBaseCurrencyQuery()
  const { data: suppliersData } = useSuppliersQuery({ page: 1, perPage: 100, active: true })
  const deleteMutation = useDeletePurchaseMutation()
  const uploadMutation = useUploadFacturaMutation()
  const updateMutation = useUpdatePurchaseMutation()
  const createItemMutation = useCreatePurchaseItemMutation()
  const updateItemMutation = useUpdatePurchaseItemMutation()
  const deleteItemMutation = useDeletePurchaseItemMutation()

  entryCurrencyRef.current = entryCurrency
  usdRateRef.current = usdRate
  localItemsRef.current = localItems

  const isBorrador = purchase?.status === 'DRAFT'
  const supplierNombre = purchase?.supplierId
    ? (suppliersData?.suppliers.find((p) => p.id === purchase.supplierId)?.name ??
      `#${purchase.supplierId}`)
    : 'Sin proveedor'
  const supplier = purchase?.supplierId
    ? suppliersData?.suppliers.find((p) => p.id === purchase.supplierId)
    : undefined
  const supplierOffersCredit = (supplier?.creditDays ?? 0) > 0

  useEffect(() => {
    setLocalItems([])
    setSyncedPurchaseId(null)
    setInvoiceNumber('')
    setUsdRate('')
    setNotes('')
    setAccountId(null)
    setIsCredit(false)
    setCreditDueDate('')
    setHasLocalChanges(false)
    setEntryCurrency(baseCurrencyCode)
    itemNativeEntryRef.current.clear()
  }, [purchaseId, baseCurrencyCode])

  useEffect(() => {
    if (!purchase || !isBorrador) return
    if (syncedPurchaseId === purchase.id) return

    setLocalItems((purchase.items ?? []).map(purchaseItemToLocal))
    setInvoiceNumber(purchase.invoiceNumber ?? '')
    const resolvedEntry = inferPurchaseEntryCurrency(purchase, baseCurrencyCode)
    setEntryCurrency(resolvedEntry)
    setUsdRate(
      resolveEntryRateInput(
        resolvedEntry,
        activeCurrencies,
        purchase.usdRate,
        globalRate,
        baseCurrencyCode
      )
    )
    setNotes(purchase.notes ?? '')
    setAccountId(purchase.accountId)
    setIsCredit(supplierOffersCredit ? purchase.isCredit : false)
    setCreditDueDate(purchase.creditDueDate ?? '')
    setSyncedPurchaseId(purchase.id)
  }, [purchase, isBorrador, syncedPurchaseId, globalRate, supplierOffersCredit, activeCurrencies, baseCurrencyCode])

  useEffect(() => {
    if (!supplierOffersCredit && isCredit) {
      setIsCredit(false)
      setCreditDueDate('')
    }
  }, [supplierOffersCredit, isCredit])

  useEffect(() => {
    if (!purchase || !isBorrador || syncedPurchaseId !== purchase.id) return

    const timer = window.setTimeout(() => {
      void updateMutation.mutateAsync({
        id: purchase.id,
        payload: {
          ...(purchase.supplierId ? { supplier_id: purchase.supplierId } : {}),
          date: purchase.date,
          invoice_number: invoiceNumber.trim() || undefined,
          entry_currency_code: entryCurrency,
          usd_rate: usdRate ? Number(usdRate) : undefined,
          notes: notes.trim() || undefined,
          account_id: accountId,
          is_credit: supplierOffersCredit ? isCredit : false,
          credit_due_date:
            supplierOffersCredit && isCredit ? creditDueDate || undefined : undefined,
        },
      })
    }, 600)

    return () => window.clearTimeout(timer)
  }, [
    purchase,
    isBorrador,
    syncedPurchaseId,
    invoiceNumber,
    usdRate,
    entryCurrency,
    notes,
    accountId,
    isCredit,
    creditDueDate,
    supplierOffersCredit,
  ])

  useEffect(() => {
    const timers = itemSaveTimers.current
    return () => {
      for (const [localId, timer] of timers) {
        window.clearTimeout(timer)
        persistItemNowRef.current(purchaseId, localId)
      }
      timers.clear()
    }
  }, [purchaseId])

  useEffect(() => {
    if (!isBorrador || !hasLocalChanges) return

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isBorrador, hasLocalChanges])

  useEffect(() => {
    itemNativeEntryRef.current.clear()
  }, [usdRate, entryCurrency])

  const rateNum = isBorrador
    ? usdRate
      ? Number(usdRate)
      : null
    : purchase?.usdRate
      ? Number(purchase.usdRate)
      : null
  const draftTotalUsd = useMemo(
    () => localItems.reduce((sum, item) => sum + item.quantity * item.unitPriceUsd, 0),
    [localItems]
  )
  const displayTotalUsd = isBorrador
    ? draftTotalUsd
    : Number(purchase?.totalUsd ?? 0)
  const displayTotalBs = isBorrador
    ? rateNum && rateNum > 0
      ? draftTotalUsd * rateNum
      : 0
    : Number(purchase?.totalBs ?? 0)

  const markDirty = useCallback(() => setHasLocalChanges(true), [])

  const displayEntryCurrency = isBorrador
    ? entryCurrency
    : inferPurchaseEntryCurrency(
        purchase ?? { entryCurrencyCode: null, usdRate: null },
        baseCurrencyCode
      )
  const entrySymbol = currencySymbol(displayEntryCurrency)
  const entryInNative = isPurchaseEntryInNative(displayEntryCurrency, baseCurrencyCode)
  const entryPriceDecimals = purchaseEntryDecimals(displayEntryCurrency)
  const canEnterPriceInNative = !entryInNative || isValidPurchaseRate(rateNum)

  function handleEntryCurrencyChange(code: string) {
    setEntryCurrency(code)
    itemNativeEntryRef.current.clear()
    setUsdRate(resolveEntryRateInput(code, activeCurrencies, null, globalRate, baseCurrencyCode))
    markDirty()
  }

  function buildItemPayload(item: LocalPurchaseItem, unitPriceNativeEntered?: number) {
    const rate = usdRateRef.current ? Number(usdRateRef.current) : 0
    return buildPurchaseItemPayload(
      item,
      entryCurrencyRef.current,
      rate,
      unitPriceNativeEntered,
      baseCurrencyCode
    )
  }

  function persistItemNow(targetPurchaseId: number, localId: string) {
    const itemId = parseDbItemId(localId)
    const item = localItemsRef.current.find((row) => row.localId === localId)
    if (!itemId || !item) return

    const payload = buildItemPayload(item, itemNativeEntryRef.current.get(localId))
    void updateItemMutation
      .mutateAsync({ purchaseId: targetPurchaseId, itemId, payload })
      .catch((err) => notifyApiError(err))
  }
  persistItemNowRef.current = persistItemNow

  function scheduleItemPersist(localId: string) {
    if (!parseDbItemId(localId)) return

    const existing = itemSaveTimers.current.get(localId)
    if (existing) window.clearTimeout(existing)

    const timer = window.setTimeout(() => {
      itemSaveTimers.current.delete(localId)
      persistItemNow(purchaseId, localId)
    }, 500)

    itemSaveTimers.current.set(localId, timer)
  }

  /** Confirming sends every row and deleting drops them, so pending row saves would only fail. */
  function discardPendingItemSaves() {
    for (const timer of itemSaveTimers.current.values()) {
      window.clearTimeout(timer)
    }
    itemSaveTimers.current.clear()
  }

  async function addMaterialToItems(material: Material) {
    const existing = localItems.find(
      (i) => i.itemType === 'material' && i.materialId === material.id && !i.isWholesale
    )
    const price = material.lastPurchasePriceUsd ? Number(material.lastPurchasePriceUsd) : 0

    try {
      if (existing) {
        const itemId = parseDbItemId(existing.localId)
        if (itemId) {
          const updated = await updateItemMutation.mutateAsync({
            purchaseId,
            itemId,
            payload: { quantity: existing.quantity + 1 },
          })
          setLocalItems((prev) =>
            prev.map((i) => (i.localId === existing.localId ? purchaseItemToLocal(updated) : i))
          )
        } else {
          setLocalItems((prev) =>
            prev.map((i) =>
              i.itemType === 'material' && i.materialId === material.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          )
        }
      } else {
        const draftItem: LocalPurchaseItem = {
          localId: 'pending',
          itemType: 'material',
          materialId: material.id,
          material,
          quantity: 1,
          unitPriceUsd: price,
          isWholesale: false,
        }
        const created = await createItemMutation.mutateAsync({
          purchaseId,
          payload: buildItemPayload(draftItem),
        })
        setLocalItems((prev) => [...prev, ...created.items.map(purchaseItemToLocal)])
      }
      markDirty()
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function addProductToItems(product: CatalogProduct) {
    const existing = localItems.find(
      (i) => i.itemType === 'product' && i.catalogProductId === product.id && !i.isWholesale
    )
    const price = product.cost_usd ? Number(product.cost_usd) : 0

    try {
      if (existing) {
        const itemId = parseDbItemId(existing.localId)
        if (itemId) {
          const updated = await updateItemMutation.mutateAsync({
            purchaseId,
            itemId,
            payload: { quantity: existing.quantity + 1 },
          })
          setLocalItems((prev) =>
            prev.map((i) => (i.localId === existing.localId ? purchaseItemToLocal(updated) : i))
          )
        } else {
          setLocalItems((prev) =>
            prev.map((i) =>
              i.itemType === 'product' && i.catalogProductId === product.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          )
        }
      } else {
        const draftItem: LocalPurchaseItem = {
          localId: 'pending',
          itemType: 'product',
          catalogProductId: product.id,
          catalogProduct: {
            id: product.id,
            name: product.name,
            category: product.category,
            saleUnit: product.sale_unit,
            wholesaleEnabled: product.wholesale_enabled,
            wholesaleUnitsPerPack: product.wholesale_units_per_pack,
            wholesaleCostUsd: product.wholesale_cost_usd,
            wholesaleSalePriceUsd: product.wholesale_sale_price_usd,
          },
          quantity: 1,
          unitPriceUsd: price,
          isWholesale: false,
        }
        const created = await createItemMutation.mutateAsync({
          purchaseId,
          payload: buildItemPayload(draftItem),
        })
        setLocalItems((prev) => [...prev, ...created.items.map(purchaseItemToLocal)])
      }
      markDirty()
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function addMachineToItems(machine: Machine) {
    const already = localItems.some((i) => i.itemType === 'machine' && i.machineId === machine.id)
    if (already) {
      toast.error('Esta máquina ya está en la compra')
      return
    }

    try {
      const draftItem: LocalPurchaseItem = {
        localId: 'pending',
        itemType: 'machine',
        machineId: machine.id,
        machine: {
          id: machine.id,
          name: machine.name,
          type: machine.type,
          brand: machine.brand,
          model: machine.model,
          status: machine.status,
          active: machine.active,
        },
        quantity: 1,
        unitPriceUsd: machine.acquisitionCost ? Number(machine.acquisitionCost) : 0,
        isWholesale: false,
      }
      const created = await createItemMutation.mutateAsync({
        purchaseId,
        payload: buildItemPayload(draftItem),
      })
      setLocalItems((prev) => [...prev, ...created.items.map(purchaseItemToLocal)])
      markDirty()
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function addNewMachinesToPurchase(result: {
    new_machine: {
      name: string
      type: string
      brand?: string
      model?: string
      status?: string
    }
    quantity: number
    unit_price_usd: number
  }) {
    try {
      const unitPriceUsd = entryInNative && isValidPurchaseRate(rateNum)
        ? nativeToUsd(result.unit_price_usd, rateNum)
        : result.unit_price_usd

      const payload = {
        new_machine: result.new_machine,
        quantity: result.quantity,
        unit_price_usd: unitPriceUsd,
        ...(entryInNative && isValidPurchaseRate(rateNum)
          ? { unit_price_bs: result.unit_price_usd }
          : {}),
      }

      const created = await createItemMutation.mutateAsync({ purchaseId, payload })
      setLocalItems((prev) => [...prev, ...created.items.map(purchaseItemToLocal)])
      setMachineDialogOpen(false)
      markDirty()
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function addItemByBarcode(rawCode: string) {
    const code = rawCode.trim()
    if (!code || !isBorrador || !canEditPurchase) return
    if (itemAddMode === 'machine') {
      toast.error('El escaneo no aplica a máquinas')
      return
    }

    try {
      if (itemAddMode === 'material') {
        const material = await lookupMaterialByBarcode(code)
        if (!material) {
          toast.error('Código no encontrado')
          return
        }
        await addMaterialToItems(material)
        return
      }

      const product = await lookupProductByBarcode(code)
      if (!product) {
        toast.error('Código no encontrado')
        return
      }
      await addProductToItems(product)
    } catch (err) {
      notifyApiError(err)
    }
  }

  function updateLocalItem(
    localId: string,
    patch: Partial<Pick<LocalPurchaseItem, 'quantity' | 'unitPriceUsd' | 'isWholesale'>>
  ) {
    setLocalItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    )

    scheduleItemPersist(localId)
    markDirty()
  }

  function toggleLocalItemWholesale(localId: string, checked: boolean) {
    const current = localItems.find((item) => item.localId === localId)
    if (!current || !localItemCanWholesale(current)) return

    updateLocalItem(localId, {
      isWholesale: checked,
      unitPriceUsd: wholesaleTogglePriceUsd(current, checked),
    })
  }

  function updateLocalItemPriceUsd(localId: string, unitPriceUsd: number) {
    itemNativeEntryRef.current.delete(localId)
    updateLocalItem(localId, { unitPriceUsd })
  }

  function updateLocalItemPriceNative(localId: string, native: number, rate: number) {
    // Conservar el nativo tipado: si el input muestra base×tasa en cada tecla,
    // el redondeo $→Au→$ pisa lo que el usuario escribe (p. ej. 1,67 → 1,6706).
    itemNativeEntryRef.current.set(localId, native)
    updateLocalItem(localId, { unitPriceUsd: nativeToUsd(native, rate) })
  }

  function nativeUnitPriceDisplay(item: LocalPurchaseItem): number {
    const drafted = itemNativeEntryRef.current.get(item.localId)
    if (drafted !== undefined) return drafted
    return formatItemNativeDisplay(
      item.unitPriceUsd,
      rateNum,
      displayEntryCurrency,
      baseCurrencyCode
    )
  }

  async function removeLocalItem(localId: string) {
    const itemId = parseDbItemId(localId)
    const existingTimer = itemSaveTimers.current.get(localId)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
      itemSaveTimers.current.delete(localId)
    }
    itemNativeEntryRef.current.delete(localId)

    if (itemId) {
      try {
        await deleteItemMutation.mutateAsync({ purchaseId, itemId })
      } catch (err) {
        notifyApiError(err)
        return
      }
    }

    setLocalItems((prev) => prev.filter((item) => item.localId !== localId))
    markDirty()
  }

  function syncMaterialInItems(material: Material) {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.itemType === 'material' && item.materialId === material.id
          ? { ...item, material: materialToSummary(material) }
          : item
      )
    )
    markDirty()
  }

  function syncProductInItems(product: CatalogProduct) {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.itemType === 'product' && item.catalogProductId === product.id
          ? {
              ...item,
              catalogProduct: {
                id: product.id,
                name: product.name,
                category: product.category,
                saleUnit: product.sale_unit,
                wholesaleEnabled: product.wholesale_enabled,
                wholesaleUnitsPerPack: product.wholesale_units_per_pack,
                wholesaleCostUsd: product.wholesale_cost_usd,
                wholesaleSalePriceUsd: product.wholesale_sale_price_usd,
              },
            }
          : item
      )
    )
    markDirty()
  }

  // The edit forms seed their fields once from the record they receive, so a partial
  // summary from the purchase row would be saved back over the real values.
  async function openEditMaterial(item: LocalPurchaseItem) {
    const materialId = item.itemType === 'material' ? (item.materialId ?? item.material?.id) : null
    if (!materialId) return
    try {
      setEditingMaterial(await getMaterial(materialId))
      setMaterialDialogOpen(true)
    } catch (err) {
      notifyApiError(err, 'No se pudo cargar el material')
    }
  }

  async function openEditProduct(item: LocalPurchaseItem) {
    if (item.itemType !== 'product' || !item.catalogProductId) return
    try {
      setEditingProduct(await getCatalogProduct(item.catalogProductId))
      setProductDialogOpen(true)
    } catch (err) {
      notifyApiError(err, 'No se pudo cargar el producto')
    }
  }

  const confirmPayload = useMemo(
    () => ({
      invoice_number: invoiceNumber.trim() || undefined,
      entry_currency_code: entryCurrency,
      usd_rate: usdRate ? Number(usdRate) : undefined,
      notes: notes.trim() || undefined,
      account_id: accountId,
      is_credit: supplierOffersCredit ? isCredit : false,
      credit_due_date:
        supplierOffersCredit && isCredit ? creditDueDate || undefined : undefined,
      items: localItems.map((item) =>
        item.itemType === 'product'
          ? {
              catalog_product_id: item.catalogProductId,
              quantity: item.quantity,
              unit_price_usd: item.unitPriceUsd,
              ...(item.isWholesale ? { is_wholesale: true } : {}),
            }
          : {
              material_id: item.materialId,
              quantity: item.quantity,
              unit_price_usd: item.unitPriceUsd,
              ...(item.isWholesale ? { is_wholesale: true } : {}),
            }
      ),
    }),
    [invoiceNumber, entryCurrency, usdRate, notes, accountId, isCredit, creditDueDate, localItems, supplierOffersCredit]
  )

  const sinVencimientoCredito = supplierOffersCredit && isCredit && !creditDueDate.trim()

  async function handleAccountChange(value: number | null) {
    if (!purchase || !isBorrador) return
    setAccountId(value)
    markDirty()
    try {
      await updateMutation.mutateAsync({
        id: purchase.id,
        payload: {
          ...(purchase.supplierId ? { supplier_id: purchase.supplierId } : {}),
          date: purchase.date,
          account_id: value,
        },
      })
    } catch (err) {
      notifyApiError(err)
    }
  }

  if (!isValidPurchaseId) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-muted-foreground text-sm">
          {detailPageErrorMessage({
            isValidId: false,
            isError: false,
            error: null,
            entityLabel: 'compra',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/purchases">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando compra…
      </div>
    )
  }

  if (isError || !purchase) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className={cn('text-sm whitespace-pre-line', isError ? 'text-destructive' : 'text-muted-foreground')}>
          {detailPageErrorMessage({
            isValidId: true,
            isError,
            error,
            entityLabel: 'compra',
          })}
        </p>
        <Button variant="outline" asChild>
          <Link to="/purchases">Volver al listado</Link>
        </Button>
      </div>
    )
  }

  async function handleDeletePurchase() {
    if (!window.confirm('¿Eliminar esta compra en borrador?')) return
    discardPendingItemSaves()
    try {
      await deleteMutation.mutateAsync(purchaseId)
      void navigate('/purchases')
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function handleUploadFactura(file: File) {
    try {
      await uploadMutation.mutateAsync({ purchaseId, file })
    } catch (err) {
      notifyApiError(err)
    }
  }

  async function handleDownloadFactura() {
    try {
      const blob = await downloadFactura(purchaseId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      notifyApiError(err)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={pageHeaderClass}>
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link to="/purchases">
              <ArrowLeft />
              Compras
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Compra #{purchase.id}</h1>
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                purchase.status === 'DRAFT'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                  : purchase.status === 'VOIDED'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
              )}
            >
              {ESTADO_LABELS[purchase.status]}
            </span>
          </div>
        </div>

        {isBorrador ? (
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission="purchases.confirm">
              <Button
                onClick={() => setConfirmDialogOpen(true)}
                disabled={sinVencimientoCredito}
              >
                <CheckCircle2 />
                Confirmar
              </Button>
            </PermissionGate>
            <PermissionGate permission="purchases.edit">
              <Button variant="outline" onClick={handleDeletePurchase} disabled={deleteMutation.isPending}>
                <Trash2 />
                Eliminar
              </Button>
            </PermissionGate>
          </div>
        ) : purchase.tieneFactura ? (
          <Button variant="outline" onClick={handleDownloadFactura}>
            <Download />
            Ver factura
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className={toolbarHeaderClass}>
          <CardTitle className="text-base">Datos de compra</CardTitle>
          <p className="text-muted-foreground text-sm">{formatFecha(purchase.date)}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
              <div className="flex items-center gap-4">
                {purchase.supplierId && supplier?.imagePath ? (
                  <PublicImage
                    src={supplierImageUrl(purchase.supplierId)}
                    alt={supplierNombre}
                    className="bg-muted size-[115px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="bg-muted size-[115px] shrink-0 rounded-full" />
                )}
                <div className="min-w-0">
                  <p className="text-[1.5625rem] font-semibold leading-tight">{supplierNombre}</p>
                  {supplier?.rif ? (
                    <p className="text-muted-foreground text-[1.0325rem] font-bold uppercase tracking-wide">
                      {supplier.rif}
                    </p>
                  ) : null}
                  {supplier?.phone ? (
                    <p className="text-muted-foreground text-sm font-bold">{supplier.phone}</p>
                  ) : null}
                </div>
              </div>
              {isBorrador && canEditPurchase ? (
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_number">Número de factura</Label>
                    <Input
                      id="invoice_number"
                      value={invoiceNumber}
                      onChange={(e) => {
                        setInvoiceNumber(e.target.value)
                        markDirty()
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="usd_rate">
                        {entryRateLabel(entryCurrency, entrySymbol, baseCurrencyCode)}
                      </Label>
                      <PurchaseEntryCurrencyToggle
                        currencies={activeCurrencies}
                        value={entryCurrency}
                        onChange={handleEntryCurrencyChange}
                      />
                    </div>
                    {entryInNative ? (
                      <>
                        <DecimalInput
                          id="usd_rate"
                          min="0"
                          decimals={4}
                          placeholder="Ej. 36.50"
                          className="w-full"
                          value={usdRate}
                          onChange={(e) => {
                            setUsdRate(e.target.value)
                            markDirty()
                          }}
                        />
                        {!isValidPurchaseRate(rateNum) ? (
                          <p className="text-muted-foreground text-xs">
                            Cargá la tasa de la factura para ingresar en {entrySymbol}.
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            La tasa queda en esta compra; no modifica Configuración. Podés editar el
                            precio en {entrySymbol}; al cambiar la tasa, ese monto se recalcula y el
                            costo en {baseCurrencyCode} del ítem no cambia.
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Los precios se ingresan en la moneda base ({baseCurrencyCode}).
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-center gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Número de factura
                    </p>
                    <p className="font-medium">{purchase.invoiceNumber ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Moneda de ingreso
                    </p>
                    <p className="font-medium">{entrySymbol}</p>
                  </div>
                  {entryInNative ? (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        {entryRateLabel(displayEntryCurrency, entrySymbol, baseCurrencyCode)}
                      </p>
                      <p className="font-medium">
                        {purchase.usdRate ? formatRateInput(purchase.usdRate) : '—'}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            {isBorrador && canEditPurchase ? (
                <div className="grid gap-4 border-t pt-6 md:col-span-2 md:grid-cols-2">
                  <div className="space-y-4">
                    <AccountSelect
                      value={accountId}
                      onChange={(value) => void handleAccountChange(value)}
                      allowCreate
                    />
                    <div className="grid grid-cols-10 items-start gap-4">
                      <div className="col-span-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 rounded border"
                            checked={isCredit}
                            disabled={!supplierOffersCredit}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setIsCredit(checked)
                              markDirty()
                              if (checked) {
                                const days = supplier?.creditDays ?? 30
                                const base = purchase?.date ?? todayLocalIsoDate()
                                setCreditDueDate(addLocalDaysIsoDate(days, base))
                              } else {
                                setCreditDueDate('')
                              }
                            }}
                          />
                          Crédito
                        </label>
                      </div>
                      {supplierOffersCredit && isCredit ? (
                        <div className="col-span-7 space-y-2">
                          <Label htmlFor="credit_due_date">Fecha de vencimiento *</Label>
                          <Input
                            id="credit_due_date"
                            type="date"
                            className="w-full"
                            value={creditDueDate}
                            onChange={(e) => {
                              setCreditDueDate(e.target.value)
                              markDirty()
                            }}
                          />
                          {sinVencimientoCredito ? (
                            <p className="text-destructive text-xs">Indicá la fecha de vencimiento.</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {!supplierOffersCredit ? (
                      <p className="text-muted-foreground text-xs">
                        Este proveedor no ofrece crédito.
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value)
                        markDirty()
                      }}
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleUploadFactura(file)
                          e.target.value = ''
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadMutation.isPending}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadMutation.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
                        {purchase.tieneFactura ? 'Reemplazar factura' : 'Adjuntar factura'}
                      </Button>
                    </div>
                  </div>
                </div>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Cuenta
                  </p>
                  <p className="font-medium">{purchase.account?.name ?? '—'}</p>
                </div>
                {purchase.isCredit ? (
                  <>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Crédito
                      </p>
                      <p className="font-medium">Sí — vence {formatFecha(purchase.creditDueDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Pagado / Saldo
                      </p>
                      <p className="font-medium">
                        <DisplayMoneyFromUsd amountUsd={purchase.amountPaidUsd} size="sm" />
                        {' / '}
                        <DisplayMoneyFromUsd amountUsd={purchase.balanceUsd} size="sm" />
                      </p>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>

          {!isBorrador && purchase.notes ? (
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Notas</p>
              <p className="text-sm">{purchase.notes}</p>
            </div>
          ) : null}

          <div className="space-y-4 border-t pt-6">
            <div className={pageHeaderClass}>
              <h3 className="font-medium">Ítems</h3>
              {isBorrador && canEditPurchase ? (
                <PurchaseItemAddToolbar
                  mode={itemAddMode}
                  onModeChange={setItemAddMode}
                  excludeMachineIds={localItems
                    .filter((i) => i.itemType === 'machine' && i.machineId)
                    .map((i) => i.machineId!)}
                  onSelectMaterial={(material) => void addMaterialToItems(material)}
                  onSelectProduct={(product) => void addProductToItems(product)}
                  onSelectMachine={(machine) => void addMachineToItems(machine)}
                  onScan={(code) => void addItemByBarcode(code)}
                  onNewMaterial={() => {
                    setEditingMaterial(null)
                    setMaterialDialogOpen(true)
                  }}
                  onNewProduct={() => {
                    setEditingProduct(null)
                    setProductDialogOpen(true)
                  }}
                  onNewMachine={() => setMachineDialogOpen(true)}
                />
              ) : null}
            </div>

            {(isBorrador ? localItems : (purchase.items ?? [])).length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin ítems todavía.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b text-left">
                      <th className="px-3 py-2 font-medium">Código</th>
                      <th className="px-3 py-2 font-medium">Descripción</th>
                      <th className="px-3 py-2 font-medium">Mayorista</th>
                      <th className="px-3 py-2 font-medium">Cantidad</th>
                      <th className="px-3 py-2 font-medium">Unidad</th>
                      <th className="px-3 py-2 font-medium">
                        {unitPriceColumnLabel(displayEntryCurrency, entrySymbol)}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {subtotalColumnLabel(displayEntryCurrency, entrySymbol)}
                      </th>
                      {isBorrador && canEditPurchase ? (
                        <th className="px-3 py-2 font-medium text-right">Acciones</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {isBorrador
                      ? localItems.map((item) => (
                          <PurchaseDraftItemRow
                            key={item.localId}
                            item={item}
                            entryInNative={entryInNative}
                            entryPriceDecimals={entryPriceDecimals}
                            canEnterPriceInNative={canEnterPriceInNative}
                            rateNum={rateNum}
                            displayEntryCurrency={displayEntryCurrency}
                            nativeUnitPrice={nativeUnitPriceDisplay(item)}
                            onQuantityChange={(quantity) =>
                              updateLocalItem(item.localId, { quantity })
                            }
                            onToggleWholesale={(checked) =>
                              toggleLocalItemWholesale(item.localId, checked)
                            }
                            onPriceUsdChange={(price) => updateLocalItemPriceUsd(item.localId, price)}
                            onPriceNativeChange={(native, rate) =>
                              updateLocalItemPriceNative(item.localId, native, rate)
                            }
                            onEditMaterial={() => void openEditMaterial(item)}
                            onEditProduct={() => void openEditProduct(item)}
                            onRemove={() => void removeLocalItem(item.localId)}
                          />
                        ))
                      : (purchase.items ?? []).map((item) => (
                          <PurchaseConfirmedItemRow
                            key={item.id}
                            item={item}
                            displayEntryCurrency={displayEntryCurrency}
                            baseCurrencyCode={baseCurrencyCode}
                            rateNum={rateNum}
                          />
                        ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col items-end gap-1 border-t pt-4">
              <PrecioEnMonedaIngreso
                precioUsd={displayTotalUsd}
                precioNativo={displayTotalBs}
                entryCurrency={displayEntryCurrency}
                baseCurrencyCode={baseCurrencyCode}
                rate={rateNum}
                className="items-end text-2xl font-semibold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!isBorrador && purchase.isCredit && purchase.supplierId && Number(purchase.balanceUsd) > 0 ? (
        <Card>
          <CardHeader className={toolbarHeaderClass}>
            <div>
              <CardTitle className="text-base">Abonos</CardTitle>
              <CardDescription>
                Saldo pendiente:{' '}
                <DisplayMoneyFromUsd amountUsd={purchase.balanceUsd} size="sm" />
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
              <Plus />
              Registrar abono
            </Button>
          </CardHeader>
        </Card>
      ) : null}

      {isBorrador ? (
        <>
          <MaterialFormDialog
            open={materialDialogOpen}
            onOpenChange={setMaterialDialogOpen}
            material={editingMaterial}
            purchaseFlow
            onCreated={(material) => {
              if (editingMaterial) {
                syncMaterialInItems(material)
              } else {
                void addMaterialToItems(material)
              }
            }}
          />
          <CatalogFormDialog
            open={productDialogOpen}
            onOpenChange={(open) => {
              setProductDialogOpen(open)
              if (!open) setEditingProduct(null)
            }}
            product={editingProduct}
            purchaseFlow
            onCreated={(product) => {
              if (editingProduct) {
                syncProductInItems(product)
              } else {
                void addProductToItems(product)
              }
            }}
            onSaved={() => {
              if (!editingProduct) return
              void getCatalogProduct(editingProduct.id)
                .then((product) => syncProductInItems(product))
                .catch((err) => notifyApiError(err, 'No se pudo actualizar el producto en la compra'))
            }}
          />
          <PurchaseMachineFormDialog
            open={machineDialogOpen}
            onOpenChange={setMachineDialogOpen}
            submitting={createItemMutation.isPending}
            priceLabel={unitPriceColumnLabel(displayEntryCurrency, entrySymbol)}
            onSubmit={addNewMachinesToPurchase}
          />
          <ConfirmarPurchaseDialog
            open={confirmDialogOpen}
            onOpenChange={setConfirmDialogOpen}
            purchaseId={purchaseId}
            payload={confirmPayload}
            sinFactura={!invoiceNumber.trim()}
            sinItems={localItems.length === 0}
            sinTasa={entryInNative && !isValidPurchaseRate(rateNum)}
            onSuccess={() => {
              discardPendingItemSaves()
              setHasLocalChanges(false)
              void navigate('/purchases')
            }}
          />
        </>
      ) : null}

      {purchase.supplierId ? (
        <PurchasePaymentFormDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          supplierId={purchase.supplierId}
          purchaseId={purchase.id}
          maxAmountUsd={Number(purchase.balanceUsd)}
        />
      ) : null}
    </div>
  )
}
