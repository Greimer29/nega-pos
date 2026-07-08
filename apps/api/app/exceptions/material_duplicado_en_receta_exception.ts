import { Exception } from '@adonisjs/core/exceptions'

export default class MaterialDuplicadoEnRecetaException extends Exception {
  static status = 422
  static code = 'MATERIAL_DUPLICADO_EN_RECETA'
  static message = 'El material ya está en la receta del order'
}
