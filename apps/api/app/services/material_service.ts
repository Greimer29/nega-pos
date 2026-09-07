import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import StockInsuficienteException from '#exceptions/stock_insuficiente_exception'
import {
  resolveInventoryAdjustment,
  type InventoryAdjustmentMode,
} from '#constants/inventory_adjustment'
import {
  formatInventoryQuantityForStorage,
  normalizeInventoryQuantity,
} from '#constants/inventory_units'
import PurchaseItem from '#models/purchase_item'
import Material from '#models/material'
import InventoryMovement from '#models/inventory_movement'
import FormulaService from '#services/formula_service'
import OrderService from '#services/order_service'
import ProductCodeService from '#services/product_code_service'
import CategoryService from '#services/category_service'
import type { CostWarning } from '#types/cost_warning'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { tenantStorageKey } from '#utils/tenant_storage'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { randomUUID } from 'node:crypto'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'

export type MaterialInput = {
  code: string
  name: string
  description?: string | null
  category: Material['category']
  unit: Material['unit']
  minimum_stock?: number
  location?: string | null
  default_supplier_id?: number | null
  last_purchase_price_usd?: number | null
  active?: boolean
}

export type MaterialStatusFilter = 'active' | 'inactive' | 'out_of_stock'
export type MaterialSortBy = 'name' | 'most_purchased' | 'most_used' | 'most_flow'

export type ListMaterialsFilters = {
  page?: number
  perPage?: number
  search?: string
  category?: Material['category']
  active?: boolean
  lowStock?: boolean
  status?: MaterialStatusFilter
  sortBy?: MaterialSortBy
  sortDir?: 'asc' | 'desc'
}

export type MaterialListMetrics = {
  purchasedQty: number
  usedQty: number
  flowQty: number
  rating: number
}

export type MaterialConStock = {
  material: Material
  stockActual: number
  stockComprometido?: number
}

export type EliminarMaterialResult = {
  id: number
  modo: 'soft' | 'hard'
}

export type AjusteMaterialInput = {
  mode: InventoryAdjustmentMode
  quantity: number
  note?: string | null
}

export type MaterialUpdateResult = {
  material: Material
  costWarnings: CostWarning[]
}

export type HistorialPrecioItem = {
  purchaseItemId: number
  purchaseId: number
  date: string
  invoiceNumber: string | null
  supplier: {
    id: number
    name: string
  }
  quantity: string
  unitPriceBs: string
  unitPriceUsd: string | null
  subtotalBs: string
  subtotalUsd: string | null
}

export type MaterialImageDownload = {
  bytes: Uint8Array
  contentType: string
  filename: string
}

const STOCK_ACTUAL_SQL =
  'COALESCE((SELECT SUM(quantity) FROM inventory_movements WHERE material_id = materials.id), 0)'

const PURCHASED_QTY_SQL = `COALESCE((
  SELECT SUM(pi.quantity)
  FROM purchase_items pi
  INNER JOIN purchases p ON p.id = pi.purchase_id
  WHERE pi.material_id = materials.id AND p.status = 'CONFIRMED'
), 0)`

const USED_QTY_SQL = `COALESCE((
  SELECT SUM(ABS(im.quantity))
  FROM inventory_movements im
  WHERE im.material_id = materials.id AND im.type = 'ORDER_OUT'
), 0)`

const FLOW_QTY_SQL = `COALESCE((
  SELECT SUM(ABS(im.quantity))
  FROM inventory_movements im
  WHERE im.material_id = materials.id
), 0)`

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function formatOptionalPrice(value: number | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null
  }
  return value.toFixed(4)
}

function metricForSort(sortBy: MaterialSortBy): string {
  switch (sortBy) {
    case 'most_purchased':
      return PURCHASED_QTY_SQL
    case 'most_used':
      return USED_QTY_SQL
    case 'most_flow':
      return FLOW_QTY_SQL
    default:
      return 'materials.name'
  }
}

function computeRatings(
  rows: Array<{ id: number; purchasedQty: number; usedQty: number; flowQty: number }>,
  sortBy: MaterialSortBy
): Map<number, number> {
  const ratings = new Map<number, number>()

  if (rows.length === 0) {
    return ratings
  }

  const values = rows.map((row) => {
    switch (sortBy) {
      case 'most_purchased':
        return row.purchasedQty
      case 'most_used':
        return row.usedQty
      case 'most_flow':
        return row.flowQty
      default:
        return row.flowQty
    }
  })

  const max = Math.max(...values, 0)

  for (const row of rows) {
    const raw =
      sortBy === 'most_purchased'
        ? row.purchasedQty
        : sortBy === 'most_used'
          ? row.usedQty
          : row.flowQty

    const rating = max > 0 ? Math.round((raw / max) * 50) / 10 : 0
    ratings.set(row.id, rating)
  }

  return ratings
}

export default class MaterialService {
  private formulaService = new FormulaService()
  private orderService = new OrderService()
  private productCodeService = new ProductCodeService()
  private categoryService = new CategoryService()
  async calcularStock(materialId: number, trx?: TransactionClientContract): Promise<number> {
    if (!trx) {
      await this.obtener(materialId)
    }

    const result = trx
      ? await InventoryMovement.query({ client: trx })
          .where('materialId', materialId)
          .sum('quantity as total')
          .first()
      : await db
          .from('inventory_movements')
          .where('material_id', materialId)
          .sum('quantity as total')
          .first()

    const total = result?.total ?? result?.$extras?.total
    if (total === null || total === undefined) {
      return 0
    }

    return Number(total)
  }

  async materialsLowStock(): Promise<MaterialConStock[]> {
    const rows = await db
      .from('materials')
      .select('materials.*')
      .select(db.raw(`${STOCK_ACTUAL_SQL} as stock_actual`))
      .where('materials.active', true)
      .whereRaw(`${STOCK_ACTUAL_SQL} < materials.minimum_stock`)
      .orderBy('materials.name', 'asc')

    const ids = rows.map((row) => Number(row.id))
    if (ids.length === 0) {
      return []
    }

    const materials = await Material.query().whereIn('id', ids).orderBy('name', 'asc')
    const stockById = new Map(rows.map((row) => [Number(row.id), Number(row.stock_actual)]))

    return materials.map((material) => ({
      material,
      stockActual: stockById.get(Number(material.id)) ?? 0,
    }))
  }

  async listar(filters: ListMaterialsFilters = {}): Promise<{
    paginator: ModelPaginatorContract<Material>
    stockById: Map<number, number>
    stockComprometidoById: Map<number, number>
    metricsById: Map<number, MaterialListMetrics>
  }> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20
    const sortBy = filters.sortBy ?? 'name'
    const sortDir = filters.sortDir ?? (sortBy === 'name' ? 'asc' : 'desc')

    const query = Material.query()
      .select('materials.*')
      .select(db.raw(`${STOCK_ACTUAL_SQL} as stock_actual`))
      .select(db.raw(`${PURCHASED_QTY_SQL} as purchased_qty`))
      .select(db.raw(`${USED_QTY_SQL} as used_qty`))
      .select(db.raw(`${FLOW_QTY_SQL} as flow_qty`))

    if (filters.search) {
      query.where((builder) => {
        builder
          .whereILike('code', `%${filters.search}%`)
          .orWhereILike('name', `%${filters.search}%`)
      })
    }

    if (filters.category) {
      query.where('category', filters.category)
    }

    if (filters.status === 'active') {
      query.where('active', true)
    } else if (filters.status === 'inactive') {
      query.where('active', false)
    } else if (filters.status === 'out_of_stock') {
      query.where('active', true).whereRaw(`${STOCK_ACTUAL_SQL} <= 0`)
    } else if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    if (filters.lowStock) {
      query.whereRaw(`${STOCK_ACTUAL_SQL} < materials.minimum_stock`)
    }

    if (sortBy === 'name') {
      query.orderBy('materials.name', sortDir)
    } else {
      query.orderByRaw(`${metricForSort(sortBy)} ${sortDir === 'asc' ? 'ASC' : 'DESC'}`)
      query.orderBy('materials.name', 'asc')
    }

    const paginator = await query.paginate(page, perPage)
    const stockById = new Map<number, number>()
    const stockComprometidoById = await this.orderService.calcularMaterialComprometido()
    const metricRows: Array<{
      id: number
      purchasedQty: number
      usedQty: number
      flowQty: number
    }> = []

    for (const material of paginator.all()) {
      const id = Number(material.id)
      stockById.set(id, Number(material.$extras.stock_actual ?? 0))
      metricRows.push({
        id,
        purchasedQty: Number(material.$extras.purchased_qty ?? 0),
        usedQty: Number(material.$extras.used_qty ?? 0),
        flowQty: Number(material.$extras.flow_qty ?? 0),
      })
    }

    const ratings = computeRatings(metricRows, sortBy)
    const metricsById = new Map<number, MaterialListMetrics>()

    for (const row of metricRows) {
      metricsById.set(row.id, {
        purchasedQty: row.purchasedQty,
        usedQty: row.usedQty,
        flowQty: row.flowQty,
        rating: ratings.get(row.id) ?? 0,
      })
    }

    return { paginator, stockById, stockComprometidoById, metricsById }
  }

  async obtener(id: number): Promise<Material> {
    const material = await Material.find(id)
    if (!material) {
      throw new MaterialNoEncontradoException()
    }
    return material
  }

  async obtenerDetalle(
    id: number
  ): Promise<MaterialConStock & { movimientos: InventoryMovement[] }> {
    const material = await this.obtener(id)
    const stockActual = await this.calcularStock(Number(material.id))
    const committedByMaterial = await this.orderService.calcularMaterialComprometido()
    const stockComprometido = committedByMaterial.get(Number(material.id)) ?? 0
    const movimientos = await InventoryMovement.query()
      .where('materialId', Number(material.id))
      .orderBy('created_at', 'desc')
      .limit(20)

    return { material, stockActual, stockComprometido, movimientos }
  }

  async crear(input: MaterialInput): Promise<Material> {
    await this.categoryService.assertCategoriaActiva(input.category)
    const data = this.prepareInput(input)
    await this.productCodeService.assertUnique(data.code)

    return Material.create(data)
  }

  async actualizar(id: number, input: MaterialInput): Promise<MaterialUpdateResult> {
    await this.categoryService.assertCategoriaActiva(input.category)
    const material = await this.obtener(id)
    const data = this.prepareInput(input)
    let costWarnings: CostWarning[] = []

    if (data.code !== material.code) {
      await this.productCodeService.assertUnique(data.code, {
        type: 'material',
        id: Number(material.id),
      })
    }

    const previousCost = material.lastPurchasePriceUsd
    const nextCost = data.lastPurchasePriceUsd

    material.merge({
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      unit: data.unit,
      minimumStock: data.minimumStock,
      location: data.location,
      defaultSupplierId: data.defaultSupplierId,
      ...(nextCost !== undefined ? { lastPurchasePriceUsd: nextCost } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    })

    if (nextCost !== undefined && previousCost !== null && previousCost !== nextCost) {
      material.previousPurchasePriceUsd = previousCost
    }

    await material.save()

    if (nextCost !== undefined && previousCost !== nextCost) {
      costWarnings = await this.formulaService.recalcularCostosPorMaterial(Number(material.id))
    }

    return { material, costWarnings }
  }

  async eliminar(id: number): Promise<EliminarMaterialResult> {
    return db.transaction(async (trx) => {
      const material = await Material.query({ client: trx }).where('id', id).forUpdate().first()

      if (!material) {
        throw new MaterialNoEncontradoException()
      }

      const movimientos = await InventoryMovement.query({ client: trx })
        .where('materialId', Number(material.id))
        .count('* as total')

      const tieneMovimientos = Number(movimientos[0].$extras.total) > 0

      if (tieneMovimientos) {
        material.active = false
        material.useTransaction(trx)
        await material.save()
        return { id: Number(material.id), modo: 'soft' }
      }

      if (material.imagePath) {
        await drive
          .use()
          .delete(material.imagePath)
          .catch(() => undefined)
      }

      material.useTransaction(trx)
      await material.delete()
      return { id: Number(material.id), modo: 'hard' }
    })
  }

  async ajustar(id: number, input: AjusteMaterialInput): Promise<InventoryMovement> {
    return db.transaction(async (trx) => {
      const material = await Material.query({ client: trx }).where('id', id).forUpdate().first()

      if (!material) {
        throw new MaterialNoEncontradoException()
      }

      const stockActual = await this.calcularStock(Number(material.id), trx)
      const unit = material.unit ?? 'UND'
      const quantity = normalizeInventoryQuantity(input.quantity, unit)
      const { delta, movementType } = resolveInventoryAdjustment(input.mode, quantity, stockActual)

      if (stockActual + delta < 0) {
        throw new StockInsuficienteException([
          {
            material_id: Number(material.id),
            name: material.name,
            stock_actual: stockActual,
            consumo_proyectado: Math.abs(delta),
            faltante: Math.abs(stockActual + delta),
          },
        ])
      }

      return InventoryMovement.create(
        {
          materialId: Number(material.id),
          type: movementType,
          quantity: formatInventoryQuantityForStorage(delta, unit),
          note: input.note?.trim() || null,
        },
        { client: trx }
      )
    })
  }

  async guardarImagen(materialId: number, file: MultipartFile): Promise<Material> {
    const material = await this.obtener(materialId)
    const extension = file.extname?.toLowerCase() ?? 'bin'
    const key = tenantStorageKey(`materials/${materialId}/${randomUUID()}.${extension}`)

    if (material.imagePath) {
      await drive
        .use()
        .delete(material.imagePath)
        .catch(() => undefined)
    }

    await file.moveToDisk(key)
    material.imagePath = key
    await material.save()

    return material
  }

  async eliminarImagen(materialId: number): Promise<Material> {
    const material = await this.obtener(materialId)

    if (material.imagePath) {
      await drive
        .use()
        .delete(material.imagePath)
        .catch(() => undefined)
      material.imagePath = null
      await material.save()
    }

    return material
  }

  async obtenerImagen(materialId: number): Promise<MaterialImageDownload> {
    const material = await this.obtener(materialId)

    if (!material.imagePath) {
      throw new MaterialNoEncontradoException()
    }

    const exists = await drive.use().exists(material.imagePath)
    if (!exists) {
      throw new MaterialNoEncontradoException()
    }

    const bytes = await drive.use().getBytes(material.imagePath)
    const extension = material.imagePath.split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = IMAGE_MIME[extension] ?? 'application/octet-stream'
    const filename = `material-${material.code}.${extension}`

    return { bytes, contentType, filename }
  }

  async historialPrecios(materialId: number): Promise<HistorialPrecioItem[]> {
    await this.obtener(materialId)

    const items = await PurchaseItem.query()
      .select('purchase_items.*')
      .join('purchases', 'purchases.id', 'purchase_items.purchase_id')
      .where('purchase_items.material_id', materialId)
      .where('purchases.status', 'CONFIRMED')
      .orderBy('purchases.date', 'desc')
      .orderBy('purchase_items.id', 'desc')
      .preload('purchase', (query) => {
        query.preload('supplier')
      })

    return items.map((item) => ({
      purchaseItemId: Number(item.id),
      purchaseId: Number(item.purchaseId),
      date: item.purchase.date.toISODate()!,
      invoiceNumber: item.purchase.invoiceNumber,
      supplier: {
        id: Number(item.purchase.supplier.id),
        name: item.purchase.supplier.name,
      },
      quantity: item.quantity,
      unitPriceBs: item.unitPriceBs,
      unitPriceUsd: item.unitPriceUsd,
      subtotalBs: item.subtotalBs,
      subtotalUsd: item.subtotalUsd,
    }))
  }

  private prepareInput(input: MaterialInput) {
    const unit = input.unit
    return {
      code: input.code.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category,
      unit,
      minimumStock: formatInventoryQuantityForStorage(input.minimum_stock ?? 1, unit),
      location: input.location?.trim() || null,
      defaultSupplierId: input.default_supplier_id ?? null,
      lastPurchasePriceUsd:
        input.last_purchase_price_usd === undefined
          ? undefined
          : formatOptionalPrice(input.last_purchase_price_usd),
      active: input.active ?? true,
    }
  }
}
