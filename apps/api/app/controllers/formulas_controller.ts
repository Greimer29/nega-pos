import { serializeCostWarning } from '#types/cost_warning'
import FormulaService from '#services/formula_service'
import {
  serializeFormula,
  serializeFormulaDetail,
  serializeFormulaMaterialItem,
} from '#transformers/formula_transformer'
import {
  createFormulaValidator,
  listFormulasValidator,
  updateFormulaMaterialsValidator,
  updateFormulaValidator,
} from '#validators/formula'
import type { HttpContext } from '@adonisjs/core/http'

export default class FormulasController {
  private service = new FormulaService()

  async index({ request, serialize }: HttpContext) {
    const filters = await request.validateUsing(listFormulasValidator)
    const paginator = await this.service.listar({
      page: filters.page,
      perPage: filters.per_page,
      search: filters.search,
      active: filters.active,
    })

    const formulas = await Promise.all(
      paginator.all().map(async (formula) => {
        const productsCount = await this.service.contarProductosVinculados(Number(formula.id))
        return serializeFormula(formula, { productsCount })
      })
    )

    return serialize({
      formulas,
      meta: paginator.getMeta(),
    })
  }

  async show({ params, serialize }: HttpContext) {
    const formula = await this.service.obtenerDetalle(Number(params.id))
    const productsCount = await this.service.contarProductosVinculados(Number(formula.id))

    return serialize({
      formula: serializeFormulaDetail(formula, { productsCount }),
    })
  }

  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(createFormulaValidator)
    const formula = await this.service.crear(payload)

    return serialize({
      formula: serializeFormula(formula, { productsCount: 0 }),
    })
  }

  async update({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateFormulaValidator)
    const formula = await this.service.actualizar(Number(params.id), payload)
    const productsCount = await this.service.contarProductosVinculados(Number(formula.id))

    return serialize({
      formula: serializeFormula(formula, { productsCount }),
    })
  }

  async destroy({ params, serialize }: HttpContext) {
    const result = await this.service.eliminar(Number(params.id))
    return serialize(result)
  }

  async getMaterials({ params, serialize }: HttpContext) {
    const items = await this.service.obtenerMateriales(Number(params.id))

    return serialize({
      materials: items.map((item) => serializeFormulaMaterialItem(item)),
    })
  }

  async updateMaterials({ params, request, serialize }: HttpContext) {
    const payload = await request.validateUsing(updateFormulaMaterialsValidator)
    const { items, costWarnings } = await this.service.actualizarMateriales(
      Number(params.id),
      payload.items
    )

    return serialize({
      materials: items.map((item) => serializeFormulaMaterialItem(item)),
      cost_warnings: costWarnings.map(serializeCostWarning),
    })
  }
}
