import MetodoPagoRequeridoException from '#exceptions/metodo_pago_requerido_exception'
import PagosVentaInvalidosException from '#exceptions/pagos_venta_invalidos_exception'

export type SalePaymentLineInput = {
  payment_method_code: string
  amount_usd: number
  currency_code?: string | null
  usd_rate?: number | null
}

type SalePaymentRequest = {
  payments?: SalePaymentLineInput[]
  payment_method_code?: string | null
  currency_code?: string | null
  usd_rate?: number | null
}

export function prepareSalePaymentLines(
  input: SalePaymentRequest,
  totalUsd: number
): SalePaymentLineInput[] {
  const paymentLines =
    input.payments && input.payments.length > 0
      ? input.payments
      : input.payment_method_code
        ? [
            {
              payment_method_code: input.payment_method_code,
              amount_usd: totalUsd,
              currency_code: input.currency_code,
              usd_rate: input.usd_rate,
            },
          ]
        : []

  if (paymentLines.length === 0) {
    throw new MetodoPagoRequeridoException()
  }

  const allocated = paymentLines.reduce((sum, line) => sum + Number(line.amount_usd), 0)
  if (!Number.isFinite(allocated) || Math.abs(allocated - totalUsd) > 0.00015) {
    throw new PagosVentaInvalidosException(
      `La suma de los pagos (${allocated.toFixed(4)}) no coincide con el total (${totalUsd.toFixed(4)})`
    )
  }

  const seen = new Set<string>()
  return paymentLines.map((line) => {
    const code = line.payment_method_code.trim()
    if (!code) {
      throw new MetodoPagoRequeridoException()
    }
    if (seen.has(code)) {
      throw new PagosVentaInvalidosException('No se puede repetir el mismo método de pago')
    }
    seen.add(code)

    const amountUsd = Number(line.amount_usd)
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      throw new PagosVentaInvalidosException('Cada método de pago debe tener un monto mayor a 0')
    }

    return { ...line, payment_method_code: code, amount_usd: amountUsd }
  })
}
