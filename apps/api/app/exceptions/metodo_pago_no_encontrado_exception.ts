export default class MetodoPagoNoEncontradoException extends Error {
  static code = 'METODO_PAGO_NO_ENCONTRADO'
  static message = 'El método de pago no existe'

  constructor(message?: string) {
    super(message || MetodoPagoNoEncontradoException.message)
  }
}
