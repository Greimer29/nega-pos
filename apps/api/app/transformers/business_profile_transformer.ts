import type { BusinessProfile } from '#types/business_profile'

export function serializeBusinessProfile(profile: BusinessProfile) {
  return {
    trade_name: profile.trade_name,
    tagline: profile.tagline,
    ticket_footer: profile.ticket_footer,
    legal_name: profile.legal_name,
    rif: profile.rif,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    website: profile.website,
    has_logo: Boolean(profile.logo_path),
    use_custom_palette: profile.use_custom_palette,
    palette: {
      primary: profile.palette.primary,
      secondary: profile.palette.secondary,
      accent: profile.palette.accent,
    },
  }
}
