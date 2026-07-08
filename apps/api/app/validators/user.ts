import vine from '@vinejs/vine'
import { allPermissions, type PermissionKey } from '#permissions/catalog'

const PERMISSION_ENUM = allPermissions() as [PermissionKey, ...PermissionKey[]]

const email = () => vine.string().email().maxLength(150)
const password = () => vine.string().minLength(8).maxLength(255)
const permissions = () => vine.array(vine.enum(PERMISSION_ENUM)).optional()

export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

export const listUsersValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  active: vine.boolean().optional(),
})

export const createUserValidator = vine.create({
  name: vine.string().trim().maxLength(100),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  role: vine.enum(['OPERATOR', 'ADMIN'] as const),
  permissions: permissions(),
  active: vine.boolean().optional(),
})

export const updateUserValidator = vine.create({
  name: vine.string().trim().maxLength(100).optional(),
  email: email().optional(),
  password: password().optional(),
  role: vine.enum(['OPERATOR', 'ADMIN'] as const).optional(),
  permissions: permissions(),
  active: vine.boolean().optional(),
})

export const updateUserActiveValidator = vine.create({
  active: vine.boolean(),
})
