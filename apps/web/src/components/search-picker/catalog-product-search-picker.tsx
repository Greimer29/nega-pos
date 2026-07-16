import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  SearchPickerInputShell,
  SearchPickerList,
} from '@/components/search-picker/search-picker-list'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCatalogProductsQuery } from '@/features/ventas/hooks/use-catalog'
import type { CatalogProduct } from '@/features/ventas/types'
import { catalogProductCode } from '@/features/ventas/components/ventas-order-cart'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'

export type CatalogProductSearchPickerProps = {
  variant?: 'panel' | 'dropdown'
  excludeIds?: number[]
  onSelect: (product: CatalogProduct) => void
  enabled?: boolean
  label?: string
  placeholder?: string
  className?: string
  inputClassName?: string
  perPage?: number
  clearOnSelect?: boolean
  keepOpenOnSelect?: boolean
  autoFocus?: boolean
}

function productToPickerItem(product: CatalogProduct) {
  return {
    id: String(product.id),
    code: catalogProductCode(product.id),
    title: product.name,
    subtitle: product.category || undefined,
    meta: product.sale_unit,
  }
}

export function CatalogProductSearchPicker({
  variant = 'panel',
  excludeIds = [],
  onSelect,
  enabled = true,
  label = 'Buscar producto',
  placeholder = 'Código o nombre del producto…',
  className,
  inputClassName,
  perPage = 25,
  clearOnSelect = true,
  keepOpenOnSelect = false,
  autoFocus = false,
}: CatalogProductSearchPickerProps) {
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const excludeSet = new Set(excludeIds)
  const queryEnabled = enabled && (variant === 'panel' || dropdownOpen)

  const { data, isLoading, isFetching } = useCatalogProductsQuery(
    {
      page: 1,
      perPage,
      search: debouncedSearch || undefined,
      active: true,
    },
    { enabled: queryEnabled }
  )

  const products = (data?.catalog_products ?? []).filter((product) => !excludeSet.has(product.id))
  const pickerItems = products.map(productToPickerItem)
  const showDropdown = variant === 'dropdown' && dropdownOpen
  const showPanel = variant === 'panel'
  const loading = isLoading || (isFetching && products.length === 0)

  useEffect(() => {
    if (variant !== 'dropdown' || !dropdownOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [dropdownOpen, variant])

  function handleSelect(id: string) {
    const product = products.find((item) => item.id === Number(id))
    if (!product) {
      return
    }

    onSelect(product)

    if (clearOnSelect) {
      setSearch('')
    }

    if (!keepOpenOnSelect) {
      setDropdownOpen(false)
    }
  }

  const emptyMessage = debouncedSearch
    ? 'No hay productos que coincidan con tu búsqueda.'
    : 'No hay productos activos disponibles.'

  const hint = debouncedSearch
    ? `${products.length} resultado${products.length === 1 ? '' : 's'} — clic para agregar`
    : 'Escribí para filtrar o elegí de la lista'

  const input = (
    <SearchPickerInputShell icon={<Search className="size-4" />}>
      <Input
        id={inputId}
        autoFocus={autoFocus}
        className={cn('pl-9', inputClassName)}
        placeholder={placeholder}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value)
          if (variant === 'dropdown') {
            setDropdownOpen(true)
          }
        }}
        onFocus={() => {
          if (variant === 'dropdown') {
            setDropdownOpen(true)
          }
        }}
      />
    </SearchPickerInputShell>
  )

  const list = (
    <SearchPickerList
      items={pickerItems}
      isLoading={loading}
      emptyMessage={emptyMessage}
      hint={pickerItems.length > 0 ? hint : undefined}
      onSelect={handleSelect}
      className={variant === 'dropdown' ? 'mt-1 shadow-md' : undefined}
    />
  )

  return (
    <div ref={rootRef} className={cn(variant === 'dropdown' ? 'relative' : 'space-y-2', className)}>
      {label ? (
        <Label htmlFor={inputId} className={variant === 'dropdown' ? 'sr-only' : undefined}>
          {label}
        </Label>
      ) : null}

      {input}

      {showPanel ? list : null}

      {showDropdown ? <div className="absolute z-20 mt-1 w-full min-w-[280px]">{list}</div> : null}
    </div>
  )
}
