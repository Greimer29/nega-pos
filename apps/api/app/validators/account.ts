import vine from '@vinejs/vine'

const accountFields = {
  name: vine.string().trim().minLength(1).maxLength(150),
  description: vine.string().trim().maxLength(255).optional(),
}

export const createAccountValidator = vine.create({
  ...accountFields,
})

export const updateAccountValidator = vine.create({
  ...accountFields,
  is_active: vine.boolean().optional(),
})

export const listAccountsValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  active: vine.boolean().optional(),
})
