export default class MetodoPagoRequeridoException extends Error {
  static code = 'METODO_PAGO_REQUERIDO'
  static message = 'Debe indicar un método de pago para ventas de contado'

  constructor(message?: string) {
    super(message || MetodoPagoRequeridoException.message)
  }
}
