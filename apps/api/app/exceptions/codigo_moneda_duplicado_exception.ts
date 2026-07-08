export default class CodigoMonedaDuplicadoException extends Error {
  static code = 'CODIGO_MONEDA_DUPLICADO'
  static message = 'Ya existe una moneda con ese código'

  constructor(message?: string) {
    super(message || CodigoMonedaDuplicadoException.message)
  }
}
