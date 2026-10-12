import AppSetting from '#models/app_setting'
import BusinessProfileService from '#services/business_profile_service'
import type { BusinessProfile } from '#types/business_profile'
import type {
  PrintBusinessConfig,
  PrintConfig,
  PrintConfigPatch,
  PrintConfigSaveScope,
  StoredPrintConfig,
} from '#types/print_config'
import {
  createDefaultStoredPrintConfig,
  EMPTY_PRINT_BUSINESS,
  mergePrintConfigPatch,
  normalizeStoredPrintConfig,
  withPrintBusiness,
} from '#utils/print_config_normalize'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export const PRINT_CONFIG_SETTING_KEY = 'print_config'

export type PrintConfigResult = {
  printConfig: PrintConfig
  persisted: boolean
}

function businessProfileToPrintBusiness(profile: BusinessProfile): PrintBusinessConfig {
  return {
    name: profile.trade_name,
    subtitle: profile.tagline,
    footer: profile.ticket_footer || EMPTY_PRINT_BUSINESS.footer,
    legalName: profile.legal_name,
    rif: profile.rif,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    website: profile.website,
    hasLogo: Boolean(profile.logo_path),
  }
}

export default class PrintConfigService {
  private businessProfileService = new BusinessProfileService()

  async obtenerStored(): Promise<{ stored: StoredPrintConfig; persisted: boolean }> {
    const row = await AppSetting.find(PRINT_CONFIG_SETTING_KEY)
    if (!row?.value) {
      return { stored: createDefaultStoredPrintConfig(), persisted: false }
    }

    try {
      const parsed = JSON.parse(row.value) as Record<string, unknown>
      return { stored: normalizeStoredPrintConfig(parsed), persisted: true }
    } catch {
      return { stored: createDefaultStoredPrintConfig(), persisted: false }
    }
  }

  async obtener(): Promise<PrintConfigResult> {
    const [{ stored, persisted }, profile] = await Promise.all([
      this.obtenerStored(),
      this.businessProfileService.obtener(),
    ])

    return {
      printConfig: withPrintBusiness(stored, businessProfileToPrintBusiness(profile)),
      persisted,
    }
  }

  async guardarFull(input: PrintConfigPatch): Promise<PrintConfigResult> {
    return this.guardarPatch('full', input)
  }

  async guardarPatch(
    scope: PrintConfigSaveScope,
    patch: PrintConfigPatch
  ): Promise<PrintConfigResult> {
    if (patch.onlyIfEmpty) {
      return this.guardarSoloSiNoHayFila(scope, patch)
    }

    const { stored: current } = await this.obtenerStored()
    const next = mergePrintConfigPatch(current, patch, scope)
    await this.persist(next)

    const profile = await this.businessProfileService.obtener()
    return {
      printConfig: withPrintBusiness(next, businessProfileToPrintBusiness(profile)),
      persisted: true,
    }
  }

  /**
   * Importación legacy del desktop. Si la fila ya existe, no se toca:
   * un arranque de la app no puede pisar formatos que el usuario ya guardó.
   */
  private async guardarSoloSiNoHayFila(
    scope: PrintConfigSaveScope,
    patch: PrintConfigPatch
  ): Promise<PrintConfigResult> {
    const stored = await db.transaction(async (trx) => {
      const row = await AppSetting.query({ client: trx })
        .where('key', PRINT_CONFIG_SETTING_KEY)
        .forUpdate()
        .first()

      if (row) {
        return parseStoredPrintConfig(row.value) ?? createDefaultStoredPrintConfig()
      }

      const next = mergePrintConfigPatch(createDefaultStoredPrintConfig(), patch, scope)
      try {
        await AppSetting.create(
          {
            key: PRINT_CONFIG_SETTING_KEY,
            value: JSON.stringify(next),
            updatedAt: DateTime.now(),
          },
          { client: trx }
        )
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error
        }
        const raced = await AppSetting.query({ client: trx })
          .where('key', PRINT_CONFIG_SETTING_KEY)
          .first()
        if (raced) {
          return parseStoredPrintConfig(raced.value) ?? createDefaultStoredPrintConfig()
        }
        throw error
      }

      return next
    })

    const profile = await this.businessProfileService.obtener()
    return {
      printConfig: withPrintBusiness(stored, businessProfileToPrintBusiness(profile)),
      persisted: true,
    }
  }

  private async persist(stored: StoredPrintConfig): Promise<void> {
    await AppSetting.updateOrCreate(
      { key: PRINT_CONFIG_SETTING_KEY },
      { value: JSON.stringify(stored), updatedAt: DateTime.now() }
    )
  }
}

function parseStoredPrintConfig(value: string | null | undefined): StoredPrintConfig | null {
  if (!value) {
    return null
  }
  try {
    return normalizeStoredPrintConfig(JSON.parse(value) as Record<string, unknown>)
  } catch {
    return null
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
    const candidate = current as { code?: string; errno?: number; cause?: unknown }
    if (candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062) {
      return true
    }
    current = candidate.cause
  }
  return false
}
