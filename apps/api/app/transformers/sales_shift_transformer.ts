import type SalesShift from '#models/sales_shift'

export function serializeSalesShift(shift: SalesShift) {
  return {
    id: Number(shift.id),
    opened_at: shift.openedAt.toISO(),
    closed_at: shift.closedAt?.toISO() ?? null,
    opened_by_user_id: Number(shift.openedByUserId),
    closed_by_user_id: shift.closedByUserId ? Number(shift.closedByUserId) : null,
    status: shift.status,
    notes: shift.notes,
    created_at: shift.createdAt.toISO(),
    updated_at: shift.updatedAt.toISO(),
  }
}
