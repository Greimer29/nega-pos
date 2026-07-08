export const MONETARY_REGISTRATION_USD_MESSAGE = 'Monto en VES o Bs debe ser modificado a $'

export default class MonedaRegistroUsdRequeridaException extends Error {
  static code = 'MONEDA_REGISTRO_USD_REQUERIDA'
  static message = MONETARY_REGISTRATION_USD_MESSAGE

  constructor(message?: string) {
    super(message || MonedaRegistroUsdRequeridaException.message)
  }
}
