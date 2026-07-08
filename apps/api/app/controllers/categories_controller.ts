import CategoryService from '#services/category_service'
import {
  createCategoryValidator,
  listCategoriesValidator,
  updateCategoryValidator,
} from '#validators/category'
import type { HttpContext } from '@adonisjs/core/http'

function serializeCategory(category: Awaited<ReturnType<CategoryService['listar']>>[number]) {
  return {
    id: Number(category.id),
    name: category.name,
    active: category.active,
    sort_order: category.sortOrder,
    created_at: category.createdAt.toISO(),
    updated_at: category.updatedAt.toISO(),
  }
}

export default class CategoriesController {
  private service = new CategoryService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listCategoriesValidator)
    const categories = await this.service.listar(filters.active_only ?? false)

    return serialize({
      categories: categories.map(serializeCategory),
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCategoryValidator)
    const category = await this.service.crear(payload)

    return serialize({
      category: serializeCategory(category),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateCategoryValidator)
    const category = await this.service.actualizar(Number(params.id), payload)

    return serialize({
      category: serializeCategory(category),
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))

    return serialize(result)
  }
}
