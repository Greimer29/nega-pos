import { Exception } from '@adonisjs/core/exceptions'

export default class ArchivoComprobanteFaltanteException extends Exception {
  static code = 'ARCHIVO_COMPROBANTE_FALTANTE'
  static message = 'El comprobante no está disponible en almacenamiento'

  constructor() {
    super(ArchivoComprobanteFaltanteException.message, {
      status: 500,
      code: ArchivoComprobanteFaltanteException.code,
    })
  }
}
