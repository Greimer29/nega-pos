import type { HttpContext } from '@adonisjs/core/http'
import Company from '#models/company'
import PlatformAdmin from '#models/platform_admin'
import TenantProvisionService from '#services/tenant_provision_service'
import { clearTenantClaims } from '#services/directory_auth_service'
import {
  PLATFORM_SESSION_KEY,
  readPlatformClaims,
} from '#middleware/platform_auth_middleware'
import {
  confirmCompanyValidator,
  createCompanyValidator,
  platformLoginValidator,
  resendCompanyOtpValidator,
  updateCompanyStatusValidator,
} from '#validators/platform'

function serializeCompany(company: Company) {
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    dbName: company.dbName,
    status: company.status,
    createdAt: company.createdAt.toISO(),
    updatedAt: company.updatedAt.toISO(),
  }
}

function serializePlatformAdmin(admin: PlatformAdmin) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
  }
}

function mapServiceError(error: unknown, response: HttpContext['response']) {
  if (error && typeof error === 'object' && 'code' in error) {
    const err = error as { code?: string; message?: string; status?: number }
    return response.status(err.status ?? 400).json({
      error: {
        code: err.code,
        message: err.message ?? 'Error de plataforma',
      },
    })
  }
  throw error
}

export default class PlatformController {
  #provision = new TenantProvisionService()

  async login({ request, session, auth, serialize, response }: HttpContext) {
    const { email, password } = await request.validateUsing(platformLoginValidator)
    const admin = await PlatformAdmin.query().where('email', email.trim().toLowerCase()).first()

    if (!admin || !(await admin.verifyPassword(password)) || !admin.active) {
      return response.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales inválidas',
        },
      })
    }

    // Avoid stale tenant web-session cookies conflicting with platform auth.
    try {
      await auth.use('web').logout()
    } catch {
      // ignore
    }
    clearTenantClaims(session)

    session.put(PLATFORM_SESSION_KEY, { id: admin.id, email: admin.email })

    return serialize({ admin: serializePlatformAdmin(admin) })
  }

  async logout({ session, serialize }: HttpContext) {
    session.forget(PLATFORM_SESSION_KEY)
    return serialize({ message: 'Sesión de plataforma cerrada' })
  }

  async me({ session, serialize, response }: HttpContext) {
    const claims = readPlatformClaims(session)
    if (!claims) {
      return response.status(401).json({
        error: { code: 'PLATFORM_UNAUTHORIZED', message: 'Sin sesión de plataforma' },
      })
    }

    const admin = await PlatformAdmin.find(claims.id)
    if (!admin || !admin.active) {
      session.forget(PLATFORM_SESSION_KEY)
      return response.status(401).json({
        error: { code: 'PLATFORM_UNAUTHORIZED', message: 'Super admin inactivo' },
      })
    }

    return serialize({ admin: serializePlatformAdmin(admin) })
  }

  async listCompanies({ serialize }: HttpContext) {
    const companies = await Company.query().orderBy('id', 'asc')
    return serialize({ companies: companies.map(serializeCompany) })
  }

  async createCompany({ request, serialize, response }: HttpContext) {
    const payload = await request.validateUsing(createCompanyValidator)

    try {
      const result = await this.#provision.requestCreate({
        slug: payload.slug,
        name: payload.name,
        adminEmail: payload.admin_email,
        adminPassword: payload.admin_password,
        adminName: payload.admin_name,
      })
      return serialize({
        message: 'Código enviado al email del administrador',
        email: result.email,
        slug: result.slug,
      })
    } catch (error) {
      return mapServiceError(error, response)
    }
  }

  async confirmCompany({ request, serialize, response }: HttpContext) {
    const payload = await request.validateUsing(confirmCompanyValidator)

    try {
      const company = await this.#provision.confirmCreate(payload.email, payload.code)
      return serialize({ company: serializeCompany(company) })
    } catch (error) {
      return mapServiceError(error, response)
    }
  }

  async resendOtp({ request, serialize, response }: HttpContext) {
    const payload = await request.validateUsing(resendCompanyOtpValidator)

    try {
      const result = await this.#provision.resendCreateOtp(payload.email)
      return serialize({
        message: 'Código reenviado',
        email: result.email,
        slug: result.slug,
      })
    } catch (error) {
      return mapServiceError(error, response)
    }
  }

  async updateCompanyStatus({ params, request, serialize, response }: HttpContext) {
    const payload = await request.validateUsing(updateCompanyStatusValidator)
    const company = await Company.find(Number(params.id))

    if (!company) {
      return response.status(404).json({
        error: { code: 'COMPANY_NOT_FOUND', message: 'Empresa no encontrada' },
      })
    }

    company.status = payload.status
    await company.save()

    return serialize({ company: serializeCompany(company) })
  }
}
