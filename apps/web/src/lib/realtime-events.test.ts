import { describe, expect, it, vi } from 'vitest'
import {
  applyCompanyRealtimeEvent,
  parseCompanyRealtimePayload,
} from '@/lib/realtime-events'
import type { QueryClient } from '@tanstack/react-query'

describe('realtime-events', () => {
  it('parsea payload válido', () => {
    const parsed = parseCompanyRealtimePayload({
      event: 'sale.changed',
      at: '2026-10-09T12:00:00.000Z',
    })
    expect(parsed).toEqual({
      event: 'sale.changed',
      at: '2026-10-09T12:00:00.000Z',
    })
  })

  it('rechaza eventos desconocidos', () => {
    expect(parseCompanyRealtimePayload({ event: 'foo.bar' })).toBeNull()
    expect(parseCompanyRealtimePayload(null)).toBeNull()
  })

  it('invalida sales-shifts, dashboard y reports en shift.changed', () => {
    const invalidateQueries = vi.fn()
    const queryClient = { invalidateQueries } as unknown as QueryClient
    applyCompanyRealtimeEvent(queryClient, 'shift.changed')
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sales-shifts'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports'] })
  })

  it('invalida users, dashboard y reports en user.changed', () => {
    const invalidateQueries = vi.fn()
    const queryClient = { invalidateQueries } as unknown as QueryClient
    applyCompanyRealtimeEvent(queryClient, 'user.changed')
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['users'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reports'] })
  })
})
