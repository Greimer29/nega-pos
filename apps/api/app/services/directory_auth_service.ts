import { randomBytes } from 'node:crypto'
import Company from '#models/company'
import DirectoryUser from '#models/directory_user'
import PlatformAdmin from '#models/platform_admin'
import User from '#models/user'
import { ensureTenantConnection } from '#utils/tenant_connection'
import { runWithTenant, TENANT_SESSION_KEY, type TenantStore } from '#utils/tenant_context'
import type { HttpContext } from '@adonisjs/core/http'
import UserInactiveException from '#exceptions/user_inactive_exception'

export type TenantSessionClaims = {
  companyId: number
  dbName: string
  directoryUserId: number | null
}

export type PlatformLoginCompany = {
  id: number
  slug: string
  name: string
  status: string
}

export function readTenantClaims(session: HttpContext['session']): TenantSessionClaims | null {
  const raw = session.get(TENANT_SESSION_KEY)
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const claims = raw as Partial<TenantSessionClaims>
  if (typeof claims.companyId !== 'number' || typeof claims.dbName !== 'string') {
    return null
  }
  return {
    companyId: claims.companyId,
    dbName: claims.dbName,
    directoryUserId: typeof claims.directoryUserId === 'number' ? claims.directoryUserId : null,
  }
}

export function writeTenantClaims(session: HttpContext['session'], claims: TenantSessionClaims) {
  session.put(TENANT_SESSION_KEY, claims)
}

export function clearTenantClaims(session: HttpContext['session']) {
  session.forget(TENANT_SESSION_KEY)
}

async function ensureHiddenPlatformUser(platformAdmin: PlatformAdmin): Promise<User> {
  const email = platformAdmin.email.trim().toLowerCase()
  const existing = await User.query().where('email', email).first()

  if (existing) {
    existing.isHidden = true
    existing.role = 'ADMIN'
    existing.active = true
    existing.permissions = null
    if (platformAdmin.name?.trim() && existing.name !== platformAdmin.name.trim()) {
      existing.name = platformAdmin.name.trim()
    }
    await existing.save()
    return existing
  }

  return User.create({
    email,
    name: platformAdmin.name.trim() || 'Administrador de plataforma',
    password: randomBytes(32).toString('hex'),
    role: 'ADMIN',
    permissions: null,
    active: true,
    isHidden: true,
  })
}

export async function establishTenantSession(
  auth: HttpContext['auth'],
  session: HttpContext['session'],
  directoryUser: DirectoryUser,
  company: Company
) {
  if (company.status !== 'ACTIVE') {
    throw Object.assign(new Error('La empresa no está activa'), {
      code: 'COMPANY_INACTIVE',
      status: 403,
    })
  }

  if (!directoryUser.active) {
    throw new UserInactiveException()
  }

  const connectionName = ensureTenantConnection(company.dbName)
  const store: TenantStore = {
    companyId: company.id,
    dbName: company.dbName,
    connectionName,
    directoryUserId: directoryUser.id,
  }

  const user = await runWithTenant(store, async () => {
    const tenantUser = await User.query().where('email', directoryUser.email).first()
    if (!tenantUser) {
      throw Object.assign(new Error('Usuario no encontrado en la empresa'), {
        code: 'TENANT_USER_MISSING',
        status: 500,
      })
    }
    if (!tenantUser.active) {
      throw new UserInactiveException()
    }
    await auth.use('web').login(tenantUser)
    return tenantUser
  })

  writeTenantClaims(session, {
    companyId: company.id,
    dbName: company.dbName,
    directoryUserId: directoryUser.id,
  })

  return { user, company, store }
}

export async function establishPlatformTenantSession(
  auth: HttpContext['auth'],
  session: HttpContext['session'],
  platformAdmin: PlatformAdmin,
  company: Company
) {
  if (company.status !== 'ACTIVE') {
    throw Object.assign(new Error('La empresa no está activa'), {
      code: 'COMPANY_INACTIVE',
      status: 403,
    })
  }

  if (!platformAdmin.active) {
    throw new UserInactiveException()
  }

  const connectionName = ensureTenantConnection(company.dbName)
  const store: TenantStore = {
    companyId: company.id,
    dbName: company.dbName,
    connectionName,
    directoryUserId: null,
  }

  const user = await runWithTenant(store, async () => {
    const tenantUser = await ensureHiddenPlatformUser(platformAdmin)
    await auth.use('web').login(tenantUser)
    return tenantUser
  })

  writeTenantClaims(session, {
    companyId: company.id,
    dbName: company.dbName,
    directoryUserId: null,
  })

  return { user, company, store }
}

export default class DirectoryAuthService {
  async loginWithPassword(email: string, password: string, companySlug?: string | null) {
    const normalized = email.trim().toLowerCase()
    const platformAdmin = await PlatformAdmin.query().where('email', normalized).first()
    const platformOk =
      !!platformAdmin && platformAdmin.active && (await platformAdmin.verifyPassword(password))

    if (platformOk && platformAdmin) {
      const slug = companySlug?.trim().toLowerCase()
      if (!slug) {
        const companies = await Company.query().where('status', 'ACTIVE').orderBy('name', 'asc')
        const payload: PlatformLoginCompany[] = companies.map((company) => ({
          id: company.id,
          slug: company.slug,
          name: company.name,
          status: company.status,
        }))
        throw Object.assign(new Error('Elegí la empresa a la que querés entrar'), {
          code: 'COMPANY_SELECTION_REQUIRED',
          status: 422,
          companies: payload,
        })
      }

      const company = await Company.query().where('slug', slug).first()
      if (!company) {
        throw Object.assign(new Error('Empresa no encontrada'), {
          code: 'COMPANY_NOT_FOUND',
          status: 404,
        })
      }

      return { kind: 'platform' as const, platformAdmin, company }
    }

    const directoryUser = await DirectoryUser.query().where('email', normalized).first()

    if (!directoryUser || !(await directoryUser.verifyPassword(password))) {
      throw Object.assign(new Error('Credenciales inválidas'), {
        code: 'INVALID_CREDENTIALS',
        status: 401,
      })
    }

    const company = await Company.findOrFail(directoryUser.companyId)
    return { kind: 'directory' as const, directoryUser, company }
  }

  async loginWithGoogle(idToken: string, clientId: string) {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    )
    if (!response.ok) {
      throw Object.assign(new Error('Token de Google inválido'), {
        code: 'GOOGLE_TOKEN_INVALID',
        status: 401,
      })
    }

    const payload = (await response.json()) as {
      aud?: string
      email?: string
      email_verified?: string
      sub?: string
    }

    if (payload.aud !== clientId) {
      throw Object.assign(new Error('Token de Google no corresponde a esta app'), {
        code: 'GOOGLE_AUD_MISMATCH',
        status: 401,
      })
    }

    if (payload.email_verified !== 'true' || !payload.email || !payload.sub) {
      throw Object.assign(new Error('La cuenta de Google no está verificada'), {
        code: 'GOOGLE_EMAIL_UNVERIFIED',
        status: 401,
      })
    }

    const email = payload.email.trim().toLowerCase()
    let directoryUser = await DirectoryUser.query().where('email', email).first()

    if (!directoryUser) {
      throw Object.assign(new Error('Este email no está registrado en ninguna empresa'), {
        code: 'DIRECTORY_USER_NOT_FOUND',
        status: 404,
      })
    }

    if (!directoryUser.googleSub) {
      directoryUser.googleSub = payload.sub
      await directoryUser.save()
    } else if (directoryUser.googleSub !== payload.sub) {
      throw Object.assign(new Error('Cuenta de Google no coincide'), {
        code: 'GOOGLE_SUB_MISMATCH',
        status: 403,
      })
    }

    const company = await Company.findOrFail(directoryUser.companyId)
    return { directoryUser, company }
  }
}
