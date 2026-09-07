import { AsyncLocalStorage } from 'node:async_hooks'

export type TenantStore = {
  companyId: number
  dbName: string
  connectionName: string
  directoryUserId: number
}

const tenantAls = new AsyncLocalStorage<TenantStore>()

export function runWithTenant<T>(store: TenantStore, fn: () => T): T {
  return tenantAls.run(store, fn)
}

export function getTenantStore(): TenantStore | undefined {
  return tenantAls.getStore()
}

export function requireTenantStore(): TenantStore {
  const store = tenantAls.getStore()
  if (!store) {
    throw new Error('No hay contexto de empresa en la sesión')
  }
  return store
}

export const TENANT_SESSION_KEY = 'nega_tenant'
