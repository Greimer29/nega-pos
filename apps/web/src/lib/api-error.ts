import axios from 'axios'
import type {
  ApiErrorBody,
  StockInsuficienteDetail,
  StockInsuficienteDevolucionDetail,
  VineValidationDetail,
} from '@/types/auth'

function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && window.location.port === '51740'
}

function usesLocalApiProxy(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (import.meta.env.DEV) {
    return true
  }

  return window.location.port === '51740'
}

function isVineValidationDetail(value: unknown): value is VineValidationDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as VineValidationDetail).message === 'string'
  )
}

function defaultCodeForStatus(status: number): string {
  if (status === 422) {
    return 'VALIDATION_ERROR'
  }

  if (status === 404) {
    return 'NOT_FOUND'
  }

  if (status === 403) {
    return 'FORBIDDEN'
  }

  if (status === 401) {
    return 'UNAUTHORIZED'
  }

  if (status >= 500) {
    return 'SERVER_ERROR'
  }

  return 'UNKNOWN_ERROR'
}

function parseLooseErrorPayload(data: unknown, status: number): ApiErrorBody | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const payload = data as Record<string, unknown>
  const message = payload.message
  const code = payload.code
  const details = payload.details
  const messages = payload.messages

  if (Array.isArray(messages) && messages.length > 0 && messages.every(isVineValidationDetail)) {
    return {
      code: typeof code === 'string' ? code : 'VALIDATION_ERROR',
      message: typeof message === 'string' ? message : 'Los datos enviados no son válidos',
      details: messages,
    }
  }

  const errors = payload.errors
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    return {
      code: typeof code === 'string' ? code : 'VALIDATION_ERROR',
      message: typeof message === 'string' ? message : 'Los datos enviados no son válidos',
      details: errors as Record<string, string | string[]>,
    }
  }

  if (typeof message === 'string' && message.trim().length > 0) {
    const body: ApiErrorBody = {
      code: typeof code === 'string' ? code : defaultCodeForStatus(status),
      message: message.trim(),
    }

    if (details !== undefined) {
      body.details = details as ApiErrorBody['details']
    }

    return body
  }

  if (details !== undefined) {
    return {
      code: typeof code === 'string' ? code : defaultCodeForStatus(status),
      message:
        typeof message === 'string' && message.trim().length > 0
          ? message.trim()
          : 'Ocurrió un error al procesar la solicitud.',
      details: details as ApiErrorBody['details'],
    }
  }

  return null
}

export function getApiError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error as ApiErrorBody
  }

  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status
    const loosePayload = parseLooseErrorPayload(error.response.data, status)

    if (loosePayload) {
      if (status === 404 && loosePayload.message.includes('Cannot GET')) {
        return {
          ...loosePayload,
          message:
            'No se pudo comunicar con el servidor. Recargá la página e intentá de nuevo.',
        }
      }

      return loosePayload
    }

    if (status === 502) {
      return {
        code: 'API_PROXY_ERROR',
        message: isDesktopApp()
          ? 'No se pudo conectar con el servidor. Verificá tu internet e intentá reconectar.'
          : usesLocalApiProxy()
            ? 'No se pudo conectar con la API. Verificá VITE_API_URL en apps/web/.env y que Railway (o la API local) esté online.'
            : 'No se pudo conectar con la API. Verificá tu conexión e intentá de nuevo.',
      }
    }

    if (status === 403) {
      return {
        code: 'FORBIDDEN',
        message: 'No tenés permiso para realizar esta acción.',
      }
    }

    if (status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'El recurso solicitado no existe.',
      }
    }

    if (status === 302 || status === 303) {
      return {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'La sesión expiró o el token de seguridad no es válido. Recargá la página e intentá de nuevo.',
      }
    }

    if (status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Debe iniciar sesión para acceder a este recurso.',
      }
    }
  }

  if (axios.isAxiosError(error) && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
    if (usesLocalApiProxy()) {
      return {
        code: 'NETWORK_ERROR',
        message:
          'No se pudo conectar con la API. Verificá que `VITE_API_URL` en apps/web/.env apunte a Railway (o a la API local en :3333), reiniciá `pnpm dev:web` y recargá la página.',
      }
    }

    return {
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.',
    }
  }

  if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
    return {
      code: 'TIMEOUT_ERROR',
      message:
        'La API tardó demasiado en responder. Revisá tu conexión o intentá de nuevo en unos segundos.',
    }
  }

  if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 500) {
    const loosePayload = parseLooseErrorPayload(error.response.data, error.response.status)
    if (loosePayload) {
      return loosePayload
    }

    return {
      code: 'SERVER_ERROR',
      message: 'El servidor respondió con un error inesperado. Intentá de nuevo en unos segundos.',
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message.trim(),
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Ocurrió un error inesperado. Intentá de nuevo.',
  }
}

export function isStockInsuficienteDetail(value: unknown): value is StockInsuficienteDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'material_id' in value &&
    'name' in value &&
    'faltante' in value
  )
}

export function parseStockInsuficienteDetails(details: unknown): StockInsuficienteDetail[] | null {
  if (!Array.isArray(details) || details.length === 0) {
    return null
  }

  if (!details.every(isStockInsuficienteDetail)) {
    return null
  }

  return details
}

function isStockInsuficienteDevolucionDetail(
  value: unknown
): value is StockInsuficienteDevolucionDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'material_id' in value &&
    'material_name' in value &&
    'required' in value &&
    'available' in value
  )
}

function formatRecordDetails(details: Record<string, unknown>): string[] {
  const messages: string[] = []

  for (const [field, value] of Object.entries(details)) {
    if (typeof value === 'string') {
      messages.push(`${field}: ${value}`)
      continue
    }

    if (Array.isArray(value)) {
      const text = value.filter((item): item is string => typeof item === 'string').join(', ')
      if (text) {
        messages.push(`${field}: ${text}`)
      }
    }
  }

  return messages
}

function formatDetailItem(item: unknown): string | null {
  if (isVineValidationDetail(item)) {
    return item.message
  }

  if (isStockInsuficienteDetail(item)) {
    return `${item.name}: faltan ${item.faltante} unidades (stock ${item.stock_actual}, consumo ${item.consumo_proyectado})`
  }

  if (isStockInsuficienteDevolucionDetail(item)) {
    return `${item.material_name}: se requieren ${item.required} y hay ${item.available} disponibles`
  }

  if (typeof item === 'string' && item.trim().length > 0) {
    return item.trim()
  }

  return null
}

/** Convierte `error.details` de la API en mensajes legibles para el usuario. */
export function formatApiErrorDetails(details: unknown): string[] {
  if (!details) {
    return []
  }

  if (Array.isArray(details)) {
    if (details.length === 0) {
      return []
    }

    if (details.every(isVineValidationDetail)) {
      return details
        .map((item) => {
          if (item.field === 'chart') {
            return 'El período del gráfico no es válido o aún no está disponible en el servidor.'
          }

          return item.message
        })
        .filter(Boolean)
    }

    if (details.every(isStockInsuficienteDetail)) {
      return details.map(
        (item) =>
          `${item.name}: faltan ${item.faltante} unidades (stock ${item.stock_actual}, consumo ${item.consumo_proyectado})`
      )
    }

    if (details.every(isStockInsuficienteDevolucionDetail)) {
      return details.map(
        (item) =>
          `${item.material_name}: se requieren ${item.required} y hay ${item.available} disponibles`
      )
    }

    return details.map(formatDetailItem).filter((line): line is string => Boolean(line))
  }

  if (typeof details === 'object') {
    return formatRecordDetails(details as Record<string, unknown>)
  }

  return []
}

/** Indica si `details` incluye un error de validación para el campo dado. */
export function apiErrorDetailsIncludeField(details: unknown, field: string): boolean {
  if (!details) {
    return false
  }

  if (Array.isArray(details)) {
    return details.some(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'field' in item &&
        (item as VineValidationDetail).field === field
    )
  }

  if (typeof details === 'object') {
    return field in details
  }

  return false
}

/** Convierte mensajes técnicos de servidor/SQL en texto usable para la UI. */
function sanitizeUserFacingMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return trimmed

  const lower = trimmed.toLowerCase()
  if (
    lower.includes("doesn't exist") ||
    lower.includes('does not exist') ||
    lower.includes('unknown column') ||
    lower.includes('er_no_such_table') ||
    lower.includes('er_bad_field_error') ||
    /\bselect\s+.+\s+from\s+/i.test(trimmed) ||
    /\b(insert|update|delete)\s+.+\s+(into|from|set)\b/i.test(trimmed)
  ) {
    // Keep actionable provision / MySQL privilege messages visible.
    if (
      lower.includes('create database') ||
      lower.includes('grant create') ||
      lower.includes('mysql') ||
      lower.includes('railway')
    ) {
      return trimmed
    }
    return 'El servidor no está listo o la base de datos no está migrada. Contactá al administrador o revisá el despliegue.'
  }

  return trimmed
}

/** Mensaje listo para mostrar en UI: prioriza `details` sobre el mensaje genérico. */
export function getApiErrorMessage(error: unknown): string {
  const apiError = getApiError(error)
  const lines = formatApiErrorDetails(apiError.details)

  if (lines.length > 0) {
    return sanitizeUserFacingMessage(lines.join('\n'))
  }

  return sanitizeUserFacingMessage(apiError.message)
}

/** @deprecated Usar `formatApiErrorDetails` o `getApiErrorMessage`. */
export function formatValidationDetails(details: unknown): string | null {
  const lines = formatApiErrorDetails(details)
  return lines.length > 0 ? lines.join(' · ') : null
}
