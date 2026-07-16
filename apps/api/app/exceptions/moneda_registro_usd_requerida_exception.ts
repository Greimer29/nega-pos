export const MONETARY_REGISTRATION_USD_MESSAGE =
  'El monto debe registrarse en la moneda base del sistema'

export default class MonedaRegistroUsdRequeridaException extends Error {
  static code = 'MONEDA_REGISTRO_USD_REQUERIDA'
  static message = MONETARY_REGISTRATION_USD_MESSAGE

  constructor(message?: string) {
    super(message || MonedaRegistroUsdRequeridaException.message)
  }
}
