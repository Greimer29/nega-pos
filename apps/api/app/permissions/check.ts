import PermisoDenegadoException from '#exceptions/permiso_denegado_exception'
import { userHasPermission, type PermissionKey } from '#permissions/catalog'
import type User from '#models/user'

export function assertPermission(user: User, permission: PermissionKey) {
  const permissions = Array.isArray(user.permissions) ? user.permissions : null

  if (!userHasPermission(user.role, permissions, permission)) {
    throw new PermisoDenegadoException()
  }
}
