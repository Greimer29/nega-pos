import { useEffect } from 'react'
import { notifyApiError } from '@/features/notifications/query-error-state'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type ApiErrorMessageProps = {
  error?: unknown
  message?: string | null
  className?: string
  /**
   * `toast` (default): notificación emergente; no ocupa el body.
   * `inline`: mensaje en el lugar (formularios / diálogos).
   */
  mode?: 'toast' | 'inline'
  title?: string
}

export function ApiErrorMessage({
  error,
  message,
  className,
  mode = 'toast',
  title = 'No se pudo completar',
}: ApiErrorMessageProps) {
  const text = message ?? (error !== undefined ? getApiErrorMessage(error) : null)

  useEffect(() => {
    if (mode !== 'toast' || !text) return
    notifyApiError(text, title)
  }, [mode, text, title])

  if (!text || mode === 'toast') {
    return null
  }

  return (
    <p className={cn('text-destructive text-sm whitespace-pre-line', className)} role="alert">
      {text}
    </p>
  )
}
