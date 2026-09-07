import ArchivoImagenNoDisponibleException from '#exceptions/archivo_imagen_no_disponible_exception'
import AppSetting from '#models/app_setting'
import {
  DEFAULT_BUSINESS_PROFILE,
  type BusinessPalette,
  type BusinessProfile,
} from '#types/business_profile'
import drive from '@adonisjs/drive/services/main'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import { tenantStorageKey } from '#utils/tenant_storage'

const KEY_BUSINESS_PROFILE = 'business_profile'
const LOGO_KEY = 'business/logo'

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export type BusinessLogoDownload = {
  bytes: Uint8Array
  contentType: string
  filename: string
}

export default class BusinessProfileService {
  async obtener(): Promise<BusinessProfile> {
    const row = await AppSetting.find(KEY_BUSINESS_PROFILE)
    if (!row?.value) {
      return { ...DEFAULT_BUSINESS_PROFILE, palette: { ...DEFAULT_BUSINESS_PROFILE.palette } }
    }

    try {
      const parsed = JSON.parse(row.value) as Partial<BusinessProfile>
      return this.normalize(parsed)
    } catch {
      return { ...DEFAULT_BUSINESS_PROFILE, palette: { ...DEFAULT_BUSINESS_PROFILE.palette } }
    }
  }

  async guardar(input: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const current = await this.obtener()
    const next = this.normalize({
      ...current,
      ...input,
      palette: {
        ...current.palette,
        ...(input.palette ?? {}),
      },
    })

    await AppSetting.updateOrCreate(
      { key: KEY_BUSINESS_PROFILE },
      { value: JSON.stringify(next), updatedAt: DateTime.now() }
    )

    return next
  }

  async guardarLogo(file: MultipartFile): Promise<BusinessProfile> {
    const profile = await this.obtener()
    const extension = file.extname?.toLowerCase() ?? 'png'
    const key = tenantStorageKey(`${LOGO_KEY}/${randomUUID()}.${extension}`)

    if (profile.logo_path) {
      await drive
        .use()
        .delete(profile.logo_path)
        .catch(() => undefined)
    }

    try {
      await file.moveToDisk(key)
    } catch {
      throw new ArchivoImagenNoDisponibleException(
        'No se pudo guardar el logo. Verificá que el almacenamiento del servidor esté disponible.',
        { status: 500 }
      )
    }

    return this.guardar({ logo_path: key })
  }

  async eliminarLogo(): Promise<BusinessProfile> {
    const profile = await this.obtener()

    if (profile.logo_path) {
      await drive
        .use()
        .delete(profile.logo_path)
        .catch(() => undefined)
    }

    return this.guardar({ logo_path: null })
  }

  async obtenerLogo(): Promise<BusinessLogoDownload> {
    const profile = await this.obtener()

    if (!profile.logo_path) {
      throw new ArchivoImagenNoDisponibleException('No hay logo configurado.', { status: 404 })
    }

    const exists = await drive.use().exists(profile.logo_path)
    if (!exists) {
      throw new ArchivoImagenNoDisponibleException('El logo no está disponible en almacenamiento.', {
        status: 404,
      })
    }

    const bytes = await drive.use().getBytes(profile.logo_path)
    const extension = profile.logo_path.split('.').pop()?.toLowerCase() ?? 'png'
    const contentType = IMAGE_MIME[extension] ?? 'application/octet-stream'

    return {
      bytes,
      contentType,
      filename: `business-logo.${extension}`,
    }
  }

  private normalize(input: Partial<BusinessProfile>): BusinessProfile {
    const palette = this.normalizePalette(input.palette)

    return {
      trade_name: input.trade_name?.trim() ?? '',
      tagline: input.tagline?.trim() ?? '',
      ticket_footer: input.ticket_footer?.trim() ?? DEFAULT_BUSINESS_PROFILE.ticket_footer,
      legal_name: input.legal_name?.trim() ?? '',
      rif: input.rif?.trim() ?? '',
      address: input.address?.trim() ?? '',
      phone: input.phone?.trim() ?? '',
      email: input.email?.trim() ?? '',
      website: input.website?.trim() ?? '',
      logo_path: input.logo_path ?? null,
      use_custom_palette: input.use_custom_palette ?? false,
      palette,
    }
  }

  private normalizePalette(palette?: Partial<BusinessPalette>): BusinessPalette {
    const fallback = DEFAULT_BUSINESS_PROFILE.palette
    return {
      primary: this.normalizeHex(palette?.primary, fallback.primary),
      secondary: this.normalizeHex(palette?.secondary, fallback.secondary),
      accent: this.normalizeHex(palette?.accent, fallback.accent),
    }
  }

  private normalizeHex(value: string | undefined, fallback: string): string {
    const trimmed = value?.trim() ?? ''
    return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toLowerCase() : fallback
  }
}
