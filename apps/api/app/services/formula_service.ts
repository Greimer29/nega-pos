import FormulaEnUsoException from '#exceptions/formula_en_uso_exception'
import FormulaNoEncontradaException from '#exceptions/formula_no_encontrada_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import type { CostWarning } from '#types/cost_warning'
import CatalogProduct from '#models/catalog_product'
import Formula from '#models/formula'
import FormulaMaterial from '#models/formula_material'
import Material from '#models/material'
import db from '@adonisjs/lucid/services/db'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type FormulaInput = {
  name: string
  description?: string | null
  active?: boolean
}

export type FormulaUpdateInput = Partial<FormulaInput>

export type FormulaMaterialInput = {
  material_id: number
  quantity: number
}

export type ListFormulasFilters = {
  page?: number
  perPage?: number
  search?: string
  active?: boolean
}

export default class FormulaService {
  async listar(filters: ListFormulasFilters = {}): Promise<ModelPaginatorContract<Formula>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 30

    const query = Formula.query()

    if (filters.search) {
      const term = `%${filters.search.trim()}%`
      query.whereILike('name', term)
    }

    if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    query.orderBy('name', 'asc').orderBy('id', 'desc')

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<Formula> {
    const formula = await Formula.find(id)
    if (!formula) {
      throw new FormulaNoEncontradaException()
    }
    return formula
  }

  async obtenerDetalle(id: number): Promise<Formula> {
    const formula = await Formula.query()
      .where('id', id)
      .preload('materials', (q) => q.preload('material').orderBy('id', 'asc'))
      .first()

    if (!formula) {
      throw new FormulaNoEncontradaException()
    }

    return formula
  }

  async crear(input: FormulaInput): Promise<Formula> {
    return Formula.create({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      active: input.active ?? true,
    })
  }

  async actualizar(id: number, input: FormulaUpdateInput): Promise<Formula> {
    const formula = await this.obtener(id)

    if (input.name !== undefined) {
      formula.name = input.name.trim()
    }

    if (input.description !== undefined) {
      formula.description = input.description?.trim() || null
    }

    if (input.active !== undefined) {
      formula.active = input.active
    }

    await formula.save()
    return formula
  }

  async eliminar(id: number): Promise<{ id: number }> {
    const formula = await this.obtener(id)

    const linked = await CatalogProduct.query().where('formulaId', id).first()
    if (linked) {
      throw new FormulaEnUsoException()
    }

    await formula.delete()
    return { id }
  }

  async obtenerMateriales(id: number): Promise<FormulaMaterial[]> {
    await this.obtener(id)

    return FormulaMaterial.query().where('formulaId', id).preload('material').orderBy('id', 'asc')
  }

  async actualizarMateriales(
    id: number,
    items: FormulaMaterialInput[]
  ): Promise<{ items: FormulaMaterial[]; costWarnings: CostWarning[] }> {
    return db.transaction(async (trx) => {
      const formula = await Formula.query({ client: trx }).where('id', id).forUpdate().first()

      if (!formula) {
        throw new FormulaNoEncontradaException()
      }

      for (const item of items) {
        await this.assertMaterialExiste(item.material_id)
      }

      await FormulaMaterial.query({ client: trx }).where('formulaId', id).delete()

      for (const item of items) {
        await FormulaMaterial.create(
          {
            formulaId: id,
            materialId: item.material_id,
            quantity: item.quantity.toFixed(3),
          },
          { client: trx }
        )
      }

      const costWarnings = await this.recalcularCostosProductosVinculados(id, trx)

      const updatedItems = await FormulaMaterial.query({ client: trx })
        .where('formulaId', id)
        .preload('material')
        .orderBy('id', 'asc')

      return { items: updatedItems, costWarnings }
    })
  }

  async calcularCosto(id: number, trx?: TransactionClientContract): Promise<number> {
    await this.obtener(id)
    return this.calcularCostoDesdeMateriales(id, trx)
  }

  async contarProductosVinculados(id: number): Promise<number> {
    const result = await CatalogProduct.query().where('formulaId', id).count('* as total').first()
    return Number(result?.$extras.total ?? 0)
  }

  async recalcularCostosProductosVinculados(
    formulaId: number,
    trx?: TransactionClientContract
  ): Promise<CostWarning[]> {
    const costUsd = await this.calcularCostoDesdeMateriales(formulaId, trx)
    const costFormatted = costUsd.toFixed(4)

    const query = CatalogProduct.query().where('formulaId', formulaId)
    if (trx) {
      query.useTransaction(trx)
    }

    const products = await query
    const warnings: CostWarning[] = []

    for (const product of products) {
      product.costUsd = costFormatted
      const salePrice = Number(product.salePriceUsd)
      if (salePrice > 0 && salePrice < costUsd) {
        warnings.push({
          product_id: Number(product.id),
          product_name: product.name,
          sale_price_usd: product.salePriceUsd,
          cost_usd: costFormatted,
        })
      }
      if (trx) {
        product.useTransaction(trx)
      }
      await product.save()
    }

    return warnings
  }

  async recalcularCostosPorMaterial(
    materialId: number,
    trx?: TransactionClientContract
  ): Promise<CostWarning[]> {
    const query = FormulaMaterial.query().where('materialId', materialId).select('formulaId')
    if (trx) {
      query.useTransaction(trx)
    }

    const rows = await query.groupBy('formulaId')
    const warnings: CostWarning[] = []
    const seenFormulaIds = new Set<number>()

    for (const row of rows) {
      const formulaId = Number(row.formulaId)
      if (seenFormulaIds.has(formulaId)) {
        continue
      }
      seenFormulaIds.add(formulaId)
      const formulaWarnings = await this.recalcularCostosProductosVinculados(formulaId, trx)
      warnings.push(...formulaWarnings)
    }

    return warnings
  }

  async calcularCostoDesdeMateriales(
    formulaId: number,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = FormulaMaterial.query().where('formulaId', formulaId).preload('material')

    if (trx) {
      query.useTransaction(trx)
    }

    const items = await query

    let total = 0
    for (const item of items) {
      const costUsd = Number(item.material?.lastPurchasePriceUsd ?? 0)
      total += costUsd * Number(item.quantity)
    }

    return total
  }

  private async assertMaterialExiste(materialId: number) {
    const material = await Material.find(materialId)
    if (!material) {
      throw new MaterialNoEncontradoException()
    }
  }
}
