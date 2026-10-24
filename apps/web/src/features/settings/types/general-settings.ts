export type BusinessPalette = {
  primary: string
  secondary: string
  accent: string
}

export type BusinessProfile = {
  trade_name: string
  tagline: string
  ticket_footer: string
  legal_name: string
  rif: string
  address: string
  phone: string
  email: string
  website: string
  has_logo: boolean
  use_custom_palette: boolean
  palette: BusinessPalette
  quote_validity_days: number
  quote_terms: string
}

export type BusinessProfileInput = {
  trade_name: string
  tagline?: string
  ticket_footer?: string
  legal_name?: string
  rif?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  use_custom_palette?: boolean
  palette?: BusinessPalette
  quote_validity_days?: number
  quote_terms?: string
}

export const DEFAULT_QUOTE_VALIDITY_DAYS = 3
export const MAX_QUOTE_VALIDITY_DAYS = 365

export const DEFAULT_BUSINESS_PALETTE: BusinessPalette = {
  primary: '#1a1a1a',
  secondary: '#f5f5f5',
  accent: '#f5f5f5',
}

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  trade_name: '',
  tagline: '',
  ticket_footer: 'Gracias por su compra',
  legal_name: '',
  rif: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  has_logo: false,
  use_custom_palette: false,
  palette: { ...DEFAULT_BUSINESS_PALETTE },
  quote_validity_days: DEFAULT_QUOTE_VALIDITY_DAYS,
  quote_terms: '',
}
