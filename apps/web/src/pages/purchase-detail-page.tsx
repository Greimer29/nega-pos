import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useFormatMoney } from '@/features/currencies/context/display-currency-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DecimalInput, MoneyInput } from '@/components/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmarPurchaseDialog } from '@/features/purchases/components/confirm-purchase-dialog'
import { PermissionGate } from '@/features/permissions/components/permission-gate'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { PurchasePaymentFormDialog } from '@/features/purchases/components/purchase-payment-form-dialog'
import { AccountSelect } from '@/features/accounts/components/account-select'
import { DisplayMoneyFromUsd } from '@/features/currencies/components/display-money'
import { PrecioBimonetario } from '@/features/purchases/components/bi-currency-price'
import { PurchaseEntryCurrencyToggle } from '@/features/purchases/components/purchase-entry-currency-toggle'
import {
  bsToUsd,
  buildPurchaseItemPayload,
  isValidPurchaseRate,
  type PurchaseEntryCurrency,
  usdToBs,
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
import type { LocalPurchaseItem, PurchaseItem, PurchaseItemMaterial } from '@/features/purchases/types'
import { MaterialFormDialog } from '@/features/materials/components/material-form-dialog'
import { UNIT_ABREV } from '@/features/materials/constants'
import { useMaterialsQuery } from '@/features/materials/hooks/use-materials'
import type { Material } from '@/features/materials/types'
import type { CatalogProduct } from '@/features/ventas/types'
import { useCatalogProductsQuery } from '@/features/ventas/hooks/use-catalog'
import { CatalogFormDialog } from '@/features/ventas/components/catalog-form-dialog'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { productSaleUnitAbrev } from '@/features/ventas/constants'
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers'
import { supplierImageUrl } from '@/features/suppliers/constants'
import { PublicImage } from '@/components/public-image'
import { getApiErrorMessage } from '@/lib/api-error'
import { detailPageErrorMessage } from '@/lib/detail-page-messages'
import { parsePositiveIntRouteParam } from '@/lib/route-id'
import { parseDecimalInput } from '@/lib/numeric-input'
import { cn } from '@/lib/utils'

function materialToSummary(material: Material): PurchaseItemMaterial {
  return {
    id: material.id,
    code: material.code,
    name: material.name,
    unit: material.unit,
  }
}

function purchaseItemToLocal(item: PurchaseItem): LocalPurchaseItem {
  if (item.itemType === 'product' || item.catalogProductId) {
    return {
      localId: `db-${item.id}`,
      itemType: 'product',
      catalogProductId: item.catalogProductId ?? undefined,
      catalogProduct: item.catalogProduct ?? {
        id: item.catalogProductId ?? 0,
        name: 'Producto',
        category: 'OTHER',
        saleUnit: 'UND',
      },
      quantity: Number(item.quantity),
      unitPriceUsd: Number(item.unitPriceUsd ?? 0),
    }
  }

  return {
    localId: `db-${item.id}`,
    itemType: 'material',
    materialId: item.materialId ?? undefined,
    material: item.material ?? {
      id: item.materialId ?? 0,
      code: `#${item.materialId}`,
      name: 'Material',
      unit: 'UND',
    },
    quantity: Number(item.quantity),
    unitPriceUsd: Number(item.unitPriceUsd ?? 0),
  }
}

function localItemCode(item: LocalPurchaseItem) {
  if (item.itemType === 'product') {
    return catalogProductCode(item.catalogProduct?.id ?? item.catalogProductId ?? 0)
  }
  return item.material?.code ?? '—'
}

function localItemName(item: LocalPurchaseItem) {
  return item.itemType === 'product' ? item.catalogProduct?.name ?? 'Producto' : item.material?.name ?? 'Material'
}

function localItemUnit(item: LocalPurchaseItem) {
  if (item.itemType === 'product') {
    return productSaleUnitAbrev(item.catalogProduct?.saleUnit ?? 'UND')
  }
  return UNIT_ABREV[item.material?.unit ?? 'UND']
}

function addDaysIso(baseIso: string, days: number) {
  const date = new Date(`${baseIso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function parseDbItemId(localId: string): number | null {
  if (!localId.startsWith('db-')) return null
  const id = Number(localId.slice(3))
  return Number.isFinite(id) ? id : null
}

function formatItemBsDisplay(unitPriceUsd: number, rate: number | null): number {
  if (!isValidPurchaseRate(rate)) return 0
  const bs = usdToBs(unitPriceUsd, rate)
  return Number.isFinite(bs) ? bs : 0
}

function formatRateInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(2) : ''
}

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
  const [entryCurrency, setEntryCurrency] = useState<PurchaseEntryCurrency>('USD')
  const itemSaveTimers = useRef<Map<string, number>>(new Map())
  const itemBsEntryRef = useRef<Map<string, number>>(new Map())
  const entryCurrencyRef = useRef<PurchaseEntryCurrency>('USD')
  const usdRateRef = useRef('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [itemAddMode, setItemAddMode] = useState<'material' | 'product'>('material')

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: purchase, isLoading, isError, error } = usePurchaseQuery(purchaseId)
  const { data: globalRate } = useExchangeRateQuery()
  const { data: suppliersData } = useSuppliersQuery({ page: 1, perPage: 100, active: true })
  const { data: materialsData } = useMaterialsQuery({
    page: 1,
    perPage: itemAddMode === 'material' && searchOpen && !debouncedSearch ? 3 : 15,
    search: itemAddMode === 'material' ? debouncedSearch || undefined : undefined,
    status: 'active',
  })
  const { data: catalogData } = useCatalogProductsQuery({
    page: 1,
    perPage: itemAddMode === 'product' && searchOpen && !debouncedSearch ? 3 : 15,
    search: itemAddMode === 'product' ? debouncedSearch || undefined : undefined,
    active: true,
  })
  const deleteMutation = useDeletePurchaseMutation()
  const uploadMutation = useUploadFacturaMutation()
  const updateMutation = useUpdatePurchaseMutation()
  const createItemMutation = useCreatePurchaseItemMutation()
  const updateItemMutation = useUpdatePurchaseItemMutation()
  const deleteItemMutation = useDeletePurchaseItemMutation()
  const { formatFromUsd, formatNative } = useFormatMoney()

  entryCurrencyRef.current = entryCurrency
  usdRateRef.current = usdRate

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
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

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
    setEntryCurrency('USD')
    itemBsEntryRef.current.clear()
    setSearch('')
    setSearchOpen(false)
  }, [purchaseId])

  useEffect(() => {
    if (!purchase || !isBorrador) return
    if (syncedPurchaseId === purchase.id) return

    setLocalItems((purchase.items ?? []).map(purchaseItemToLocal))
    setInvoiceNumber(purchase.invoiceNumber ?? '')
    setUsdRate(formatRateInput(purchase.usdRate ?? globalRate))
    setNotes(purchase.notes ?? '')
    setAccountId(purchase.accountId)
    setIsCredit(supplierOffersCredit ? purchase.isCredit : false)
    setCreditDueDate(purchase.creditDueDate ?? '')
    setSyncedPurchaseId(purchase.id)
  }, [purchase, isBorrador, syncedPurchaseId, globalRate, supplierOffersCredit])

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
    notes,
    accountId,
    isCredit,
    creditDueDate,
    supplierOffersCredit,
  ])

  useEffect(() => {
    return () => {
      for (const timer of itemSaveTimers.current.values()) {
        window.clearTimeout(timer)
      }
      itemSaveTimers.current.clear()
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
    itemBsEntryRef.current.clear()
  }, [usdRate])

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

  function buildItemPayload(item: LocalPurchaseItem, unitPriceBsEntered?: number) {
    const rate = usdRateRef.current ? Number(usdRateRef.current) : 0
    return buildPurchaseItemPayload(
      item,
      entryCurrencyRef.current,
      rate,
      unitPriceBsEntered
    )
  }

  function scheduleItemPersist(localId: string, item: LocalPurchaseItem) {
    const itemId = parseDbItemId(localId)
    if (!itemId) return

    const existing = itemSaveTimers.current.get(localId)
    if (existing) window.clearTimeout(existing)

    const timer = window.setTimeout(() => {
      itemSaveTimers.current.delete(localId)
      const payload = buildItemPayload(item, itemBsEntryRef.current.get(localId))

      void updateItemMutation
        .mutateAsync({ purchaseId, itemId, payload })
        .catch((err) => setActionError(getApiErrorMessage(err)))
    }, 500)

    itemSaveTimers.current.set(localId, timer)
  }

  async function addMaterialToItems(material: Material) {
    setActionError(null)
    const existing = localItems.find(
      (i) => i.itemType === 'material' && i.materialId === material.id
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
          quantity: 1,
          unitPriceUsd: price,
        }
        const created = await createItemMutation.mutateAsync({
          purchaseId,
          payload: buildItemPayload(draftItem),
        })
        setLocalItems((prev) => [...prev, purchaseItemToLocal(created)])
      }
      markDirty()
      setSearch('')
      setSearchOpen(false)
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  async function addProductToItems(product: CatalogProduct) {
    setActionError(null)
    const existing = localItems.find(
      (i) => i.itemType === 'product' && i.catalogProductId === product.id
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
          quantity: 1,
          unitPriceUsd: price,
        }
        const created = await createItemMutation.mutateAsync({
          purchaseId,
          payload: buildItemPayload(draftItem),
        })
        setLocalItems((prev) => [...prev, purchaseItemToLocal(created)])
      }
      markDirty()
      setSearch('')
      setSearchOpen(false)
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  function updateLocalItem(
    localId: string,
    patch: Partial<Pick<LocalPurchaseItem, 'quantity' | 'unitPriceUsd'>>
  ) {
    let persistedItem: LocalPurchaseItem | null = null

    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.localId !== localId) return item
        persistedItem = { ...item, ...patch }
        return persistedItem
      })
    )

    if (persistedItem) scheduleItemPersist(localId, persistedItem)
    markDirty()
  }

  function updateLocalItemPriceUsd(localId: string, unitPriceUsd: number) {
    itemBsEntryRef.current.delete(localId)
    updateLocalItem(localId, { unitPriceUsd })
  }

  function updateLocalItemPriceBs(localId: string, bs: number, rate: number) {
    itemBsEntryRef.current.set(localId, bs)
    updateLocalItem(localId, { unitPriceUsd: bsToUsd(bs, rate) })
  }

  const entryInBs = entryCurrency === 'VES'
  const canEnterPriceInBs = !entryInBs || isValidPurchaseRate(rateNum)

  async function removeLocalItem(localId: string) {
    setActionError(null)
    const itemId = parseDbItemId(localId)
    const existingTimer = itemSaveTimers.current.get(localId)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
      itemSaveTimers.current.delete(localId)
    }
    itemBsEntryRef.current.delete(localId)

    if (itemId) {
      try {
        await deleteItemMutation.mutateAsync({ purchaseId, itemId })
      } catch (err) {
        setActionError(getApiErrorMessage(err))
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

  function openEditMaterial(item: LocalPurchaseItem) {
    if (item.itemType !== 'material' || !item.material) return
    setEditingMaterial({
      id: item.material.id,
      code: item.material.code,
      name: item.material.name,
      description: null,
      category: 'FABRIC',
      unit: item.material.unit,
      minimumStock: '0',
      location: null,
      defaultSupplierId: null,
      lastPurchasePrice: null,
      lastPurchasePriceUsd: null,
      previousPurchasePriceUsd: null,
      lastPurchaseDate: null,
      imagePath: null,
      active: true,
      createdAt: '',
      updatedAt: '',
    })
    setMaterialDialogOpen(true)
  }

  const confirmPayload = useMemo(
    () => ({
      invoice_number: invoiceNumber.trim() || undefined,
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
            }
          : {
              material_id: item.materialId,
              quantity: item.quantity,
              unit_price_usd: item.unitPriceUsd,
            }
      ),
    }),
    [invoiceNumber, usdRate, notes, accountId, isCredit, creditDueDate, localItems, supplierOffersCredit]
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
      setActionError(getApiErrorMessage(err))
    }
  }

  if (!isValidPurchaseId) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-destructive text-sm">
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
        <p className="text-destructive text-sm whitespace-pre-line">
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
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(purchaseId)
      void navigate('/purchases')
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  async function handleUploadFactura(file: File) {
    setActionError(null)
    try {
      await uploadMutation.mutateAsync({ purchaseId, file })
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  async function handleDownloadFactura() {
    setActionError(null)
    try {
      const blob = await downloadFactura(purchaseId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setActionError(getApiErrorMessage(err))
    }
  }

  const searchResults =
    itemAddMode === 'material' ? (materialsData?.materials ?? []) : (catalogData?.catalog_products ?? [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

      {actionError ? <p className="text-destructive text-sm whitespace-pre-line">{actionError}</p> : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
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
                      <Label htmlFor="usd_rate">Tasa Bs/USD</Label>
                      <PurchaseEntryCurrencyToggle
                        value={entryCurrency}
                        onChange={setEntryCurrency}
                      />
                    </div>
                    <DecimalInput
                      id="usd_rate"
                      min="0"
                      decimals={2}
                      placeholder="Ej. 36.50"
                      className="w-full"
                      value={usdRate}
                      onChange={(e) => {
                        setUsdRate(e.target.value)
                        markDirty()
                      }}
                    />
                    {entryInBs && !isValidPurchaseRate(rateNum) ? (
                      <p className="text-muted-foreground text-xs">
                        Cargá la tasa de la factura para ingresar en Bs.
                      </p>
                    ) : entryInBs ? (
                      <p className="text-muted-foreground text-xs">
                        Al cambiar la tasa, el monto en Bs se recalcula; el USD del ítem no cambia.
                      </p>
                    ) : null}
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
                      Tasa Bs/USD
                    </p>
                    <p className="font-medium">
                      {purchase.usdRate ? formatRateInput(purchase.usdRate) : '—'}
                    </p>
                  </div>
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
                                const base = purchase?.date ?? new Date().toISOString().slice(0, 10)
                                setCreditDueDate(addDaysIso(base, days))
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-medium">Ítems</h3>
              {isBorrador && canEditPurchase ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-muted inline-flex rounded-lg p-1">
                    <button
                      type="button"
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium',
                        itemAddMode === 'material'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground'
                      )}
                      onClick={() => setItemAddMode('material')}
                    >
                      Materiales
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium',
                        itemAddMode === 'product'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground'
                      )}
                      onClick={() => setItemAddMode('product')}
                    >
                      Productos
                    </button>
                  </div>
                  <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                    <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                    <Input
                      className="pl-9"
                      placeholder={
                        itemAddMode === 'material' ? 'Buscar material…' : 'Buscar producto…'
                      }
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setSearchOpen(true)
                      }}
                      onFocus={() => setSearchOpen(true)}
                    />
                    {searchOpen ? (
                      <div className="bg-popover absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border shadow-md">
                        {searchResults.length === 0 ? (
                          <p className="text-muted-foreground p-3 text-sm">Sin resultados</p>
                        ) : itemAddMode === 'material' ? (
                          (searchResults as Material[]).slice(0, 3).map((material) => (
                            <button
                              key={material.id}
                              type="button"
                              className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
                              onClick={() => void addMaterialToItems(material)}
                            >
                              <span className="font-medium">{material.code}</span> — {material.name}
                            </button>
                          ))
                        ) : (
                          (searchResults as CatalogProduct[]).slice(0, 3).map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className="hover:bg-muted block w-full px-3 py-2 text-left text-sm"
                              onClick={() => void addProductToItems(product)}
                            >
                              <span className="font-medium">{catalogProductCode(product.id)}</span>{' '}
                              — {product.name}
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                  {itemAddMode === 'material' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMaterial(null)
                        setMaterialDialogOpen(true)
                      }}
                    >
                      <Plus />
                      Nuevo material
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setProductDialogOpen(true)}
                    >
                      <Plus />
                      Nuevo producto
                    </Button>
                  )}
                </div>
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
                      <th className="px-3 py-2 font-medium">Cantidad</th>
                      <th className="px-3 py-2 font-medium">Unidad</th>
                      <th className="px-3 py-2 font-medium">
                        {isBorrador && canEditPurchase && entryInBs
                          ? 'Precio unit. (Bs)'
                          : 'Precio unit. ($)'}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {isBorrador && canEditPurchase && entryInBs
                          ? 'Subtotal (Bs)'
                          : 'Subtotal ($)'}
                      </th>
                      {isBorrador && canEditPurchase ? (
                        <th className="px-3 py-2 font-medium text-right">Acciones</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {isBorrador
                      ? localItems.map((item) => (
                          <tr key={item.localId} className="border-b last:border-b-0">
                            <td className="px-3 py-2">{localItemCode(item)}</td>
                            <td className="px-3 py-2">{localItemName(item)}</td>
                            <td className="px-3 py-2">
                              <DecimalInput
                                min="0"
                                className="h-8 w-24"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateLocalItem(item.localId, {
                                    quantity: parseDecimalInput(e.target.value, 2) ?? 0,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">{localItemUnit(item)}</td>
                            <td className="px-3 py-2">
                              {entryInBs ? (
                                <MoneyInput
                                  min="0"
                                  className="h-8 w-28"
                                  disabled={!canEnterPriceInBs}
                                  value={formatItemBsDisplay(item.unitPriceUsd, rateNum)}
                                  onChange={(e) => {
                                    const bs = parseDecimalInput(e.target.value, 2) ?? 0
                                    if (isValidPurchaseRate(rateNum)) {
                                      updateLocalItemPriceBs(item.localId, bs, rateNum)
                                    }
                                  }}
                                />
                              ) : (
                                <MoneyInput
                                  min="0"
                                  className="h-8 w-28"
                                  value={item.unitPriceUsd}
                                  onChange={(e) =>
                                    updateLocalItemPriceUsd(
                                      item.localId,
                                      parseDecimalInput(e.target.value, 2) ?? 0
                                    )
                                  }
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              {entryInBs && isValidPurchaseRate(rateNum) ? (
                                formatNative(
                                  item.quantity * formatItemBsDisplay(item.unitPriceUsd, rateNum),
                                  'VES'
                                )
                              ) : (
                                formatFromUsd(item.quantity * item.unitPriceUsd)
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {item.itemType === 'material' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Editar material"
                                    aria-label="Editar material"
                                    onClick={() => openEditMaterial(item)}
                                  >
                                    <Pencil />
                                  </Button>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Eliminar ítem"
                                  aria-label="Eliminar ítem"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => void removeLocalItem(item.localId)}
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      : (purchase.items ?? []).map((item) => (
                          <tr key={item.id} className="border-b last:border-b-0">
                            <td className="px-3 py-2">
                              {item.itemType === 'product'
                                ? catalogProductCode(item.catalogProduct?.id ?? item.catalogProductId ?? 0)
                                : (item.material?.code ?? '—')}
                            </td>
                            <td className="px-3 py-2">
                              {item.itemType === 'product'
                                ? item.catalogProduct?.name ?? '—'
                                : (item.material?.name ?? '—')}
                            </td>
                            <td className="px-3 py-2 tabular-nums">{item.quantity}</td>
                            <td className="px-3 py-2">
                              {item.itemType === 'product'
                                ? productSaleUnitAbrev(item.catalogProduct?.saleUnit ?? 'UND')
                                : item.material
                                  ? UNIT_ABREV[item.material.unit]
                                  : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <PrecioBimonetario
                                precioUsd={item.unitPriceUsd}
                                precioBs={item.unitPriceBs}
                                size="sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <PrecioBimonetario
                                precioUsd={item.subtotalUsd}
                                precioBs={item.subtotalBs}
                                size="sm"
                              />
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col items-end gap-1 border-t pt-4">
              <PrecioBimonetario
                precioUsd={displayTotalUsd}
                precioBs={displayTotalBs}
                className="items-end text-2xl font-semibold"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!isBorrador && purchase.isCredit && purchase.supplierId && Number(purchase.balanceUsd) > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
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
            onOpenChange={setProductDialogOpen}
            purchaseFlow
            onCreated={(product) => void addProductToItems(product)}
          />
          <ConfirmarPurchaseDialog
            open={confirmDialogOpen}
            onOpenChange={setConfirmDialogOpen}
            purchaseId={purchaseId}
            payload={confirmPayload}
            sinFactura={!invoiceNumber.trim()}
            sinItems={localItems.length === 0}
            sinTasa={!usdRate}
            onSuccess={() => {
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
