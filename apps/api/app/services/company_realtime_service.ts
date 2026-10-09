import { companyRealtimeChannel, type CompanyRealtimeEvent } from '#constants/realtime_events'
import { getTenantStore } from '#utils/tenant_context'
import logger from '@adonisjs/core/services/logger'
import transmit from '@adonisjs/transmit/services/main'

export type CompanyRealtimePayload = {
  event: CompanyRealtimeEvent
  at: string
}

/**
 * Broadcasts invalidation signals to all online clients of the current company.
 * Safe no-op outside HTTP tenant context (jobs/tests without store).
 */
export default class CompanyRealtimeService {
  broadcast(event: CompanyRealtimeEvent, companyId?: number): void {
    const id = companyId ?? getTenantStore()?.companyId
    if (id === undefined || id === null) {
      return
    }

    const payload: CompanyRealtimePayload = {
      event,
      at: new Date().toISOString(),
    }

    try {
      const channel = companyRealtimeChannel(id)
      const subscribers = transmit.getSubscribersFor(channel)
      transmit.broadcast(channel, payload)
      logger.info(
        { companyId: id, event, channel, subscribers: subscribers.length },
        'Realtime broadcast'
      )
    } catch (error) {
      logger.warn({ err: error, companyId: id, event }, 'Realtime broadcast failed')
    }
  }
}

/** Convenience for `new Service()` call sites without DI. */
export function broadcastCompanyEvent(event: CompanyRealtimeEvent, companyId?: number): void {
  new CompanyRealtimeService().broadcast(event, companyId)
}
