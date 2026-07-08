import { mkdirSync } from 'node:fs'
import { resolveStoragePath } from '#utils/storage_path'

/**
 * Ensures the Drive local root exists (dev dir or Railway Volume mount).
 */
mkdirSync(resolveStoragePath(), { recursive: true })
