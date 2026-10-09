import { Transmit } from '@adonisjs/transmit-client'
import { useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  applyCompanyRealtimeEvent,
  invalidateAfterRealtimeReconnect,
  parseCompanyRealtimePayload,
} from '@/lib/realtime-events'
import { ensureCsrfToken, getCachedCsrfToken, getTransmitBaseUrl } from '@/lib/api'
import { queryClient } from '@/lib/query-client'

function applyTransmitCsrfHeaders(request: Request) {
  const plain = getCachedCsrfToken()
  if (plain) {
    request.headers.set('X-CSRF-TOKEN', plain)
    request.headers.delete('X-XSRF-TOKEN')
    return
  }

  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  if (match) {
    request.headers.set('X-XSRF-TOKEN', decodeURIComponent(match[1]))
  }
}

function companyChannel(companyId: number): string {
  return `company/${companyId}`
}

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS / localhost).
 * LAN clients use http://192.168.x.x — need a fallback for Transmit uid.
 */
function createTransmitUid(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `uid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * Subscribes to the company SSE channel and invalidates TanStack Query caches
 * when other cajas mutate shared data.
 */
export function CompanyRealtimeProvider({ children }: { children: ReactNode }) {
  const { company, user } = useAuth()
  const companyId = company?.id ?? null
  const userId = user?.id ?? null
  const hadConnectionRef = useRef(false)

  useEffect(() => {
    if (userId == null || companyId == null) {
      return
    }

    const activeCompanyId: number = companyId
    let cancelled = false
    let transmit: Transmit | null = null
    let subscription: ReturnType<Transmit['subscription']> | null = null
    let ensureTimer: ReturnType<typeof setInterval> | null = null

    const onConnected = () => {
      if (hadConnectionRef.current) {
        invalidateAfterRealtimeReconnect(queryClient)
      }
      hadConnectionRef.current = true
      if (import.meta.env.DEV) {
        console.info('[realtime] EventSource connected')
      }
      void subscription?.create()
    }

    async function connect() {
      try {
        await ensureCsrfToken()
        if (cancelled) {
          return
        }

        const baseUrl = getTransmitBaseUrl()
        transmit = new Transmit({
          baseUrl,
          uidGenerator: createTransmitUid,
          maxReconnectAttempts: 50,
          beforeSubscribe: applyTransmitCsrfHeaders,
          beforeUnsubscribe: applyTransmitCsrfHeaders,
          onSubscribeFailed: (response) => {
            console.warn('[realtime] subscribe falló', response.status, response.statusText)
          },
          onSubscription: (channel) => {
            if (import.meta.env.DEV) {
              console.info('[realtime] suscrito a', channel)
            }
          },
        })

        transmit.on('connected', onConnected)

        subscription = transmit.subscription(companyChannel(activeCompanyId))
        subscription.onMessage((data) => {
          const payload = parseCompanyRealtimePayload(data)
          if (!payload) {
            if (import.meta.env.DEV) {
              console.warn('[realtime] payload ignorado', data)
            }
            return
          }
          if (import.meta.env.DEV) {
            console.info('[realtime] evento', payload.event)
          }
          applyCompanyRealtimeEvent(queryClient, payload.event)
        })

        await subscription.create()

        // LAN / proxy races: keep trying until the channel is actually created.
        ensureTimer = setInterval(() => {
          if (cancelled || !subscription) {
            return
          }
          if (!subscription.isCreated) {
            void subscription.create()
          }
        }, 3000)
      } catch (error) {
        if (!cancelled) {
          console.warn('[realtime] No se pudo suscribir al canal de empresa', error)
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
      if (ensureTimer) {
        clearInterval(ensureTimer)
      }
      const sub = subscription
      const tx = transmit
      subscription = null
      transmit = null
      if (tx) {
        tx.off('connected', onConnected)
        tx.close()
      }
      void sub?.delete().catch(() => undefined)
    }
  }, [companyId, userId])

  return children
}
