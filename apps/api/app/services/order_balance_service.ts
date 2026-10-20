import ClienteSinCreditoException from '#exceptions/cliente_sin_credito_exception'
import Customer from '#models/customer'
import type Order from '#models/order'
import OrderLine from '#models/order_line'
import { nowInAppZone } from '#utils/app_timezone'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class OrderBalanceService {
  /**
   * Sets payment type and balance from the sum of line subtotals. Credit requires a customer
   * with credit days; the caller saves the order.
   */
  async applyConfirmationBalance(
    order: Order,
    paymentType: 'CASH' | 'CREDIT',
    trx: TransactionClientContract
  ) {
    const lines = await OrderLine.query({ client: trx }).where('orderId', Number(order.id))
    const totalUsd = lines.reduce((sum, line) => sum + Number(line.subtotalUsd), 0)

    order.paymentType = paymentType

    if (paymentType === 'CREDIT') {
      if (!order.customerId) {
        throw new ClienteSinCreditoException()
      }
      const customer = order.customer ?? (await Customer.find(order.customerId))
      if (!customer?.creditDays || customer.creditDays <= 0) {
        throw new ClienteSinCreditoException()
      }
      order.balanceUsd = totalUsd.toFixed(4)
      order.amountPaidUsd = '0.0000'
      order.creditDueDate = nowInAppZone().plus({ days: customer.creditDays }).startOf('day')
    } else {
      order.balanceUsd = '0.0000'
      order.amountPaidUsd = totalUsd.toFixed(4)
      order.creditDueDate = null
    }
  }
}
