import { getApiErrorMessage } from '@/lib/api-error'

export function detailPageErrorMessage(options: {
  isValidId: boolean
  isError: boolean
  error: unknown
  entityLabel: string
}): string {
  if (!options.isValidId) {
    return `El identificador de ${options.entityLabel} no es válido.`
  }

  if (options.isError) {
    return getApiErrorMessage(options.error)
  }

  return `No se encontró ${options.entityLabel.toLowerCase()}.`
}
