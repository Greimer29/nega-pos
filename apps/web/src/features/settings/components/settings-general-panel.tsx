import { Download, ImageIcon, Loader2, Palette, RefreshCw, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { businessLogoUrl } from '@/features/settings/services/general-settings-service'
import { useGeneralSettingsPanel } from '@/features/settings/hooks/use-general-settings-panel'
import { useAppUpdates } from '@/features/settings/hooks/use-app-updates'
import { DEFAULT_BUSINESS_PALETTE } from '@/features/settings/types/general-settings'

export function SettingsGeneralPanel() {
  const {
    canEdit,
    profile,
    setProfile,
    loading,
    saving,
    uploadingLogo,
    message,
    logoVersion,
    handleSave,
    handleLogoUpload,
    handleLogoDelete,
    resetPalette,
  } = useGeneralSettingsPanel()

  const updates = useAppUpdates()

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16">
        <Loader2 className="size-5 animate-spin" />
        Cargando configuración general…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {message ? <p className="text-emerald-700 text-sm">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aplicación</CardTitle>
          <CardDescription>
            {updates.supportsAutoInstall
              ? 'En desktop se descarga e inicia el instalador automáticamente; la app se cierra para completar el update.'
              : updates.platform === 'android'
                ? 'Descargá el APK y confirmá la instalación en Android (no hay actualización silenciosa).'
                : 'Descargas desde GitHub Releases vía API. En desktop instalado, el update se aplica automáticamente.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">
            Versión instalada:{' '}
            <span className="font-medium tabular-nums">
              {updates.currentVersion ? `v${updates.currentVersion}` : 'desconocida'}
            </span>
          </p>

          {updates.loading ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Buscando actualizaciones…
            </p>
          ) : null}

          {!updates.loading && updates.error ? (
            <p className="text-amber-800 text-sm">{updates.error}</p>
          ) : null}

          {!updates.loading && !updates.error && updates.latest ? (
            updates.latest.updateAvailable ? (
              <p className="text-sm">
                Hay una actualización disponible:{' '}
                <span className="font-medium tabular-nums">v{updates.latest.latestVersion}</span>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">Estás al día con la última versión.</p>
            )
          ) : null}

          {updates.installing ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {updates.statusMessage ?? 'Actualizando…'}
              {updates.progressPercent != null
                ? ` (${Math.round(updates.progressPercent)}%)`
                : null}
            </p>
          ) : null}

          {!updates.installing && updates.statusMessage ? (
            <p className="text-emerald-700 text-sm">{updates.statusMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updates.loading || updates.installing}
              onClick={() => void updates.refresh()}
            >
              <RefreshCw className="size-4" />
              Volver a comprobar
            </Button>

            {updates.canUpdatePreferred && updates.preferredPlatform ? (
              <Button
                type="button"
                size="sm"
                disabled={updates.installing}
                onClick={() => void updates.startUpdate(updates.preferredPlatform!)}
              >
                {updates.installing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {updates.supportsAutoInstall
                  ? 'Actualizar ahora'
                  : updates.platform === 'android'
                    ? 'Descargar e instalar APK'
                    : 'Descargar actualización'}
              </Button>
            ) : null}

            {!updates.loading &&
            updates.latest?.updateAvailable &&
            updates.platform === 'browser' ? (
              <>
                {updates.latest.desktop.available ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void updates.startUpdate('desktop')}
                  >
                    <Download className="size-4" />
                    Desktop (.exe)
                  </Button>
                ) : null}
                {updates.latest.android.available ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void updates.startUpdate('android')}
                  >
                    <Download className="size-4" />
                    Android (.apk)
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
        <CardHeader>
          <CardTitle className="text-base">Presentación del negocio</CardTitle>
          <CardDescription>
            Nombre de tu negocio en tickets y documentos impresos. No cambia el nombre de la
            aplicación (<strong>Nega POS</strong>).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-xl gap-4">
          <div className="space-y-2">
            <Label htmlFor="trade-name">Nombre comercial</Label>
            <Input
              id="trade-name"
              value={profile.trade_name}
              placeholder="Ej. Comercial El Uniforme"
              onChange={(event) =>
                setProfile((current) => ({ ...current, trade_name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Subtítulo / eslogan</Label>
            <Input
              id="tagline"
              value={profile.tagline}
              className="bg-white"
              onChange={(event) =>
                setProfile((current) => ({ ...current, tagline: event.target.value }))
              }
            />
          </div>
        </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4" />
              Paleta de colores
            </CardTitle>
            <CardDescription>
              Tres colores para personalizar la interfaz. Si está desactivado, se usa el tema
              por defecto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={profile.use_custom_palette}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    use_custom_palette: event.target.checked,
                  }))
                }
              />
              Usar paleta personalizada
            </label>

            <div className="grid max-w-xl gap-4 sm:grid-cols-3">
              {(['primary', 'secondary', 'accent'] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`palette-${key}`}>
                    {key === 'primary' ? 'Principal' : key === 'secondary' ? 'Secundario' : 'Acento'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`palette-${key}`}
                      type="color"
                      className="size-10 cursor-pointer rounded border p-1"
                      value={profile.palette[key]}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          palette: { ...current.palette, [key]: event.target.value },
                        }))
                      }
                    />
                    <Input
                      value={profile.palette[key]}
                      onChange={(event) =>
                        setProfile((current) => ({
                          ...current,
                          palette: { ...current.palette, [key]: event.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            {canEdit ? (
              <Button type="button" variant="outline" size="sm" onClick={resetPalette}>
                Restaurar colores por defecto
              </Button>
            ) : null}
            <p className="text-muted-foreground text-xs">
              Por defecto: principal {DEFAULT_BUSINESS_PALETTE.primary}, secundario{' '}
              {DEFAULT_BUSINESS_PALETTE.secondary}, acento {DEFAULT_BUSINESS_PALETTE.accent}.
            </p>
          </CardContent>
        </Card>

      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de empresa (factura)</CardTitle>
            <CardDescription>
              Información fiscal y de contacto. Podés usarla en plantillas con placeholders como{' '}
              <code className="text-xs">{'{{business.rif}}'}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid max-w-xl gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="legal-name">Razón social</Label>
              <Input
                id="legal-name"
                value={profile.legal_name}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, legal_name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rif">RIF</Label>
              <Input
                id="rif"
                value={profile.rif}
                placeholder="J-12345678-9"
                onChange={(event) =>
                  setProfile((current) => ({ ...current, rif: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, address: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ticket-footer">Pie de ticket</Label>
              <Input
                id="ticket-footer"
                value={profile.ticket_footer}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, ticket_footer: event.target.value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="size-4" />
              Logo
            </CardTitle>
            <CardDescription>Se muestra en tickets si usás el placeholder del logo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-start gap-6">
            <div className="bg-muted/40 flex size-28 items-center justify-center overflow-hidden rounded-lg border">
              {profile.has_logo ? (
                <img
                  src={businessLogoUrl(logoVersion)}
                  alt="Logo del negocio"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-muted-foreground px-2 text-center text-xs">Sin logo</span>
              )}
            </div>
            {canEdit ? (
              <div className="flex flex-col gap-2">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingLogo}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void handleLogoUpload(file)
                    }
                    event.target.value = ''
                  }}
                />
                {profile.has_logo ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => void handleLogoDelete()}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Quitar logo
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canEdit ? (
        <Button type="button" disabled={saving || uploadingLogo} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar configuración general
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">
          Solo lectura — no tenés permiso para editar la configuración.
        </p>
      )}
    </div>
  )
}
