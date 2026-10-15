import MaquinaNoEncontradaException from '#exceptions/maquina_no_encontrada_exception'
import MaquinaNoEsCreditoException from '#exceptions/maquina_no_es_credito_exception'
import PagoMaquinaExcedeSaldoException from '#exceptions/pago_maquina_excede_saldo_exception'
import PagoMaquinaMontoInvalidoException from '#exceptions/pago_maquina_monto_invalido_exception'
import Machine from '#models/machine'
import MachinePayment from '#models/machine_payment'
import AccountService from '#services/account_service'
import CurrencyService from '#services/currency_service'
import { resolveMonetaryEntryAmount } from '#utils/monetary_entry'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export type MachinePaymentInput = {
  account_id?: number | null
  /** Monto en moneda de ingreso. Preferido; si falta se usa amount_usd (base). */
  amount?: number
  amount_usd?: number
  currency_code?: string
  entry_rate?: number
  date: string
  note?: string
}

export default class MachinePaymentService {
  private accountService = new AccountService()
  private currencyService = new CurrencyService()

  async listar(machineId: number): Promise<MachinePayment[]> {
    await this.assertMachineExists(machineId)
    return MachinePayment.query()
      .where('machineId', machineId)
      .preload('account')
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
  }

  async registrar(machineId: number, input: MachinePaymentInput): Promise<MachinePayment> {
    if (input.account_id) {
      await this.accountService.assertActiva(input.account_id)
    }

    const amountNative = input.amount ?? input.amount_usd
    if (amountNative === undefined || !(amountNative > 0)) {
      throw new PagoMaquinaMontoInvalidoException()
    }

    const monetary = await resolveMonetaryEntryAmount({
      amountNative,
      currencyCode: input.currency_code,
      entryRate: input.entry_rate,
      currencyService: this.currencyService,
    })
    const amountUsd = Number(monetary.amountUsd)

    return db.transaction(async (trx) => {
      const machine = await Machine.query({ client: trx })
        .where('id', machineId)
        .forUpdate()
        .first()

      if (!machine) {
        throw new MaquinaNoEncontradaException()
      }

      if (!machine.isCredit) {
        throw new MaquinaNoEsCreditoException()
      }

      const balance = Number(machine.balanceUsd)
      if (amountUsd > balance + 0.0001) {
        throw new PagoMaquinaExcedeSaldoException()
      }

      const applied = Math.min(amountUsd, balance)
      machine.amountPaidUsd = (Number(machine.amountPaidUsd) + applied).toFixed(4)
      machine.balanceUsd = Math.max(0, balance - applied).toFixed(4)
      machine.useTransaction(trx)
      await machine.save()

      return MachinePayment.create(
        {
          machineId,
          accountId: input.account_id ?? null,
          amountUsd: applied.toFixed(4),
          currencyCode: monetary.currencyCode,
          entryRate: monetary.entryRate,
          amountNative: monetary.amountNative,
          date: DateTime.fromISO(input.date),
          note: input.note?.trim() || null,
        },
        { client: trx }
      )
    })
  }

  private async assertMachineExists(machineId: number) {
    const machine = await Machine.find(machineId)
    if (!machine) {
      throw new MaquinaNoEncontradaException()
    }
  }
}
