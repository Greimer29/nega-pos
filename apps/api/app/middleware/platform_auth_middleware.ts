import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import PlatformAdmin from '#models/platform_admin'

export const PLATFORM_SESSION_KEY = 'platform_admin'

export type PlatformSessionClaims = {
  id: number
  email: string
}

export function readPlatformClaims(session: HttpContext['session']): PlatformSessionClaims | null {
  const raw = session.get(PLATFORM_SESSION_KEY)
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const claims = raw as Partial<PlatformSessionClaims>
  if (typeof claims.id !== 'number' || typeof claims.email !== 'string') {
    return null
  }
  return claims as PlatformSessionClaims
}

export default class PlatformAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const claims = readPlatformClaims(ctx.session)
    if (!claims) {
      return ctx.response.unauthorized({
        error: {
          code: 'PLATFORM_UNAUTHORIZED',
          message: 'Debés iniciar sesión como super admin',
        },
      })
    }

    const admin = await PlatformAdmin.find(claims.id)
    if (!admin || !admin.active) {
      ctx.session.forget(PLATFORM_SESSION_KEY)
      return ctx.response.unauthorized({
        error: {
          code: 'PLATFORM_UNAUTHORIZED',
          message: 'Super admin inactivo o inexistente',
        },
      })
    }

    ctx.platformAdmin = admin
    return next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    platformAdmin?: PlatformAdmin
  }
}
