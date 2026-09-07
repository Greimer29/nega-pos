import { getTenantStore } from '#utils/tenant_context'
import { isMultiTenantEnabled } from '#utils/multi_tenant'

/**
 * Prefixes Drive object keys with the current tenant company id.
 * Existing keys that already start with `t_<id>/` are left unchanged.
 */
export function tenantStorageKey(relativeKey: string): string {
  if (!isMultiTenantEnabled()) {
    return relativeKey
  }

  const store = getTenantStore()
  if (!store) {
    return relativeKey
  }

  const prefix = `t_${store.companyId}/`
  if (relativeKey.startsWith(prefix)) {
    return relativeKey
  }

  return `${prefix}${relativeKey.replace(/^\/+/, '')}`
}
