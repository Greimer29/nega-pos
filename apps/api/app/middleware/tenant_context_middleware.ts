import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isMultiTenantEnabled } from '#utils/multi_tenant'
import { ensureTenantConnection } from '#utils/tenant_connection'
import { runWithTenant } from '#utils/tenant_context'
import { readTenantClaims } from '#services/directory_auth_service'

const PUBLIC_PREFIXES = ['/api/v1/auth/login', '/api/v1/auth/google', '/api/v1/csrf', '/health']
const PLATFORM_PREFIX = '/api/v1/platform'

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isPlatformPath(pathname: string): boolean {
  return pathname === PLATFORM_PREFIX || pathname.startsWith(`${PLATFORM_PREFIX}/`)
}

/**
 * Binds the tenant Lucid connection from session claims for the rest of the request.
 * Does not re-query the central directory.
 *
 * Must run before silent_auth so User is loaded from the company database.
 */
export default class TenantContextMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!isMultiTenantEnabled()) {
      return next()
    }

    const pathname = ctx.request.url().split('?')[0] ?? ''

    if (isPublicPath(pathname) || isPlatformPath(pathname) || pathname === '/health') {
      return next()
    }

    const claims = readTenantClaims(ctx.session)

    if (!claims) {
      return ctx.response.unauthorized({
        error: {
          code: 'TENANT_SESSION_MISSING',
          message: 'La sesión no tiene empresa asociada. Volvé a iniciar sesión.',
        },
      })
    }

    const connectionName = ensureTenantConnection(claims.dbName)

    return runWithTenant(
      {
        companyId: claims.companyId,
        dbName: claims.dbName,
        connectionName,
        directoryUserId: claims.directoryUserId,
      },
      async () => next()
    )
  }
}
