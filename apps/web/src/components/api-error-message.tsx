import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type ApiErrorMessageProps = {
  error?: unknown
  message?: string | null
  className?: string
}

export function ApiErrorMessage({ error, message, className }: ApiErrorMessageProps) {
  const text = message ?? (error !== undefined ? getApiErrorMessage(error) : null)

  if (!text) {
    return null
  }

  return (
    <p className={cn('text-destructive text-sm whitespace-pre-line', className)} role="alert">
      {text}
    </p>
  )
}
