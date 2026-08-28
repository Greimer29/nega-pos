import { Clock, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  useCloseSalesShiftMutation,
  useCurrentSalesShiftQuery,
  useOpenSalesShiftMutation,
} from '@/features/ventas/hooks/use-sales-shifts'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

function formatShiftDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type VentasShiftControlsProps = {
  className?: string
  /** Botón a ancho completo (útil en carrito). */
  fullWidth?: boolean
  /** Alineación del mensaje de error. */
  align?: 'start' | 'end'
  /**
   * Solo icono en viewport móvil; desde `sm` muestra texto.
   * Si es `true`, siempre solo icono.
   */
  iconOnly?: boolean | 'mobile'
}

export function VentasShiftControls({
  className,
  fullWidth = false,
  align = 'end',
  iconOnly = false,
}: VentasShiftControlsProps) {
  const { can } = useAuth()
  const canConfirm = can('ventas.confirm')
  const { data: shift, isLoading } = useCurrentSalesShiftQuery()
  const openMutation = useOpenSalesShiftMutation()
  const closeMutation = useCloseSalesShiftMutation()
  const [error, setError] = useState<string | null>(null)

  const busy = openMutation.isPending || closeMutation.isPending
  const alwaysIcon = iconOnly === true
  const mobileIcon = iconOnly === 'mobile'
  const showLabelClass = alwaysIcon ? 'sr-only' : mobileIcon ? 'hidden sm:inline' : undefined
  const buttonClassName = cn(
    fullWidth && 'w-full',
    (alwaysIcon || mobileIcon) && 'size-8 shrink-0 px-0',
    mobileIcon && 'sm:h-8 sm:w-auto sm:px-3'
  )

  async function handleOpen() {
    setError(null)
    try {
      await openMutation.mutateAsync(undefined)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleClose() {
    if (!shift) return
    if (
      !window.confirm(
        '¿Cerrar el turno actual? Las ventas nuevas requerirán abrir otro turno.'
      )
    ) {
      return
    }

    setError(null)
    try {
      await closeMutation.mutateAsync(shift.id)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  if (!canConfirm) {
    return null
  }

  if (isLoading) {
    return (
      <div className={cn(fullWidth && 'w-full', className)}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled
          className={buttonClassName}
          title="Turno"
          aria-label="Cargando turno"
        >
          <Loader2 className="size-4 animate-spin" />
          {showLabelClass ? <span className={showLabelClass}>Turno…</span> : 'Turno…'}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        align === 'end' ? 'items-end' : 'items-stretch',
        fullWidth && 'w-full',
        className
      )}
    >
      {!shift ? (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          className={buttonClassName}
          title="Abrir turno"
          aria-label="Abrir turno"
          onClick={() => void handleOpen()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
          {showLabelClass ? <span className={showLabelClass}>Abrir turno</span> : 'Abrir turno'}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          className={buttonClassName}
          title={`Cerrar turno · abierto desde ${formatShiftDateTime(shift.opened_at)}`}
          aria-label="Cerrar turno"
          onClick={() => void handleClose()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          {showLabelClass ? <span className={showLabelClass}>Cerrar turno</span> : 'Cerrar turno'}
        </Button>
      )}
      {error ? (
        <p
          className={cn(
            'text-destructive text-xs',
            align === 'end' ? 'max-w-[12rem] text-right' : 'text-left'
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
