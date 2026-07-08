export default class UltimoMetodoPagoActivoException extends Error {
  static code = 'ULTIMO_METODO_PAGO_ACTIVO'
  static message = 'Debe quedar al menos un método de pago activo para ventas de contado'

  constructor(message?: string) {
    super(message || UltimoMetodoPagoActivoException.message)
  }
}
