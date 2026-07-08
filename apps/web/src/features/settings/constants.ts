export type SettingsHubTab = 'general' | 'formatos' | 'ventas' | 'compras'

export const SETTINGS_HUB_PANEL_EXIT_MS = 220

export const PROFIT_MARGIN_PANEL_ID = 'profit-margin-panel'

export function parseSettingsTab(value: string | null): SettingsHubTab {
  if (value === 'compras') {
    return 'compras'
  }
  if (value === 'ventas') {
    return 'ventas'
  }
  if (value === 'formatos') {
    return 'formatos'
  }
  if (value === 'general') {
    return 'general'
  }
  return 'general'
}

export function settingsTabUrl(tab: SettingsHubTab, options?: { productId?: number }) {
  const params = new URLSearchParams({ tab })
  if (options?.productId) {
    params.set('productId', String(options.productId))
  }
  return `/settings?${params.toString()}`
}

export function profitMarginUrl(options?: { productId?: number }) {
  return `${settingsTabUrl('compras', options)}#${PROFIT_MARGIN_PANEL_ID}`
}
