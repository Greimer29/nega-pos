export default class TasaCambioInvalidaException extends Error {
  static code = 'TASA_CAMBIO_INVALIDA'
  static message = 'La tasa de cambio de la moneda no es válida'

  constructor(message?: string) {
    super(message || TasaCambioInvalidaException.message)
  }
}
