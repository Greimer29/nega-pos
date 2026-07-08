import { Exception } from '@adonisjs/core/exceptions'

export default class ArchivoReferenciaFaltanteException extends Exception {
  static code = 'ARCHIVO_REFERENCIA_FALTANTE'
  static message = 'El archivo de referencia no está disponible en almacenamiento'

  constructor() {
    super(ArchivoReferenciaFaltanteException.message, {
      status: 500,
      code: ArchivoReferenciaFaltanteException.code,
    })
  }
}
