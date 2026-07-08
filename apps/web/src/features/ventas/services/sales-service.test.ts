import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.fn()
const apiPost = vi.fn()
const apiPut = vi.fn()
const apiDelete = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    put: (...args: unknown[]) => apiPut(...args),
    delete: (...args: unknown[]) => apiDelete(...args),
  },
}))

import {
  confirmSale,
  createSale,
  getSale,
  returnSale,
  transitionSale,
  updateSale,
} from './sales-service'

describe('sales-service id validation', () => {
  beforeEach(() => {
    apiGet.mockReset()
    apiPost.mockReset()
    apiPut.mockReset()
    apiDelete.mockReset()
  })

  it('rejects invalid ids before calling the API', async () => {
    await expect(getSale(0)).rejects.toThrow(/ID de factura inválido/)
    await expect(updateSale(NaN, { lines: [] })).rejects.toThrow(/ID de factura inválido/)
    await expect(confirmSale(-1)).rejects.toThrow(/ID de factura inválido/)
    await expect(transitionSale(0, 'IN_PROCESS')).rejects.toThrow(/ID de factura inválido/)
    await expect(returnSale(Number('abc'))).rejects.toThrow(/ID de factura inválido/)

    expect(apiGet).not.toHaveBeenCalled()
    expect(apiPost).not.toHaveBeenCalled()
    expect(apiPut).not.toHaveBeenCalled()
  })

  it('parses nested sale response from GET /sales/:id', async () => {
    apiGet.mockResolvedValueOnce({
      data: {
        data: {
          sale: {
            id: 7,
            code: '0000000007',
            status: 'CONFIRMED',
          },
        },
      },
    })

    const sale = await getSale(7)
    expect(apiGet).toHaveBeenCalledWith('/sales/7')
    expect(sale.id).toBe(7)
    expect(sale.code).toBe('0000000007')
  })

  it('rejects createSale response without valid id', async () => {
    apiPost.mockResolvedValueOnce({
      data: {
        data: {
          sale: {
            id: 0,
            code: '0000000000',
          },
        },
      },
    })

    await expect(
      createSale({
        guest_name: 'Test',
        payment_method_code: 'cash_usd',
        billing_mode: 'FAST',
        payment_type: 'CASH',
        lines: [],
      })
    ).rejects.toThrow(/sin ID válido/)
  })
})
