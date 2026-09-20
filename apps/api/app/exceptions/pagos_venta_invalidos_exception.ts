export default class PagosVentaInvalidosException extends Error {
  static code = 'PAGOS_VENTA_INVALIDOS'
  static message = 'Los montos de pago no coinciden con el total de la factura'
  static status = 422

  constructor(message?: string) {
    super(message || PagosVentaInvalidosException.message)
  }
}
