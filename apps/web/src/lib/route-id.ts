export function isValidEntityId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id > 0
}

export function parsePositiveIntRouteParam(value: string | undefined): {
  id: number
  isValid: boolean
} {
  if (!value || !/^\d+$/.test(value)) {
    return { id: 0, isValid: false }
  }

  const id = Number(value)
  return {
    id,
    isValid: Number.isSafeInteger(id) && id > 0,
  }
}
