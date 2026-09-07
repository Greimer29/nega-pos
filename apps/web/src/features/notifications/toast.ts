export type ToastVariant = 'error' | 'success' | 'warning' | 'info'

export type ToastInput = {
  title?: string
  description: string
  variant?: ToastVariant
  durationMs?: number
}

export type ToastItem = {
  id: string
  title: string
  description: string
  variant: ToastVariant
  durationMs: number
  createdAt: number
}

type Listener = (toasts: ToastItem[]) => void

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  error: 7000,
  warning: 6000,
  info: 4500,
  success: 3500,
}

const DEFAULT_TITLE: Record<ToastVariant, string> = {
  error: 'Error',
  warning: 'Atención',
  info: 'Aviso',
  success: 'Listo',
}

const MAX_TOASTS = 4

let toasts: ToastItem[] = []
const listeners = new Set<Listener>()
const recentKeys = new Map<string, number>()
const timers = new Map<string, number>()

function emit() {
  const snapshot = toasts
  for (const listener of listeners) {
    listener(snapshot)
  }
}

function removeToast(id: string) {
  const timer = timers.get(id)
  if (timer != null) {
    window.clearTimeout(timer)
    timers.delete(id)
  }
  const next = toasts.filter((toast) => toast.id !== id)
  if (next.length === toasts.length) return
  toasts = next
  emit()
}

function scheduleDismiss(id: string, durationMs: number) {
  if (durationMs <= 0) return
  const timer = window.setTimeout(() => removeToast(id), durationMs)
  timers.set(id, timer)
}

function dedupeKey(variant: ToastVariant, title: string, description: string) {
  return `${variant}:${title}:${description}`
}

function pushToast(input: ToastInput): string {
  const variant = input.variant ?? 'info'
  const title = input.title?.trim() || DEFAULT_TITLE[variant]
  const description = input.description.trim()
  if (!description) return ''

  const key = dedupeKey(variant, title, description)
  const now = Date.now()
  const lastShown = recentKeys.get(key)
  if (lastShown != null && now - lastShown < 2500) {
    return ''
  }
  recentKeys.set(key, now)

  const id = `${now}-${Math.random().toString(36).slice(2, 9)}`
  const durationMs = input.durationMs ?? DEFAULT_DURATION[variant]
  const item: ToastItem = {
    id,
    title,
    description,
    variant,
    durationMs,
    createdAt: now,
  }

  toasts = [item, ...toasts].slice(0, MAX_TOASTS)
  emit()
  scheduleDismiss(id, durationMs)
  return id
}

export const toast = {
  show(input: ToastInput) {
    return pushToast(input)
  },
  error(description: string, title?: string) {
    return pushToast({ variant: 'error', description, title })
  },
  success(description: string, title?: string) {
    return pushToast({ variant: 'success', description, title })
  },
  warning(description: string, title?: string) {
    return pushToast({ variant: 'warning', description, title })
  },
  info(description: string, title?: string) {
    return pushToast({ variant: 'info', description, title })
  },
  dismiss(id: string) {
    removeToast(id)
  },
  clear() {
    for (const id of timers.keys()) {
      window.clearTimeout(timers.get(id))
    }
    timers.clear()
    toasts = []
    emit()
  },
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener)
  listener(toasts)
  return () => {
    listeners.delete(listener)
  }
}

export function getToasts() {
  return toasts
}
