# Nega POS — Mobile (Capacitor)

Wrapper Capacitor que empaqueta el build de `apps/web` y habla con la **API pública** (Railway). El desktop Electron **no** usa este proyecto.

| Plataforma | Estado | Dónde se buildea |
|------------|--------|------------------|
| Android | Listo (`apps/mobile/android`) | Windows o Mac |
| iOS | Dependencia lista; proyecto nativo se genera en Mac | **Solo macOS + Xcode** |

## Requisitos comunes

- Node 20+ / pnpm 9+
- API HTTPS (`VITE_API_URL`) con CORS:
  - Android: `MOBILE_APP_ORIGIN=https://localhost`
  - iOS (Capacitor): suele ser `capacitor://localhost` o `ionic://localhost` — al primer build en Mac, confirmá el origen en Xcode y sumalo a `FRONTEND_URL` / allowlist CORS de la API si hace falta.

---

## Android (esta PC)

### Requisitos

- JDK 17+ y Android SDK (Android Studio recomendado)

### APK release firmado

1. Keystore local (**no va a git**):
   - `apps/mobile/android/nega-pos-release.jks`
   - `apps/mobile/android/keystore.properties`
2. Build:

```powershell
$env:VITE_API_URL = "https://TU-API-PUBLICA"
pnpm build:mobile
pnpm --filter mobile build:apk:release
```

APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

### APK debug

```powershell
$env:VITE_API_URL = "https://TU-API-PUBLICA"
pnpm build:mobile
pnpm --filter mobile build:apk:debug
```

O abrí Android Studio: `pnpm --filter mobile open`

---

## iOS (solo en una Mac)

**No se puede generar `.ipa` / Archive desde Windows.** En Windows solo preparamos el monorepo (deps + config). El proyecto `ios/` se crea y compila en la Mac.

### Qué llevar a la Mac

Opción recomendada — **clonar el repo** (mismo remoto GitHub):

```bash
git clone https://github.com/Greimer29/nega-pos.git
cd nega-pos
git checkout main   # o la rama con los cambios iOS
pnpm install
```

Alternativa: copiar el monorepo por USB/airdrop (excluí `node_modules`, `apps/web/dist`, `apps/mobile/android/build`, etc.).

### Requisitos en la Mac

- macOS reciente + **Xcode** (App Store) + Command Line Tools
- Cuenta **Apple Developer** (para device físico, TestFlight o App Store)
- CocoaPods (`sudo gem install cocoapods` o vía Homebrew)

### Primera vez: crear el proyecto nativo iOS

Desde la raíz del monorepo en la Mac:

```bash
export VITE_API_URL="https://nega-pos-api-production.up.railway.app"
pnpm build:mobile          # build web + sync android (ok)
pnpm --filter mobile add:ios   # crea apps/mobile/ios (solo una vez)
pnpm --filter mobile sync:ios  # copia web/dist + plugins a ios
pnpm --filter mobile open:ios  # abre Xcode
```

Si `cap add ios` ya corrió y existe `apps/mobile/ios`, en siguientes builds:

```bash
export VITE_API_URL="https://nega-pos-api-production.up.railway.app"
pnpm --filter web build
# regenerar runtime-config (mismo que build:mobile)
node -e "const fs=require('fs'); const u=process.env.VITE_API_URL; fs.writeFileSync('apps/web/dist/runtime-config.json', JSON.stringify({apiUrl:u,useLocalApiProxy:false},null,2))"
pnpm --filter mobile sync:ios
pnpm --filter mobile open:ios
```

O usá el script PowerShell equivalente en Mac con bash (build web + sync ios).

### En Xcode

1. Seleccioná el target **App** → Signing & Capabilities → Team (tu Apple ID / org).
2. Bundle ID: `com.negapos.app` (debe coincidir con Capacitor `appId`).
3. Corré en simulador o device: ▶ Run.
4. Para distribución: **Product → Archive** → Organizer → Distribute (TestFlight / Ad Hoc / App Store).

### Commitear `ios/` o no

- **Sí conviene** versionar `apps/mobile/ios` (sin `Pods/` ni DerivedData) para que cualquier Mac clone y solo haga `pod install` + sync.
- Tras el primer `cap add ios` en Mac: `pod install` dentro de `apps/mobile/ios/App`, luego commit del proyecto generado.

`.gitignore` ya ignora `*.ipa` y artefactos de build.

---

## Notas

- Impresión térmica y `print-config.json` son exclusivos del desktop.
- `pnpm build:desktop` no invoca Capacitor.
- Tras cambiar la web, volvé a correr `pnpm build:mobile` (Android) o web build + `sync:ios` (iOS en Mac).
- El escáner de barcode (`@capacitor/barcode-scanner`) requiere permisos de cámara en iOS (`NSCameraUsageDescription` en `Info.plist`) — Capacitor/plugin suelen agregarlo al sync; verificá en Xcode.
