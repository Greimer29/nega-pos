import { useCallback, useEffect, useState } from 'react'

export const SESSION_FILTER_PREFIX = 'nega-pos:filters:'

/**
 * Builds a sessionStorage key for list filters, scoped by company when known.
 * Example: `nega-pos:filters:c12:productos` or `nega-pos:filters:productos`.
 */
export function sessionFilterKey(screen: string, companyId?: number | null): string {
  const scope =
    typeof companyId === 'number' && Number.isFinite(companyId) && companyId > 0
      ? `c${companyId}:`
      : ''
  return `${SESSION_FILTER_PREFIX}${scope}${screen}`
}

export function readSessionJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeSessionJson(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // sessionStorage full or unavailable — ignore.
  }
}

/**
 * Restores a value from sessionStorage with a safe merge against defaults.
 * Corrupt / mismatched shapes fall back to defaults (objects get a shallow merge).
 */
export function hydrateSessionValue<T>(key: string, defaults: T): T {
  const stored = readSessionJson<unknown>(key)
  if (stored === null || stored === undefined) {
    return defaults
  }

  if (typeof defaults !== 'object' || defaults === null || Array.isArray(defaults)) {
    return typeof stored === typeof defaults ? (stored as T) : defaults
  }

  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    return defaults
  }

  return { ...defaults, ...(stored as Record<string, unknown>) } as T
}

export function clearSessionFilterKeys(): void {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(SESSION_FILTER_PREFIX)) {
        toRemove.push(key)
      }
    }
    for (const key of toRemove) {
      sessionStorage.removeItem(key)
    }
  } catch {
    // sessionStorage unavailable — ignore.
  }
}

/**
 * useState backed by sessionStorage. Restores on mount; writes on every change.
 * Corrupt / missing values fall back to `defaults`.
 */
export function useSessionPersistedState<T>(
  key: string,
  defaults: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => hydrateSessionValue(key, defaults))

  useEffect(() => {
    writeSessionJson(key, state)
  }, [key, state])

  // When the storage key changes (e.g. company switch), reload from that key.
  useEffect(() => {
    setState(hydrateSessionValue(key, defaults))
    // Only re-hydrate when the key identity changes, not when defaults object identity does.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key-driven reset
  }, [key])

  const setPersisted = useCallback((value: T | ((prev: T) => T)) => {
    setState(value)
  }, [])

  return [state, setPersisted]
}
