import AccountService from '#services/account_service'
import { serializeAccount } from '#transformers/account_transformer'
import {
  createAccountValidator,
  listAccountsValidator,
  updateAccountValidator,
} from '#validators/account'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccountsController {
  private service = new AccountService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listAccountsValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      active: filters.active,
    })

    return serialize({
      accounts: paginator.all().map((account) => serializeAccount(account)),
      meta: paginator.getMeta(),
    })
  }

  async show({ params, serialize }: HttpContext) {
    const account = await this.service.obtener(Number(params.id))

    return serialize({
      account: serializeAccount(account),
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createAccountValidator)
    const account = await this.service.crear(payload)

    return serialize({
      account: serializeAccount(account),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateAccountValidator)
    const account = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      account: serializeAccount(account),
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize({
      id: result.id,
      eliminado: true,
      modo: result.modo,
    })
  }
}
