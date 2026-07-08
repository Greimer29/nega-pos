import SupplierNoEncontradoException from '#exceptions/proveedor_no_encontrado_exception'
import RifDuplicadoException from '#exceptions/rif_duplicado_exception'
import TelefonoInvalidoException from '#exceptions/telefono_invalido_exception'
import Purchase from '#models/purchase'
import MachineExpense from '#models/machine_expense'
import Supplier from '#models/supplier'
import { normalizePhoneToE164 } from '#utils/phone'
import { normalizeRif } from '#utils/rif'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type { ModelPaginatorContract } from '@adonisjs/lucid/types/model'
import { randomUUID } from 'node:crypto'

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export type SupplierImageDownload = {
  bytes: Uint8Array
  contentType: string
  filename: string
}

export type SupplierInput = {
  name: string
  rif?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  active?: boolean
  credit_days?: number | null
}

export type ListSuppliersFilters = {
  page?: number
  perPage?: number
  search?: string
  active?: boolean
}

export type EliminarSupplierResult = {
  id: number
  modo: 'soft' | 'hard'
}

export default class SupplierService {
  async listar(filters: ListSuppliersFilters = {}): Promise<ModelPaginatorContract<Supplier>> {
    const page = filters.page ?? 1
    const perPage = filters.perPage ?? 20

    const query = Supplier.query().orderBy('name', 'asc')

    if (filters.search) {
      query.where((builder) => {
        builder.whereILike('name', `%${filters.search}%`).orWhereILike('rif', `%${filters.search}%`)
      })
    }

    if (filters.active !== undefined) {
      query.where('active', filters.active)
    }

    return query.paginate(page, perPage)
  }

  async obtener(id: number): Promise<Supplier> {
    const supplier = await Supplier.find(id)
    if (!supplier) {
      throw new SupplierNoEncontradoException()
    }
    return supplier
  }

  async crear(input: SupplierInput): Promise<Supplier> {
    const data = this.prepareInput(input)

    if (data.rif) {
      const duplicado = await Supplier.query().where('rif', data.rif).first()
      if (duplicado) {
        throw new RifDuplicadoException()
      }
    }

    return Supplier.create(data)
  }

  async actualizar(id: number, input: SupplierInput): Promise<Supplier> {
    const supplier = await this.obtener(id)
    const data = this.prepareInput(input)

    if (data.rif) {
      const duplicado = await Supplier.query()
        .where('rif', data.rif)
        .whereNot('id', Number(supplier.id))
        .first()
      if (duplicado) {
        throw new RifDuplicadoException()
      }
    }

    supplier.merge({
      name: data.name,
      rif: data.rif,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      creditDays: data.creditDays,
      ...(input.active !== undefined ? { active: input.active } : {}),
    })

    await supplier.save()
    return supplier
  }

  async eliminar(id: number): Promise<EliminarSupplierResult> {
    return db.transaction(async (trx) => {
      const supplier = await Supplier.query({ client: trx }).where('id', id).forUpdate().first()

      if (!supplier) {
        throw new SupplierNoEncontradoException()
      }

      const purchases = await Purchase.query({ client: trx })
        .where('supplierId', Number(supplier.id))
        .count('* as total')
      const expenses = await MachineExpense.query({ client: trx })
        .where('supplierId', Number(supplier.id))
        .count('* as total')

      const tienePurchases = Number(purchases[0].$extras.total) > 0
      const tieneGastos = Number(expenses[0].$extras.total) > 0

      if (tienePurchases || tieneGastos) {
        supplier.active = false
        supplier.useTransaction(trx)
        await supplier.save()
        return { id: Number(supplier.id), modo: 'soft' }
      }

      supplier.useTransaction(trx)
      await supplier.delete()
      return { id: Number(supplier.id), modo: 'hard' }
    })
  }

  async guardarImagen(supplierId: number, file: MultipartFile): Promise<Supplier> {
    const supplier = await this.obtener(supplierId)
    const extension = file.extname?.toLowerCase() ?? 'bin'
    const key = `suppliers/${supplierId}/${randomUUID()}.${extension}`

    if (supplier.imagePath) {
      await drive
        .use()
        .delete(supplier.imagePath)
        .catch(() => undefined)
    }

    await file.moveToDisk(key)
    supplier.imagePath = key
    await supplier.save()

    return supplier
  }

  async eliminarImagen(supplierId: number): Promise<Supplier> {
    const supplier = await this.obtener(supplierId)

    if (supplier.imagePath) {
      await drive
        .use()
        .delete(supplier.imagePath)
        .catch(() => undefined)
      supplier.imagePath = null
      await supplier.save()
    }

    return supplier
  }

  async obtenerImagen(supplierId: number): Promise<SupplierImageDownload> {
    const supplier = await this.obtener(supplierId)

    if (!supplier.imagePath) {
      throw new SupplierNoEncontradoException()
    }

    const exists = await drive.use().exists(supplier.imagePath)
    if (!exists) {
      throw new SupplierNoEncontradoException()
    }

    const bytes = await drive.use().getBytes(supplier.imagePath)
    const extension = supplier.imagePath.split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = IMAGE_MIME[extension] ?? 'application/octet-stream'
    const filename = `supplier-${supplier.id}.${extension}`

    return { bytes, contentType, filename }
  }

  private prepareInput(input: SupplierInput) {
    let phone: string | null = null
    if (input.phone?.trim()) {
      try {
        phone = normalizePhoneToE164(input.phone)
      } catch {
        throw new TelefonoInvalidoException()
      }
    }

    const rif = input.rif?.trim() ? normalizeRif(input.rif) : null

    return {
      name: input.name.trim(),
      rif,
      phone,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
      active: input.active ?? true,
      creditDays: input.credit_days ?? null,
    }
  }
}
