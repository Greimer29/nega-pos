import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import {
  SearchPickerInputShell,
  SearchPickerList,
} from '@/components/search-picker/search-picker-list'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMachineTypeLabel } from '@/features/machines/constants'
import { useMachinesQuery } from '@/features/machines/hooks/use-machines'
import type { Machine } from '@/features/machines/types'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'

export type MachineSearchPickerProps = {
  variant?: 'panel' | 'dropdown'
  excludeIds?: number[]
  onSelect: (machine: Machine) => void
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

function machineToPickerItem(machine: Machine) {
  return {
    id: String(machine.id),
    code: machine.type,
    title: machine.name,
    subtitle:
      [machine.brand, machine.model].filter(Boolean).join(' · ') ||
      formatMachineTypeLabel(machine.type),
    meta: formatMachineTypeLabel(machine.type),
  }
}

export function MachineSearchPicker({
  variant = 'panel',
  excludeIds = [],
  onSelect,
  enabled = true,
  label = 'Buscar máquina',
  placeholder = 'Nombre, marca o modelo…',
  className,
  inputClassName,
  perPage = 25,
  clearOnSelect = true,
  keepOpenOnSelect = false,
  autoFocus = false,
}: MachineSearchPickerProps) {
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const excludeSet = new Set(excludeIds)
  const queryEnabled = enabled && (variant === 'panel' || dropdownOpen)

  const { data, isLoading, isFetching } = useMachinesQuery(
    {
      page: 1,
      perPage,
      search: debouncedSearch || undefined,
      active: true,
    },
    { enabled: queryEnabled }
  )

  const machines = (data?.machines ?? []).filter((machine) => !excludeSet.has(machine.id))
  const pickerItems = machines.map(machineToPickerItem)
  const showDropdown = variant === 'dropdown' && dropdownOpen
  const showPanel = variant === 'panel'
  const loading = isLoading || (isFetching && machines.length === 0)

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
    const machine = machines.find((item) => item.id === Number(id))
    if (!machine) {
      return
    }

    onSelect(machine)

    if (clearOnSelect) {
      setSearch('')
    }

    if (!keepOpenOnSelect) {
      setDropdownOpen(false)
    }
  }

  const emptyMessage = debouncedSearch
    ? 'No hay máquinas que coincidan con tu búsqueda.'
    : 'No hay máquinas activas disponibles.'

  const hint = debouncedSearch
    ? `${machines.length} resultado${machines.length === 1 ? '' : 's'} — clic para agregar`
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
