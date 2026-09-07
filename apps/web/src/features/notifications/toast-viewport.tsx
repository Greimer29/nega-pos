import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  subscribeToasts,
  toast as toastApi,
  type ToastItem,
  type ToastVariant,
} from '@/features/notifications/toast'
import { cn } from '@/lib/utils'

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    panel: string
    iconWrap: string
    icon: typeof AlertCircle
  }
> = {
  error: {
    panel: 'border-red-200/80 bg-white shadow-[0_12px_40px_-16px_rgba(127,29,29,0.35)]',
    iconWrap: 'bg-red-50 text-red-600',
    icon: AlertCircle,
  },
  warning: {
    panel: 'border-amber-200/80 bg-white shadow-[0_12px_40px_-16px_rgba(146,64,14,0.3)]',
    iconWrap: 'bg-amber-50 text-amber-700',
    icon: AlertTriangle,
  },
  success: {
    panel: 'border-emerald-200/80 bg-white shadow-[0_12px_40px_-16px_rgba(6,95,70,0.3)]',
    iconWrap: 'bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  info: {
    panel: 'border-neutral-200 bg-white shadow-[0_12px_40px_-16px_rgba(23,23,23,0.25)]',
    iconWrap: 'bg-neutral-100 text-neutral-700',
    icon: Info,
  },
}

function ToastCard({ item }: { item: ToastItem }) {
  const styles = VARIANT_STYLES[item.variant]
  const Icon = styles.icon

  return (
    <div
      role="status"
      aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex w-[min(100vw-2rem,22rem)] gap-3 rounded-2xl border p-3.5 animate-in fade-in slide-in-from-right-4 duration-300',
        styles.panel
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
          styles.iconWrap
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold tracking-tight text-neutral-900">{item.title}</p>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-neutral-600">
          {item.description}
        </p>
      </div>
      <button
        type="button"
        aria-label="Cerrar notificación"
        className="text-neutral-400 transition-colors hover:text-neutral-700"
        onClick={() => toastApi.dismiss(item.id)}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setItems), [])

  if (items.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[100] flex max-h-[calc(100svh-2rem)] flex-col gap-2.5 overflow-y-auto"
      aria-label="Notificaciones"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  )
}
