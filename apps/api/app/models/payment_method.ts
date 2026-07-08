import { PaymentMethodSchema } from '#database/schema'

export default class PaymentMethod extends PaymentMethodSchema {
  static table = 'payment_methods'
}
