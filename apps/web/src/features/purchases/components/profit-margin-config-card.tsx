import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ProfitMarginFiltersPanel } from '@/features/purchases/components/profit-margin-filters-panel'
import { ProfitMarginProductList } from '@/features/purchases/components/profit-margin-product-list'
import { useApplyProfitMarginMutation, useUpdateProfitMarginMutation } from '@/features/purchases/hooks/use-settings'
import { PROFIT_MARGIN_PANEL_ID } from '@/features/settings/constants'
import { useCatalogProductQuery, useCatalogProductsQuery } from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { notifyApiError, QueryErrorState } from '@/features/notifications/query-error-state'
import { toast } from '@/features/notifications/toast'

type ProfitMarginConfigCardProps = {
  defaultMarginPercent?: string | null
  highlightProductId?: number
}

function hasCostPrice(product: CatalogProduct) {
  return product.cost_usd != null && Number(product.cost_usd) > 0
}

export function ProfitMarginConfigCard({
  defaultMarginPercent,
  highlightProductId,
}: ProfitMarginConfigCardProps) {
  const [marginInput, setMarginInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const applyMutation = useApplyProfitMarginMutation()
  const saveDefaultMarginMutation = useUpdateProfitMarginMutation()
  const filtersPanelRef = useRef<HTMLElement>(null)
  const [filtersPanelHeight, setFiltersPanelHeight] = useState<number | undefined>()

  useEffect(() => {
    const panel = filtersPanelRef.current
    if (!panel) {
      return
    }

    const updateHeight = () => {
      setFiltersPanelHeight(panel.getBoundingClientRect().height)
    }

    updateHeight()

    const observer = new ResizeObserver(updateHeight)
    observer.observe(panel)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data: highlightProduct } = useCatalogProductQuery(highlightProductId)

  useEffect(() => {
    if (!highlightProductId) {
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.add(highlightProductId)
      return next
    })
  }, [highlightProductId])

  useEffect(() => {
    if (!highlightProduct?.name) {
      return
    }
    setSearchInput(highlightProduct.name)
  }, [highlightProduct?.name])

  useEffect(() => {
    if (defaultMarginPercent != null && marginInput === '') {
      setMarginInput(defaultMarginPercent)
    }
  }, [defaultMarginPercent, marginInput])

  const { data, isLoading, isError, error } = useCatalogProductsQuery({
    page,
    perPage: 50,
    search: debouncedSearch || undefined,
    category: category || undefined,
    active: activeOnly ? true : undefined,
    sortBy: 'name',
    sortDir: 'asc',
  })

  const products = data?.catalog_products ?? []
  const meta = data?.meta
  const marginPercent = Number(marginInput)
  const marginValid = Number.isFinite(marginPercent) && marginPercent >= 0

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIds.has(product.id)),
    [products, selectedIds]
  )

  const applicableSelected = useMemo(
    () => selectedProducts.filter(hasCostPrice),
    [selectedProducts]
  )

  const allVisibleSelected =
    products.length > 0 && products.every((product) => selectedIds.has(product.id))

  const someVisibleSelected =
    products.length > 0 && products.some((product) => selectedIds.has(product.id))

  function toggleProduct(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAllVisible() {
    const visibleIds = products.map((product) => product.id)
    const allSelected = visibleIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const id of visibleIds) {
          next.delete(id)
        }
      } else {
        for (const id of visibleIds) {
          next.add(id)
        }
      }
      return next
    })
  }

  async function handleApply() {
    setActionSuccess(null)

    if (!marginValid) {
      toast.warning('Ingresá un porcentaje válido (0 o mayor)')
      return
    }

    if (selectedIds.size === 0) {
      toast.warning('Seleccioná al menos un producto')
      return
    }

    if (applicableSelected.length === 0) {
      toast.warning('Ningún producto seleccionado tiene precio costo registrado')
      return
    }

    try {
      const result = await applyMutation.mutateAsync({
        catalog_product_ids: [...selectedIds],
        profit_margin_percent: marginPercent,
      })

      await saveDefaultMarginMutation.mutateAsync(marginPercent)

      const skippedNoCost = result.skipped.filter((item) => item.reason === 'NO_COST_PRICE').length
      const skippedNotFound = result.skipped.filter((item) => item.reason === 'NOT_FOUND').length

      setActionSuccess(
        `Precio venta actualizado en ${result.updatedCount} producto${result.updatedCount === 1 ? '' : 's'}.${skippedNoCost > 0 ? ` ${skippedNoCost} sin precio costo.` : ''}${skippedNotFound > 0 ? ` ${skippedNotFound} no encontrado(s).` : ''}`
      )
    } catch (err) {
      notifyApiError(err)
    }
  }

  return (
    <Card id={PROFIT_MARGIN_PANEL_ID} className="scroll-mt-24">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <ProfitMarginFiltersPanel
            ref={filtersPanelRef}
            marginInput={marginInput}
            onMarginChange={setMarginInput}
            marginValid={marginValid}
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            category={category}
            onCategoryChange={(value) => {
              setCategory(value)
              setPage(1)
            }}
            activeOnly={activeOnly}
            onActiveOnlyChange={(value) => {
              setActiveOnly(value)
              setPage(1)
            }}
            applicableSelectedCount={applicableSelected.length}
            selectedCount={selectedIds.size}
            isApplying={applyMutation.isPending}
            onApply={() => void handleApply()}
            actionSuccess={actionSuccess}
          />
          <ProfitMarginProductList
            products={products}
            isLoading={isLoading}
            isError={isError}
            error={error}
            selectedIds={selectedIds}
            onToggleProduct={toggleProduct}
            allVisibleSelected={allVisibleSelected}
            someVisibleSelected={someVisibleSelected}
            onToggleAllVisible={toggleAllVisible}
            meta={meta}
            onPageChange={setPage}
            scrollHeight={filtersPanelHeight}
            marginPercent={marginPercent}
            marginValid={marginValid}
          />
        </div>
      </CardContent>
    </Card>
  )
}
