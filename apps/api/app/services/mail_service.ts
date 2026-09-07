import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export type SendMailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

export type SendMailResult = {
  delivered: boolean
}

/**
 * Sends email via Resend HTTP API when RESEND_API_KEY is set.
 * Without a key, logs the message and returns delivered=false (OTP still usable).
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const apiKey = env.get('RESEND_API_KEY')
  const from = env.get('MAIL_FROM') ?? 'Nega POS <onboarding@resend.dev>'

  if (!apiKey) {
    logger.info(
      { to: input.to, subject: input.subject, text: input.text },
      'Email skipped (RESEND_API_KEY unset) — message logged'
    )
    return { delivered: false }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<pre>${input.text}</pre>`,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`No se pudo enviar el email (${response.status}): ${body}`)
  }

  return { delivered: true }
}
