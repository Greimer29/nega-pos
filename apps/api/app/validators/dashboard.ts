import vine from '@vinejs/vine'

export const dashboardOverviewValidator = vine.create({
  chart: vine.enum(['daily', 'weekly', 'monthly'] as const).optional(),
})

export const dashboardDailyClosingValidator = vine.create({
  date: vine.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
