import User from '#models/user'
import UserInactiveException from '#exceptions/user_inactive_exception'
import { loginValidator, googleLoginValidator } from '#validators/user'
import { serializeUser } from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import { isMultiTenantEnabled } from '#utils/multi_tenant'
import Company from '#models/company'
import DirectoryAuthService, {
  clearTenantClaims,
  establishTenantSession,
  readTenantClaims,
} from '#services/directory_auth_service'
import env from '#start/env'

const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 10

type LoginAttemptEntry = {
  count: number
  firstAttemptAt: number
}

const loginAttemptsByIp = new Map<string, LoginAttemptEntry>()

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

function mapAuthError(error: unknown, response: HttpContext['response']) {
  if (error instanceof UserInactiveException) {
    throw error
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as { code?: string; message?: string; status?: number }
    const status = err.status ?? 401
    return response.status(status).json({
      error: {
        code: err.code === 'E_INVALID_CREDENTIALS' ? 'INVALID_CREDENTIALS' : err.code,
        message: err.message ?? 'No se pudo autenticar',
      },
    })
  }

  throw error
}

export default class AuthControleler {
  /**
   * POST /api/v1/auth/login
   */
  async login(ctx: HttpContext) {
    const { request, auth, serialize, response } = ctx
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

    if (isMultiTenantEnabled()) {
      try {
        const directoryAuth = new DirectoryAuthService()
        const { directoryUser, company } = await directoryAuth.loginWithPassword(email, password)
        const { user, company: activeCompany } = await establishTenantSession(
          auth,
          ctx.session,
          directoryUser,
          company
        )
        clearLoginRateLimit(ip)
        return serialize({
          user: serializeUser(user),
          company: {
            id: activeCompany.id,
            slug: activeCompany.slug,
            name: activeCompany.name,
            status: activeCompany.status,
          },
        })
      } catch (error) {
        return mapAuthError(error, response)
      }
    }

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
   * POST /api/v1/auth/google
   */
  async google(ctx: HttpContext) {
    const { request, serialize, response } = ctx

    if (!isMultiTenantEnabled()) {
      return response.status(404).json({
        error: {
          code: 'GOOGLE_AUTH_DISABLED',
          message: 'Login con Google no está disponible en este entorno',
        },
      })
    }

    const clientId = env.get('GOOGLE_CLIENT_ID')
    if (!clientId) {
      return response.status(503).json({
        error: {
          code: 'GOOGLE_NOT_CONFIGURED',
          message: 'GOOGLE_CLIENT_ID no está configurado',
        },
      })
    }

    const { id_token: idToken } = await request.validateUsing(googleLoginValidator)

    try {
      const directoryAuth = new DirectoryAuthService()
      const { directoryUser, company } = await directoryAuth.loginWithGoogle(idToken, clientId)
      const { user, company: activeCompany } = await establishTenantSession(
        ctx.auth,
        ctx.session,
        directoryUser,
        company
      )
      return serialize({
        user: serializeUser(user),
        company: {
          id: activeCompany.id,
          slug: activeCompany.slug,
          name: activeCompany.name,
          status: activeCompany.status,
        },
      })
    } catch (error) {
      return mapAuthError(error, response)
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout({ auth, session, serialize }: HttpContext) {
    await auth.use('web').logout()
    clearTenantClaims(session)

    return serialize({
      message: 'Sesión cerrada correctamente',
    })
  }

  /**
   * GET /api/v1/auth/me
   */
  async me({ auth, session, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const claims = readTenantClaims(session)
    let company = null

    if (isMultiTenantEnabled() && claims) {
      const row = await Company.find(claims.companyId)
      if (row) {
        company = {
          id: row.id,
          slug: row.slug,
          name: row.name,
          status: row.status,
        }
      }
    }

    return serialize({
      user: serializeUser(user),
      company,
    })
  }
}
