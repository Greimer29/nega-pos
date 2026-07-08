import EmailDuplicadoException from '#exceptions/email_duplicado_exception'
import UltimoAdminException from '#exceptions/ultimo_admin_exception'
import UsuarioNoEncontradoException from '#exceptions/usuario_no_encontrado_exception'
import User from '#models/user'
import { sanitizePermissions, type PermissionKey } from '#permissions/catalog'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type UserInput = {
  name: string
  email: string
  password?: string
  role: 'ADMIN' | 'OPERATOR'
  permissions?: PermissionKey[]
  active?: boolean
}

export type ListUsersFilters = {
  page?: number
  perPage?: number
  search?: string
  active?: boolean
}

export default class UserService {
  async listar(filters: ListUsersFilters = {}): Promise<ModelPaginatorContract<User>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const query = User.query().orderBy('name', 'asc')

    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike('name', `%${filters.search}%`)
          .orWhereILike('email', `%${filters.search}%`)
      })
    }

    if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<User> {
    const user = await User.find(id)
    if (!user) {
      throw new UsuarioNoEncontradoException()
    }
    return user
  }

  async crear(input: UserInput): Promise<User> {
    await this.assertEmailUnico(input.email)

    return User.create({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password!,
      role: input.role,
      permissions: input.role === 'OPERATOR' ? sanitizePermissions(input.permissions) : null,
      active: input.active ?? true,
    })
  }

  async actualizar(id: number, input: Partial<UserInput>, actorId?: number): Promise<User> {
    const user = await this.obtener(id)

    if (input.email && input.email.trim().toLowerCase() !== user.email) {
      await this.assertEmailUnico(input.email, id)
      user.email = input.email.trim().toLowerCase()
    }

    if (input.name !== undefined) {
      user.name = input.name.trim()
    }

    if (input.password) {
      user.password = input.password
    }

    if (input.role !== undefined) {
      if (input.role === 'OPERATOR' && user.role === 'ADMIN') {
        await this.assertNotLastActiveAdmin(user.id)
      }
      user.role = input.role
    }

    if (input.permissions !== undefined) {
      user.permissions =
        (input.role ?? user.role) === 'OPERATOR' ? sanitizePermissions(input.permissions) : null
    } else if (input.role === 'ADMIN') {
      user.permissions = null
    }

    if (input.active !== undefined) {
      if (!input.active && user.role === 'ADMIN') {
        await this.assertNotLastActiveAdmin(user.id)
      }
      if (actorId && actorId === Number(user.id) && !input.active) {
        throw new UltimoAdminException('No podés desactivar tu propia cuenta')
      }
      user.active = input.active
    }

    await user.save()
    return user
  }

  async actualizarActivo(id: number, active: boolean, actorId?: number): Promise<User> {
    return this.actualizar(id, { active }, actorId)
  }

  private async assertEmailUnico(email: string, ignoreId?: number) {
    const query = User.query().whereILike('email', email.trim())
    if (ignoreId) {
      query.whereNot('id', ignoreId)
    }
    const existing = await query.first()
    if (existing) {
      throw new EmailDuplicadoException()
    }
  }

  private async assertNotLastActiveAdmin(userId: number | bigint) {
    const activeAdmins = await User.query()
      .where('role', 'ADMIN')
      .where('active', true)
      .count('* as total')

    const total = Number(activeAdmins[0]?.$extras.total ?? 0)
    const user = await User.find(userId)
    if (user?.role === 'ADMIN' && user.active && total <= 1) {
      throw new UltimoAdminException()
    }
  }
}
