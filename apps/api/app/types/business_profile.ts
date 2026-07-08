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
  logo_path: string | null
  use_custom_palette: boolean
  palette: BusinessPalette
}

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
  logo_path: null,
  use_custom_palette: false,
  palette: { ...DEFAULT_BUSINESS_PALETTE },
}
