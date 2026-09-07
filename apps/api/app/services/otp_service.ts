import { DateTime } from 'luxon'
import { randomInt } from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import EmailVerificationCode, {
  type EmailVerificationPurpose,
} from '#models/email_verification_code'
import { sendMail } from '#services/mail_service'

const OTP_TTL_MINUTES = 30

function generateCode(): string {
  return String(randomInt(100000, 999999))
}

function centralCodes() {
  return db.connection('central').from('email_verification_codes')
}

function centralCodesTable() {
  return db.connection('central').table('email_verification_codes')
}

export type IssueOtpResult = {
  row: { id: number; email: string; code: string }
  code: string
  emailDelivered: boolean
  emailError?: string
}

export default class OtpService {
  async issue(params: {
    email: string
    purpose: EmailVerificationPurpose
    payload?: Record<string, unknown> | null
    subject?: string
  }): Promise<IssueOtpResult> {
    const email = params.email.trim().toLowerCase()
    const code = generateCode()
    const now = DateTime.utc()

    await centralCodes()
      .where('email', email)
      .where('purpose', params.purpose)
      .whereNull('consumed_at')
      .update({ consumed_at: now.toSQL() })

    const [id] = await centralCodesTable().insert({
      email,
      code,
      purpose: params.purpose,
      payload: params.payload ? JSON.stringify(params.payload) : null,
      expires_at: now.plus({ minutes: OTP_TTL_MINUTES }).toSQL(),
      consumed_at: null,
      created_at: now.toSQL(),
      updated_at: now.toSQL(),
    })

    const row = { id: Number(id), email, code }
    const mailText = `Tu código de verificación es: ${code}\n\nVálido por ${OTP_TTL_MINUTES} minutos.`

    try {
      const mail = await sendMail({
        to: email,
        subject: params.subject ?? 'Código de verificación — Nega POS',
        text: mailText,
      })
      if (!mail.delivered) {
        logger.info({ to: email, code }, 'OTP debug code (email not delivered)')
      }
      return { row, code, emailDelivered: mail.delivered }
    } catch (error) {
      const emailError = error instanceof Error ? error.message : String(error)
      logger.warn({ err: error, email, code }, 'OTP saved but email delivery failed')
      logger.info({ to: email, code }, 'OTP debug code (email failed)')
      return { row, code, emailDelivered: false, emailError }
    }
  }

  async verify(params: {
    email: string
    purpose: EmailVerificationPurpose
    code: string
  }): Promise<EmailVerificationCode> {
    const email = params.email.trim().toLowerCase()
    const row = await EmailVerificationCode.query({ connection: 'central' })
      .where('email', email)
      .where('purpose', params.purpose)
      .where('code', params.code.trim())
      .whereNull('consumed_at')
      .orderBy('id', 'desc')
      .first()

    if (!row) {
      throw Object.assign(new Error('Código inválido o ya utilizado'), {
        code: 'OTP_INVALID',
        status: 400,
      })
    }

    if (row.expiresAt < DateTime.utc()) {
      throw Object.assign(new Error('El código expiró. Solicitá uno nuevo.'), {
        code: 'OTP_EXPIRED',
        status: 400,
      })
    }

    return row
  }

  async markConsumed(id: number) {
    await centralCodes()
      .where('id', id)
      .update({
        consumed_at: DateTime.utc().toSQL(),
        updated_at: DateTime.utc().toSQL(),
      })
  }

  async consume(params: {
    email: string
    purpose: EmailVerificationPurpose
    code: string
  }): Promise<EmailVerificationCode> {
    const row = await this.verify(params)
    await this.markConsumed(row.id)
    return row
  }
}
