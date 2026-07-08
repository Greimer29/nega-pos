import { Exception } from '@adonisjs/core/exceptions'

export default class ArchivoImagenNoDisponibleException extends Exception {
  static status = 404
  static code = 'IMAGE_NOT_AVAILABLE'
  static message = 'La imagen no está disponible en almacenamiento'
}
