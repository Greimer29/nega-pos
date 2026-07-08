export default class MonedaProtegidaException extends Error {
  static code = 'MONEDA_PROTEGIDA'
  static message = 'Esta moneda no puede eliminarse ni desactivarse'

  constructor(message?: string) {
    super(message || MonedaProtegidaException.message)
  }
}
