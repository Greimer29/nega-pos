import { AlertCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { toast } from '@/features/notifications/toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

/** Muestra un toast de error a partir de un error de API (o string). */
export function notifyApiError(error: unknown, title = 'No se pudo completar la acción') {
  const message = typeof error === 'string' ? error : getApiErrorMessage(error)
  if (!message.trim()) return
  toast.error(message, title)
}

/** Dispara un toast cuando una query entra en error (sin duplicar en cada render). */
export function useQueryErrorToast(
  isError: boolean,
  error: unknown,
  options?: { title?: string; enabled?: boolean }
) {
  const lastKey = useRef<string | null>(null)
  const enabled = options?.enabled ?? true
  const title = options?.title ?? 'No se pudo cargar'

  useEffect(() => {
    if (!enabled || !isError || error == null) {
      if (!isError) lastKey.current = null
      return
    }

    const message = getApiErrorMessage(error)
    const key = `${title}::${message}`
    if (lastKey.current === key) return
    lastKey.current = key
    toast.error(message, title)
  }, [enabled, isError, error, title])
}

type QueryErrorStateProps = {
  isError: boolean
  error: unknown
  title?: string
  /** Texto corto en el body (el detalle va al toast). */
  fallbackLabel?: string
  className?: string
  /** Si false, no renderiza el empty state (solo toast). */
  showFallback?: boolean
}

/**
 * Toast con el detalle del error + empty state compacto en el body.
 * Reemplaza los bloques `text-destructive` largos en listados.
 */
export function QueryErrorState({
  isError,
  error,
  title = 'No se pudo cargar',
  fallbackLabel = 'No se pudo cargar la información.',
  className,
  showFallback = true,
}: QueryErrorStateProps) {
  useQueryErrorToast(isError, error, { title, enabled: isError })

  if (!isError || !showFallback) return null

  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-col items-center justify-center gap-2 py-12 text-center text-sm',
        className
      )}
      role="status"
    >
      <AlertCircle className="size-5 text-red-400" />
      <p className="font-medium text-neutral-700">{fallbackLabel}</p>
      <p className="max-w-sm text-xs text-neutral-500">
        Revisá la notificación arriba a la derecha para más detalle.
      </p>
    </div>
  )
}
