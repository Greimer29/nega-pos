export default class MetodoPagoEnUsoException extends Error {
  static code = 'METODO_PAGO_EN_USO'
  static message = 'No se puede eliminar: hay ventas que usan este método de pago'

  constructor(message?: string) {
    super(message || MetodoPagoEnUsoException.message)
  }
}
