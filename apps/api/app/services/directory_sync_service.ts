import DirectoryUser from '#models/directory_user'
import { getTenantStore } from '#utils/tenant_context'
import { isMultiTenantEnabled } from '#utils/multi_tenant'

/**
 * Keeps central directory_users in sync when tenant users are created/updated.
 */
export default class DirectorySyncService {
  async upsertFromTenantUser(input: {
    email: string
    password?: string
    role: 'ADMIN' | 'OPERATOR'
    active: boolean
    previousEmail?: string
  }) {
    if (!isMultiTenantEnabled()) {
      return
    }

    const store = getTenantStore()
    if (!store) {
      return
    }

    const email = input.email.trim().toLowerCase()
    let row =
      (input.previousEmail
        ? await DirectoryUser.query()
            .where('email', input.previousEmail.trim().toLowerCase())
            .where('company_id', store.companyId)
            .first()
        : null) ??
      (await DirectoryUser.query().where('email', email).where('company_id', store.companyId).first())

    if (!row) {
      const conflict = await DirectoryUser.findBy('email', email)
      if (conflict && conflict.companyId !== store.companyId) {
        throw Object.assign(new Error('Ese email ya pertenece a otra empresa'), {
          code: 'EMAIL_TAKEN',
          status: 409,
        })
      }

      await DirectoryUser.create({
        email,
        password: input.password ? await DirectoryUser.hashPassword(input.password) : null,
        companyId: store.companyId,
        role: input.role,
        active: input.active,
        googleSub: null,
      })
      return
    }

    if (row.email !== email) {
      const conflict = await DirectoryUser.findBy('email', email)
      if (conflict && Number(conflict.id) !== Number(row.id)) {
        throw Object.assign(new Error('Ese email ya pertenece a otra empresa'), {
          code: 'EMAIL_TAKEN',
          status: 409,
        })
      }
      row.email = email
    }

    if (input.password) {
      row.password = await DirectoryUser.hashPassword(input.password)
    }

    row.role = input.role
    row.active = input.active
    await row.save()
  }
}
