import { BaseSchema } from '@adonisjs/lucid/schema'

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  FABRIC: 'Telas',
  THREAD: 'Hilos',
  BUTTON: 'Botones',
  ELASTIC: 'Elásticas',
  LABEL: 'Etiquetas',
  BAG: 'Envolturas',
  OTHER: 'Otro',
}

export default class extends BaseSchema {
  async up() {
    for (const [legacy, label] of Object.entries(LEGACY_CATEGORY_LABELS)) {
      await this.db.rawQuery('UPDATE materials SET category = ? WHERE category = ?', [
        label,
        legacy,
      ])
    }

    await this.db.rawQuery('ALTER TABLE materials MODIFY COLUMN category VARCHAR(100) NOT NULL')

    const fallback = await this.db
      .from('categories')
      .where('active', true)
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')
      .select('name')
      .first()

    const fallbackName = fallback?.name ?? 'Otro'

    await this.db.rawQuery(
      `
      UPDATE materials m
      LEFT JOIN categories c ON LOWER(c.name) = LOWER(m.category) AND c.active = 1
      SET m.category = ?
      WHERE c.id IS NULL
      `,
      [fallbackName]
    )
  }

  async down() {
    const reverseLabels: Record<string, string> = Object.fromEntries(
      Object.entries(LEGACY_CATEGORY_LABELS).map(([code, label]) => [label, code])
    )

    await this.db.rawQuery(`
      ALTER TABLE materials MODIFY COLUMN category ENUM(
        'FABRIC','THREAD','BUTTON','ELASTIC','LABEL','BAG','OTHER'
      ) NOT NULL
    `)

    for (const [label, legacy] of Object.entries(reverseLabels)) {
      await this.db.rawQuery('UPDATE materials SET category = ? WHERE category = ?', [
        legacy,
        label,
      ])
    }
  }
}
