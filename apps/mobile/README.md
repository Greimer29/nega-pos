# Nega POS — APK Android (Capacitor)

Wrapper Capacitor que empaqueta el build de `apps/web` y habla con la **API pública** (cookies cross-origin). El desktop Electron **no** usa este proyecto.

## Requisitos

- Node 20+ / pnpm 9+
- JDK 17+ y Android SDK (Android Studio recomendado)
- API HTTPS accesible (Railway u otro) con `MOBILE_APP_ORIGIN=https://localhost` en CORS

## Generar APK (release firmado)

1. Keystore local (ya generado en esta máquina; **no va a git**):
   - `apps/mobile/android/nega-pos-release.jks`
   - `apps/mobile/android/keystore.properties`
2. Build:

```powershell
$env:VITE_API_URL = "https://TU-API-PUBLICA"
pnpm build:mobile
pnpm --filter mobile build:apk:release
```

APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

## Generar APK (debug)

Desde la raíz del monorepo:

```powershell
$env:VITE_API_URL = "https://TU-API-PUBLICA"
pnpm build:mobile
pnpm --filter mobile build:apk:debug
```

El APK queda en:

`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

O abrí Android Studio:

```powershell
pnpm --filter mobile open
```

y usá *Build → Build APK(s)*.

## Notas

- Impresión térmica y `print-config.json` son exclusivos del desktop.
- `pnpm build:desktop` no invoca Capacitor.
- Tras cambiar la web, volvé a correr `pnpm build:mobile` (o al menos web build + `pnpm --filter mobile sync`).
