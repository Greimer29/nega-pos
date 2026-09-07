import vine from '@vinejs/vine'

export const platformLoginValidator = vine.create({
  email: vine.string().email().maxLength(150),
  password: vine.string().minLength(1),
})

export const createCompanyValidator = vine.create({
  slug: vine.string().trim().minLength(2).maxLength(64),
  name: vine.string().trim().minLength(2).maxLength(150),
  admin_email: vine.string().email().maxLength(150),
  admin_password: vine.string().minLength(8).maxLength(255),
  admin_name: vine.string().trim().minLength(2).maxLength(100),
})

export const confirmCompanyValidator = vine.create({
  email: vine.string().email().maxLength(150),
  code: vine.string().trim().minLength(4).maxLength(12),
})

export const resendCompanyOtpValidator = vine.create({
  email: vine.string().email().maxLength(150),
})

export const retryCompanyOtpValidator = vine.create({
  admin_email: vine.string().email().maxLength(150),
  admin_password: vine.string().minLength(8).maxLength(255),
  admin_name: vine.string().trim().minLength(2).maxLength(100).optional(),
})

export const updateCompanyStatusValidator = vine.create({
  status: vine.enum(['ACTIVE', 'SUSPENDED'] as const),
})
