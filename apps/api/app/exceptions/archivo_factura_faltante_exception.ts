import { Exception } from '@adonisjs/core/exceptions'

export default class ArchivoFacturaFaltanteException extends Exception {
  static status = 500
  static code = 'ARCHIVO_FALTANTE'
  static message = 'La factura está registrada pero no se encontró el archivo en almacenamiento'
}
