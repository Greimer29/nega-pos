import env from '#start/env'

export function isMultiTenantEnabled(): boolean {
  return env.get('MULTI_TENANT_ENABLED') === true
}
