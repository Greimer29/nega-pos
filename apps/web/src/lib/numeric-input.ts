/** Normaliza texto mientras se escribe: solo dígitos y hasta `maxDecimals` decimales. */
export function sanitizeDecimalInput(raw: string, maxDecimals: number): string {
  if (raw === '') {
    return ''
  }

  const normalized = raw.replace(',', '.')
  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized

  const dotIndex = unsigned.indexOf('.')
  let intPart = dotIndex === -1 ? unsigned : unsigned.slice(0, dotIndex)
  let decPart = dotIndex === -1 ? '' : unsigned.slice(dotIndex + 1)

  intPart = intPart.replace(/\D/g, '')
  decPart = decPart.replace(/\D/g, '').slice(0, maxDecimals)

  const hasDot = dotIndex !== -1
  let body: string

  if (hasDot) {
    body = decPart.length > 0 || unsigned.endsWith('.') ? `${intPart}.${decPart}` : `${intPart}.`
  } else {
    body = intPart
  }

  if (body === '' || body === '.') {
    return negative ? (body === '.' ? '-0.' : '-') : body
  }

  return negative ? `-${body}` : body
}

/** Redondea al salir del campo (máx. `maxDecimals` decimales). */
export function formatDecimalOnBlur(raw: string, maxDecimals: number): string {
  if (raw === '' || raw === '-' || raw === '.') {
    return ''
  }

  const num = Number(raw)
  if (!Number.isFinite(num)) {
    return sanitizeDecimalInput(raw, maxDecimals)
  }

  const factor = 10 ** maxDecimals
  const rounded = Math.round(num * factor) / factor
  return String(rounded)
}

export function parseDecimalInput(raw: string, maxDecimals: number): number | null {
  const formatted = formatDecimalOnBlur(raw, maxDecimals)
  if (formatted === '') {
    return null
  }

  const num = Number(formatted)
  return Number.isFinite(num) ? num : null
}

/** Incremento HTML `step` coherente con decimales (evita validación rota del navegador). */
export function resolveNumericInputStep(
  decimals: number,
  step?: number | 'any'
): number | 'any' {
  if (step !== undefined) {
    return step
  }

  if (decimals <= 0) {
    return 1
  }

  // Cualquier monto/decimal tipeado debe ser válido; min solo limita el piso, no el step.
  return 'any'
}
