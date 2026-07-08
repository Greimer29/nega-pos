import type { CustomerAccountStatement } from '@/features/customers/types'

export type CustomerAccountSummary = {
  facturado: {
    montoUsd: number
    operacionesTotal: number
    creditoMontoUsd: number
    creditoOperaciones: number
    pagadoUsd: number
    creditoSaldoUsd: number
  }
  abonado: {
    montoUsd: number
    operaciones: number
    porcentajeSobreFacturado: number
  }
  pendiente: {
    montoUsd: number
    porcentajeSobreFacturado: number
  }
}

function saleTotalUsd(sale: CustomerAccountStatement['sales'][number]) {
  return Number(sale.totalUsd ?? 0)
}

function salePaidUsd(sale: CustomerAccountStatement['sales'][number]) {
  const total = saleTotalUsd(sale)
  const balance = Number(sale.balanceUsd ?? 0)
  return Math.max(0, total - balance)
}

function isBillable(sale: CustomerAccountStatement['sales'][number]) {
  return sale.status === 'COMPLETED'
}

function isCredit(sale: CustomerAccountStatement['sales'][number]) {
  return sale.paymentType === 'CREDIT'
}

export function computeCustomerAccountSummary(
  sales: CustomerAccountStatement['sales'],
  payments: CustomerAccountStatement['payments']
): CustomerAccountSummary {
  const billable = sales.filter(isBillable)
  const billableCredit = billable.filter(isCredit)

  const montoFacturado = billable.reduce((sum, sale) => sum + saleTotalUsd(sale), 0)
  const montoAbonado = billable.reduce((sum, sale) => sum + salePaidUsd(sale), 0)
  const creditoSaldoUsd = billableCredit.reduce(
    (sum, sale) => sum + Number(sale.balanceUsd ?? 0),
    0
  )
  const creditoMontoUsd = billableCredit.reduce((sum, sale) => sum + saleTotalUsd(sale), 0)

  const abonadoOperaciones =
    payments.length + billable.filter((sale) => !isCredit(sale)).length

  const porcentajeAbonado = montoFacturado > 0 ? (montoAbonado / montoFacturado) * 100 : 0
  const porcentajePendiente = montoFacturado > 0 ? (creditoSaldoUsd / montoFacturado) * 100 : 0

  return {
    facturado: {
      montoUsd: montoFacturado,
      operacionesTotal: sales.length,
      creditoMontoUsd,
      creditoOperaciones: billableCredit.length,
      pagadoUsd: montoAbonado,
      creditoSaldoUsd,
    },
    abonado: {
      montoUsd: montoAbonado,
      operaciones: abonadoOperaciones,
      porcentajeSobreFacturado: porcentajeAbonado,
    },
    pendiente: {
      montoUsd: creditoSaldoUsd,
      porcentajeSobreFacturado: porcentajePendiente,
    },
  }
}
