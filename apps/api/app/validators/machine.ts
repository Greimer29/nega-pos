import vine from '@vinejs/vine'

const ESTADOS = ['OPERATIONAL', 'UNDER_REPAIR', 'OUT_OF_SERVICE'] as const
const isoDate = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const machineFields = {
  name: vine.string().trim().minLength(1).maxLength(100),
  type: vine.string().trim().minLength(1).maxLength(80),
  brand: vine.string().trim().maxLength(80).optional(),
  model: vine.string().trim().maxLength(80).optional(),
  serialNumber: vine.string().trim().maxLength(80).optional(),
  date_adquisicion: isoDate.optional(),
  costo_adquisicion: vine.number().min(0).optional(),
  status: vine.enum(ESTADOS).optional(),
  location: vine.string().trim().maxLength(100).optional(),
  notes: vine.string().trim().optional(),
}

export const createMachineValidator = vine.create({
  ...machineFields,
})

export const updateMachineValidator = vine.create({
  ...machineFields,
  active: vine.boolean().optional(),
})

export const listMachinesValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  search: vine.string().trim().maxLength(150).optional(),
  type: vine.string().trim().maxLength(80).optional(),
  status: vine.enum(ESTADOS).optional(),
  active: vine.boolean().optional(),
})

const CATEGORIAS = ['REPAIR', 'SUPPLY', 'MAINTENANCE', 'OTHER'] as const

const expenseFields = {
  date: isoDate,
  category: vine.enum(CATEGORIAS),
  description: vine.string().trim().minLength(1).maxLength(255),
  amount: vine.number().min(0),
  currency_code: vine.string().trim().toUpperCase().fixedLength(3).optional(),
  supplier_id: vine.number().min(1).optional(),
  notes: vine.string().trim().optional(),
  account_id: vine.number().min(1).nullable().optional(),
}

export const createMachineExpenseValidator = vine.create({
  ...expenseFields,
})

export const updateMachineExpenseValidator = vine.create({
  ...expenseFields,
})

export const listMachineExpensesValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  machine_id: vine.number().min(1).optional(),
  category: vine.enum(CATEGORIAS).optional(),
  supplier_id: vine.number().min(1).optional(),
  date_desde: isoDate.optional(),
  date_hasta: isoDate.optional(),
  account_id: vine.number().min(1).optional(),
  unassigned: vine.boolean().optional(),
})

export const listGastosPorMachineValidator = vine.create({
  page: vine.number().min(1).optional(),
  per_page: vine.number().min(1).max(100).optional(),
  category: vine.enum(CATEGORIAS).optional(),
  date_desde: isoDate.optional(),
  date_hasta: isoDate.optional(),
  account_id: vine.number().min(1).optional(),
  unassigned: vine.boolean().optional(),
})
