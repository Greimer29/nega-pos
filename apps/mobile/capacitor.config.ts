import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.negapos.app',
  appName: 'Nega POS',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    // Origen típico Capacitor iOS para CORS en la API (junto a MOBILE_APP_ORIGIN).
    contentInset: 'automatic',
  },
}

export default config
