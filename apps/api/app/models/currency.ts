import { CurrencySchema } from '#database/schema'

export default class Currency extends CurrencySchema {
  static table = 'currencies'
}
