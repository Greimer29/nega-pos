import { Exception } from '@adonisjs/core/exceptions'

export default class ArchivoReferenciaNoAdjuntoException extends Exception {
  static code = 'ARCHIVO_REFERENCIA_NO_ADJUNTO'
  static message = 'El order no tiene archivo de referencia adjunto'

  constructor() {
    super(ArchivoReferenciaNoAdjuntoException.message, {
      status: 404,
      code: ArchivoReferenciaNoAdjuntoException.code,
    })
  }
}
