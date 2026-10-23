import ArchivoImagenNoDisponibleException from '#exceptions/archivo_imagen_no_disponible_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import type CatalogProduct from '#models/catalog_product'
import CatalogProductQueryService from '#services/catalog_product_query_service'
import { tenantStorageKey } from '#utils/tenant_storage'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import drive from '@adonisjs/drive/services/main'
import { randomUUID } from 'node:crypto'

export type CatalogProductImageDownload = {
  bytes: Uint8Array
  contentType: string
  filename: string
}

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export default class CatalogProductImageService {
  private queryService = new CatalogProductQueryService()

  async guardarImagen(id: number, file: MultipartFile): Promise<CatalogProduct> {
    const product = await this.queryService.obtener(id)
    const extension = file.extname?.toLowerCase() ?? 'bin'
    const key = tenantStorageKey(`catalog-products/${id}/${randomUUID()}.${extension}`)

    if (product.imagePath) {
      await drive
        .use()
        .delete(product.imagePath)
        .catch(() => undefined)
    }

    await file.moveToDisk(key)
    product.imagePath = key
    await product.save()

    return product
  }

  async eliminarImagen(id: number): Promise<CatalogProduct> {
    const product = await this.queryService.obtener(id)

    if (product.imagePath) {
      await drive
        .use()
        .delete(product.imagePath)
        .catch(() => undefined)
      product.imagePath = null
      await product.save()
    }

    return product
  }

  async obtenerImagen(id: number): Promise<CatalogProductImageDownload> {
    const product = await this.queryService.obtener(id)

    if (!product.imagePath) {
      throw new ProductoCatalogoNoEncontradoException()
    }

    const exists = await drive.use().exists(product.imagePath)
    if (!exists) {
      product.imagePath = null
      await product.save()
      throw new ArchivoImagenNoDisponibleException()
    }

    const bytes = await drive.use().getBytes(product.imagePath)
    const extension = product.imagePath.split('.').pop()?.toLowerCase() ?? 'bin'
    const contentType = IMAGE_MIME[extension] ?? 'application/octet-stream'
    const filename = `catalog-${id}.${extension}`

    return { bytes, contentType, filename }
  }
}
