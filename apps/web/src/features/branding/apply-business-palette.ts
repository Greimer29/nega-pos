import type { BusinessProfile, BusinessPalette } from '@/features/settings/types/general-settings'
import { DEFAULT_BUSINESS_PALETTE } from '@/features/settings/types/general-settings'

const DEFAULT_THEME_VARS = {
  primary: '#1a1a1a',
  primaryForeground: '#fafafa',
  secondary: '#f5f5f5',
  secondaryForeground: '#1a1a1a',
  accent: '#f5f5f5',
  accentForeground: '#1a1a1a',
} as const

function pickForeground(hex: string): string {
  const normalized = hex.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1a1a1a' : '#fafafa'
}

export function applyBusinessPalette(profile: BusinessProfile | null) {
  const root = document.documentElement

  if (!profile?.use_custom_palette) {
    root.style.removeProperty('--primary')
    root.style.removeProperty('--primary-foreground')
    root.style.removeProperty('--secondary')
    root.style.removeProperty('--secondary-foreground')
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-foreground')
    root.style.removeProperty('--sidebar-primary')
    root.style.removeProperty('--sidebar-primary-foreground')
    return
  }

  const palette: BusinessPalette = profile.palette ?? DEFAULT_BUSINESS_PALETTE

  root.style.setProperty('--primary', palette.primary)
  root.style.setProperty('--primary-foreground', pickForeground(palette.primary))
  root.style.setProperty('--secondary', palette.secondary)
  root.style.setProperty('--secondary-foreground', pickForeground(palette.secondary))
  root.style.setProperty('--accent', palette.accent)
  root.style.setProperty('--accent-foreground', pickForeground(palette.accent))
  root.style.setProperty('--sidebar-primary', palette.primary)
  root.style.setProperty('--sidebar-primary-foreground', pickForeground(palette.primary))
}

export function resetBusinessPalette() {
  applyBusinessPalette(null)
}

export { DEFAULT_THEME_VARS }
