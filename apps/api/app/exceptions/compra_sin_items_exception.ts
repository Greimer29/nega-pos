import { Exception } from '@adonisjs/core/exceptions'

export default class PurchaseSinItemsException extends Exception {
  static status = 422
  static code = 'COMPRA_SIN_ITEMS'
  static message = 'La purchase debe tener al menos un ítem para confirmar'
}
