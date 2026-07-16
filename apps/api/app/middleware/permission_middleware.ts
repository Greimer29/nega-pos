import PermisoDenegadoException from '#exceptions/permiso_denegado_exception'
import { userHasAnyPermission, userHasPermission } from '#permissions/catalog'
import { resolveRoutePermission } from '#permissions/route_permissions'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (!user) {
      await ctx.auth.authenticateUsing(['web'])
    }

    const authenticatedUser = ctx.auth.getUserOrFail()
    const resolved = resolveRoutePermission(
      ctx.request.method(),
      ctx.request.url().split('?')[0] ?? ctx.request.url()
    )

    if (resolved === 'deny') {
      throw new PermisoDenegadoException()
    }

    if (resolved === 'auth_only') {
      return next()
    }

    const permissions = Array.isArray(authenticatedUser.permissions)
      ? authenticatedUser.permissions
      : null

    const allowed = Array.isArray(resolved)
      ? userHasAnyPermission(authenticatedUser.role, permissions, resolved)
      : userHasPermission(authenticatedUser.role, permissions, resolved)

    if (!allowed) {
      throw new PermisoDenegadoException()
    }

    return next()
  }
}
