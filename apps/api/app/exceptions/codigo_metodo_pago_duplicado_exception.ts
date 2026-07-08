export default class CodigoMetodoPagoDuplicadoException extends Error {
  static code = 'CODIGO_METODO_PAGO_DUPLICADO'
  static message = 'Ya existe un método de pago con ese código'

  constructor(message?: string) {
    super(message || CodigoMetodoPagoDuplicadoException.message)
  }
}
