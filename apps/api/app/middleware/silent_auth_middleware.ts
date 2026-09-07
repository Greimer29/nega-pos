import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Silently hydrates the web auth user when a session exists.
 * Skips platform routes (they use platform_admin session, not tenant User).
 * Never fails the request if the tenant users table is missing or session is stale.
 */
export default class SilentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const pathname = ctx.request.url().split('?')[0] ?? ''

    if (pathname === '/api/v1/platform' || pathname.startsWith('/api/v1/platform/')) {
      return next()
    }

    try {
      await ctx.auth.check()
    } catch {
      // Stale cookie / wrong DB (e.g. railway.users after multi-tenant cutover).
    }

    return next()
  }
}
