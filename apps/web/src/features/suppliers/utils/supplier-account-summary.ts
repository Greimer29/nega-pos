import type { SupplierAccountStatement } from '@/features/suppliers/types'

export type SupplierAccountSummary = {
  comprado: {
    montoUsd: number
    operacionesTotal: number
    creditoMontoUsd: number
    creditoOperaciones: number
    pagadoUsd: number
    creditoSaldoUsd: number
  }
  pagado: {
    montoUsd: number
    operaciones: number
    porcentajeSobreComprado: number
  }
  saldo: {
    montoUsd: number
    porcentajeSobreComprado: number
  }
}

function purchaseTotalUsd(purchase: SupplierAccountStatement['purchases'][number]) {
  return Number(purchase.totalUsd ?? 0)
}

function purchasePaidUsd(purchase: SupplierAccountStatement['purchases'][number]) {
  const total = purchaseTotalUsd(purchase)
  const balance = Number(purchase.balanceUsd ?? 0)
  return Math.max(0, total - balance)
}

export function computeSupplierAccountSummary(
  purchases: SupplierAccountStatement['purchases'],
  payments: SupplierAccountStatement['payments']
): SupplierAccountSummary {
  const confirmed = purchases.filter((purchase) => purchase.status === 'CONFIRMED')
  const confirmedCredit = confirmed.filter((purchase) => purchase.isCredit)

  const montoComprado = confirmed.reduce((sum, purchase) => sum + purchaseTotalUsd(purchase), 0)
  const montoPagado = confirmed.reduce((sum, purchase) => sum + purchasePaidUsd(purchase), 0)
  const creditoSaldoUsd = confirmedCredit.reduce(
    (sum, purchase) => sum + Number(purchase.balanceUsd ?? 0),
    0
  )
  const creditoMontoUsd = confirmedCredit.reduce(
    (sum, purchase) => sum + purchaseTotalUsd(purchase),
    0
  )

  const pagadoOperaciones =
    payments.length + confirmed.filter((purchase) => !purchase.isCredit).length

  const porcentajePagado = montoComprado > 0 ? (montoPagado / montoComprado) * 100 : 0
  const porcentajeSaldo = montoComprado > 0 ? (creditoSaldoUsd / montoComprado) * 100 : 0

  return {
    comprado: {
      montoUsd: montoComprado,
      operacionesTotal: purchases.length,
      creditoMontoUsd,
      creditoOperaciones: confirmedCredit.length,
      pagadoUsd: montoPagado,
      creditoSaldoUsd,
    },
    pagado: {
      montoUsd: montoPagado,
      operaciones: pagadoOperaciones,
      porcentajeSobreComprado: porcentajePagado,
    },
    saldo: {
      montoUsd: creditoSaldoUsd,
      porcentajeSobreComprado: porcentajeSaldo,
    },
  }
}
