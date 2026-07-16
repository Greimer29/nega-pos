/**
 * Quien puede abrir Configuración puede editar los paneles.
 * No se bloquean inputs en UI por permiso: la API sigue aplicando
 * `settings.view` / `settings.edit` en las mutaciones.
 */
export function useCanEditSettings() {
  return true
}

/**
 * Categorías en Configuración: editables si se ve el panel.
 * La API valida `catalog.edit` / `settings.*` al guardar.
 */
export function useCanManageCategories() {
  return true
}
