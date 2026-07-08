export default class MonedaNoEncontradaException extends Error {
  static code = 'MONEDA_NO_ENCONTRADA'
  static message = 'La moneda no existe'

  constructor(message?: string) {
    super(message || MonedaNoEncontradaException.message)
  }
}
