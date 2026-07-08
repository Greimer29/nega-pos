import RutaIdInvalidoException from '#exceptions/ruta_id_invalido_exception'

export function parseRouteId(value: string | undefined, label = 'recurso'): number {
  if (!value || !/^\d+$/.test(value)) {
    throw new RutaIdInvalidoException(`ID de ${label} inválido`)
  }

  const id = Number(value)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new RutaIdInvalidoException(`ID de ${label} inválido`)
  }

  return id
}
