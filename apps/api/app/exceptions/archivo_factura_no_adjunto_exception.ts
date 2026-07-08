import { Exception } from '@adonisjs/core/exceptions'

export default class ArchivoFacturaNoAdjuntoException extends Exception {
  static status = 404
  static code = 'ARCHIVO_FACTURA_NO_ADJUNTO'
  static message = 'Esta purchase no tiene factura adjunta'
}
