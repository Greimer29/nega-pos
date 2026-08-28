import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PrinterInfo } from '@/features/printing/types'

type PrinterSelectProps = {
  id: string
  printers: PrinterInfo[]
  value: string
  disabled?: boolean
  onChange: (deviceName: string) => void
}

export function PrinterSelect({ id, printers, value, disabled = false, onChange }: PrinterSelectProps) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selectedPrinter = printers.find((printer) => printer.name === value)
  const displayLabel = selectedPrinter
    ? `${selectedPrinter.name}${selectedPrinter.isDefault ? ' (predeterminada)' : ''}`
    : 'Seleccionar impresora…'

  useEffect(() => {
    if (!open || !triggerRef.current) {
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return
      }
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
        zIndex: 9999,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, printers.length])

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleSelect(deviceName: string) {
    onChange(deviceName)
    setOpen(false)
  }

  return (
    <div className="relative w-full max-w-md">
      {printers.length === 0 ? (
        <>
          <input
            id={id}
            type="text"
            disabled={disabled}
            value={value}
            placeholder="Nombre de impresora"
            className={cn(
              'border-input bg-background flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-sm',
              'focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onChange={(event) => onChange(event.target.value)}
          />
          <p className="text-muted-foreground mt-2 text-xs">
            No hay lista de impresoras (navegador o sin dispositivos). Podés escribir el nombre
            exacto de la impresora Windows.
          </p>
        </>
      ) : (
        <>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            className={cn(
              'border-input bg-background flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-sm transition-colors',
              'hover:bg-muted/40 focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none',
              disabled && 'cursor-not-allowed opacity-50',
              !value && 'text-muted-foreground'
            )}
            onClick={() => {
              if (!disabled) {
                setOpen((current) => !current)
              }
            }}
          >
            <span className="min-w-0 truncate text-left">{displayLabel}</span>
            <ChevronDown
              className={cn('size-4 shrink-0 opacity-60 transition-transform', open && 'rotate-180')}
            />
          </button>

          {open
            ? createPortal(
                <div
                  ref={menuRef}
                  id={listId}
                  role="listbox"
                  aria-label="Impresoras disponibles"
                  style={menuStyle}
                  className="bg-popover text-popover-foreground max-h-60 overflow-y-auto rounded-md border shadow-md"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={!value}
                    className={cn(
                      'hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                      !value && 'bg-muted/60'
                    )}
                    onClick={() => handleSelect('')}
                  >
                    <Check className={cn('size-4 shrink-0', !value ? 'opacity-100' : 'opacity-0')} />
                    <span className="text-muted-foreground">Seleccionar impresora…</span>
                  </button>
                  {printers.map((printer) => {
                    const selected = value === printer.name
                    return (
                      <button
                        key={printer.name}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          'hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                          selected && 'bg-primary/10 font-medium'
                        )}
                        onClick={() => handleSelect(printer.name)}
                      >
                        <Check
                          className={cn('size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
                        />
                        <span className="min-w-0 break-words">
                          {printer.name}
                          {printer.isDefault ? ' (predeterminada)' : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>,
                document.body
              )
            : null}
        </>
      )}
    </div>
  )
}
