import User from '#models/user'
import UserInactiveException from '#exceptions/user_inactive_exception'
import { loginValidator } from '#validators/user'
import { serializeUser } from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 10

type LoginAttemptEntry = {
  count: number
  firstAttemptAt: number
}

const loginAttemptsByIp = new Map<string, LoginAttemptEntry>()

// Almacén en memoria por proceso; no comparte estado entre réplicas ni reinicios.

function getClientIp(request: HttpContext['request']): string {
  const forwarded = request.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || request.ip()
  }
  return request.ip()
}

function assertLoginRateLimit(ip: string) {
  const now = Date.now()
  const entry = loginAttemptsByIp.get(ip)

  if (!entry || now - entry.firstAttemptAt >= LOGIN_WINDOW_MS) {
    loginAttemptsByIp.set(ip, { count: 1, firstAttemptAt: now })
    return
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    throw Object.assign(
      new Error('Demasiados intentos de inicio de sesión. Intentá de nuevo más tarde.'),
      {
        code: 'TOO_MANY_LOGIN_ATTEMPTS',
      }
    )
  }

  entry.count += 1
}

function clearLoginRateLimit(ip: string) {
  loginAttemptsByIp.delete(ip)
}

export default class AuthControleler {
  /**
   * POST /api/v1/auth/login
   */
  async login({ request, auth, serialize, response }: HttpContext) {
    const ip = getClientIp(request)

    try {
      assertLoginRateLimit(ip)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Demasiados intentos')) {
        return response.status(429).json({
          error: {
            code: 'TOO_MANY_LOGIN_ATTEMPTS',
            message: error.message,
          },
        })
      }
      throw error
    }

    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)

    if (!user.active) {
      throw new UserInactiveException()
    }

    await auth.use('web').login(user)
    clearLoginRateLimit(ip)

    return serialize({
      user: serializeUser(user),
    })
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout({ auth, serialize }: HttpContext) {
    await auth.use('web').logout()

    return serialize({
      message: 'Sesión cerrada correctamente',
    })
  }

  /**
   * GET /api/v1/auth/me
   */
  async me({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    return serialize({
      user: serializeUser(user),
    })
  }
}
