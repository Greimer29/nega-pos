import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  SESSION_FILTER_PREFIX,
  clearSessionFilterKeys,
  hydrateSessionValue,
  readSessionJson,
  sessionFilterKey,
  writeSessionJson,
} from '@/lib/session-persisted-state'

function createSessionStorageMock() {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  } satisfies Storage
}

describe('session-persisted-state', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: createSessionStorageMock(),
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage')
  })

  it('builds scoped filter keys', () => {
    expect(sessionFilterKey('productos')).toBe(`${SESSION_FILTER_PREFIX}productos`)
    expect(sessionFilterKey('productos', 12)).toBe(`${SESSION_FILTER_PREFIX}c12:productos`)
    expect(sessionFilterKey('productos', null)).toBe(`${SESSION_FILTER_PREFIX}productos`)
  })

  it('writes and reads JSON values', () => {
    writeSessionJson(sessionFilterKey('productos', 1), { search: 'camisa', page: 2 })
    expect(readSessionJson<{ search: string; page: number }>(sessionFilterKey('productos', 1))).toEqual({
      search: 'camisa',
      page: 2,
    })
  })

  it('hydrates with shallow merge against defaults', () => {
    const defaults = { search: '', category: '', page: 1 }
    writeSessionJson(sessionFilterKey('productos'), { search: 'abc', page: 3 })
    expect(hydrateSessionValue(sessionFilterKey('productos'), defaults)).toEqual({
      search: 'abc',
      category: '',
      page: 3,
    })
  })

  it('falls back to defaults on corrupt JSON', () => {
    sessionStorage.setItem(sessionFilterKey('productos'), '{not-json')
    expect(hydrateSessionValue(sessionFilterKey('productos'), { page: 1 })).toEqual({ page: 1 })
  })

  it('falls back to defaults on wrong shape', () => {
    writeSessionJson(sessionFilterKey('productos'), 'oops')
    expect(hydrateSessionValue(sessionFilterKey('productos'), { page: 1 })).toEqual({ page: 1 })
  })

  it('clears only filter keys', () => {
    writeSessionJson(sessionFilterKey('productos', 1), { page: 2 })
    writeSessionJson(sessionFilterKey('materials', 1), { search: 'x' })
    sessionStorage.setItem('nega-pos:ventas-cart-draft', '{"keep":true}')
    sessionStorage.setItem('unrelated', '1')

    clearSessionFilterKeys()

    expect(sessionStorage.getItem(sessionFilterKey('productos', 1))).toBeNull()
    expect(sessionStorage.getItem(sessionFilterKey('materials', 1))).toBeNull()
    expect(sessionStorage.getItem('nega-pos:ventas-cart-draft')).toBe('{"keep":true}')
    expect(sessionStorage.getItem('unrelated')).toBe('1')
  })
})
