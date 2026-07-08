import { parsePhoneNumberFromString } from 'libphonenumber-js'

const DEFAULT_COUNTRY = 'VE'

/**
 * Normaliza un teléfono a E.164. Default país: Venezuela (+58).
 * @throws Error si el número no es válido
 */
export function normalizePhoneToE164(value: string): string {
  const trimmed = value.trim()
  const parsed = parsePhoneNumberFromString(trimmed, DEFAULT_COUNTRY)

  if (!parsed?.isValid()) {
    throw new Error('TELEFONO_INVALIDO')
  }

  return parsed.format('E.164')
}
