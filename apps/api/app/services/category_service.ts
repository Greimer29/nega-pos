import CategoriaEnUsoException from '#exceptions/categoria_en_uso_exception'
import CategoriaNoEncontradaException from '#exceptions/categoria_no_encontrada_exception'
import CategoriaDuplicadaException from '#exceptions/categoria_duplicada_exception'
import Category from '#models/category'
import CatalogProduct from '#models/catalog_product'

export type CategoryInput = {
  name: string
  sort_order?: number
}

export type CategoryUpdateInput = {
  name?: string
  active?: boolean
  sort_order?: number
}

export default class CategoryService {
  async listar(activeOnly = false) {
    const query = Category.query().orderBy('sort_order', 'asc').orderBy('name', 'asc')

    if (activeOnly) {
      query.where('active', true)
    }

    return query
  }

  async obtener(id: number): Promise<Category> {
    const category = await Category.find(id)
    if (!category) {
      throw new CategoriaNoEncontradaException()
    }
    return category
  }

  async obtenerPorNombre(name: string): Promise<Category | null> {
    return Category.query().whereILike('name', name.trim()).first()
  }

  async assertNombreValido(name: string, excludeId?: number) {
    const query = Category.query().whereILike('name', name.trim())
    if (excludeId) {
      query.whereNot('id', excludeId)
    }
    const existing = await query.first()
    if (existing) {
      throw new CategoriaDuplicadaException()
    }
  }

  async assertCategoriaActiva(name: string) {
    const category = await this.obtenerPorNombre(name)
    if (!category || !category.active) {
      throw new CategoriaNoEncontradaException()
    }
  }

  async crear(input: CategoryInput): Promise<Category> {
    await this.assertNombreValido(input.name)

    return Category.create({
      name: input.name.trim(),
      active: true,
      sortOrder: input.sort_order ?? 0,
    })
  }

  async actualizar(id: number, input: CategoryUpdateInput): Promise<Category> {
    const category = await this.obtener(id)
    const oldName = category.name

    if (input.name !== undefined) {
      await this.assertNombreValido(input.name, id)
      category.name = input.name.trim()
    }

    if (input.active !== undefined) {
      category.active = input.active
    }

    if (input.sort_order !== undefined) {
      category.sortOrder = input.sort_order
    }

    await category.save()

    if (input.name !== undefined && input.name.trim() !== oldName) {
      await CatalogProduct.query().where('category', oldName).update({ category: category.name })
    }

    return category
  }

  async eliminar(id: number): Promise<{ id: number; eliminado: true }> {
    const category = await this.obtener(id)

    const productsCount = await CatalogProduct.query()
      .where('category', category.name)
      .count('* as total')
    const total = Number(productsCount[0]?.$extras.total ?? 0)

    if (total > 0) {
      throw new CategoriaEnUsoException(total)
    }

    await category.delete()
    return { id: Number(category.id), eliminado: true }
  }
}
