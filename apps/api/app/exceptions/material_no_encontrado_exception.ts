import { Exception } from '@adonisjs/core/exceptions'

export default class MaterialNoEncontradoException extends Exception {
  static status = 404
  static code = 'MATERIAL_NO_ENCONTRADO'
  static message = 'Material no encontrado'
}
