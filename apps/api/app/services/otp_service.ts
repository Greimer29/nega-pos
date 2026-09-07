import { DateTime } from 'luxon'
import { randomInt } from 'node:crypto'
import EmailVerificationCode, {
  type EmailVerificationPurpose,
} from '#models/email_verification_code'
import { sendMail } from '#services/mail_service'

const OTP_TTL_MINUTES = 30

function generateCode(): string {
  return String(randomInt(100000, 999999))
}

export default class OtpService {
  async issue(params: {
    email: string
    purpose: EmailVerificationPurpose
    payload?: Record<string, unknown> | null
    subject?: string
  }) {
    const email = params.email.trim().toLowerCase()
    const code = generateCode()

    await EmailVerificationCode.query()
      .where('email', email)
      .where('purpose', params.purpose)
      .whereNull('consumed_at')
      .update({ consumed_at: DateTime.utc().toSQL() })

    const row = await EmailVerificationCode.create({
      email,
      code,
      purpose: params.purpose,
      payload: params.payload ?? null,
      expiresAt: DateTime.utc().plus({ minutes: OTP_TTL_MINUTES }),
      consumedAt: null,
    })

    await sendMail({
      to: email,
      subject: params.subject ?? 'Código de verificación — Nega POS',
      text: `Tu código de verificación es: ${code}\n\nVálido por ${OTP_TTL_MINUTES} minutos.`,
    })

    return row
  }

  async consume(params: {
    email: string
    purpose: EmailVerificationPurpose
    code: string
  }): Promise<EmailVerificationCode> {
    const email = params.email.trim().toLowerCase()
    const row = await EmailVerificationCode.query()
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

    row.consumedAt = DateTime.utc()
    await row.save()
    return row
  }
}
