import UserService from '#services/user_service'
import { serializeUser } from '#transformers/user_transformer'
import {
  createUserValidator,
  listUsersValidator,
  updateUserActiveValidator,
  updateUserValidator,
} from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  private service = new UserService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listUsersValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      active: filters.active,
    })

    return serialize({
      users: paginator.all().map((user) => serializeUser(user)),
      meta: paginator.getMeta(),
    })
  }

  async show({ params, serialize }: HttpContext) {
    const user = await this.service.obtener(Number(params.id))
    return serialize({ user: serializeUser(user) })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createUserValidator)
    const user = await this.service.crear(payload)

    return serialize({ user: serializeUser(user) })
  }

  async update({ params, request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateUserValidator)
    const actor = auth.getUserOrFail()
    const user = await this.service.actualizar(Number(params.id), payload, Number(actor.id))

    return serialize({ user: serializeUser(user) })
  }

  async updateActive({ params, request, auth, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateUserActiveValidator)
    const actor = auth.getUserOrFail()
    const user = await this.service.actualizarActivo(
      Number(params.id),
      payload.active,
      Number(actor.id)
    )

    return serialize({ user: serializeUser(user) })
  }
}
