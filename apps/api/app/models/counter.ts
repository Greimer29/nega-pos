import { CounterSchema } from '#database/schema'

export default class Counter extends CounterSchema {
  static table = 'counters'
}
