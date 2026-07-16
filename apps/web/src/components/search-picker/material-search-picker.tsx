import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  SearchPickerInputShell,
  SearchPickerList,
} from '@/components/search-picker/search-picker-list'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMaterialsQuery } from '@/features/materials/hooks/use-materials'
import type { Material } from '@/features/materials/types'
import { inventoryUnitAbrev } from '@/lib/inventory-units'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'

export type MaterialSearchPickerProps = {
  variant?: 'panel' | 'dropdown'
  excludeIds?: number[]
  onSelect: (material: Material) => void
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

function materialToPickerItem(material: Material) {
  return {
    id: String(material.id),
    code: material.code,
    title: material.name,
    subtitle: material.category ? material.category : undefined,
    meta: inventoryUnitAbrev(material.unit),
  }
}

export function MaterialSearchPicker({
  variant = 'panel',
  excludeIds = [],
  onSelect,
  enabled = true,
  label = 'Buscar material',
  placeholder = 'Código o nombre del material…',
  className,
  inputClassName,
  perPage = 25,
  clearOnSelect = true,
  keepOpenOnSelect = false,
  autoFocus = false,
}: MaterialSearchPickerProps) {
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const excludeSet = new Set(excludeIds)
  const queryEnabled = enabled && (variant === 'panel' || dropdownOpen)

  const { data, isLoading, isFetching } = useMaterialsQuery(
    {
      page: 1,
      perPage,
      search: debouncedSearch || undefined,
      status: 'active',
    },
    { enabled: queryEnabled }
  )

  const materials = (data?.materials ?? []).filter((material) => !excludeSet.has(material.id))
  const pickerItems = materials.map(materialToPickerItem)
  const showDropdown = variant === 'dropdown' && dropdownOpen
  const showPanel = variant === 'panel'
  const loading = isLoading || (isFetching && materials.length === 0)

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
    const material = materials.find((item) => item.id === Number(id))
    if (!material) {
      return
    }

    onSelect(material)

    if (clearOnSelect) {
      setSearch('')
    }

    if (!keepOpenOnSelect) {
      setDropdownOpen(false)
    }
  }

  const emptyMessage = debouncedSearch
    ? 'No hay materiales que coincidan con tu búsqueda.'
    : 'No hay materiales activos disponibles.'

  const hint = debouncedSearch
    ? `${materials.length} resultado${materials.length === 1 ? '' : 's'} — clic para agregar`
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
      className={variant === 'dropdown' ? 'shadow-md' : undefined}
    />
  )

  return (
    <div
      ref={rootRef}
      className={cn(variant === 'dropdown' ? 'relative' : 'space-y-2', className)}
    >
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
