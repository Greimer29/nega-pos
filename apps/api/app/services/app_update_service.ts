import AppUpdatesAssetNoEncontradoException from '#exceptions/app_updates_asset_no_encontrado_exception'
import AppUpdatesNoConfiguradoException from '#exceptions/app_updates_no_configurado_exception'
import env from '#start/env'
import { isSemverNewer, normalizeSemver } from '#utils/semver'

export type AppUpdatePlatform = 'desktop' | 'android'

export type AppUpdateAssetSummary = {
  available: boolean
  fileName: string | null
}

export type AppUpdateLatestResult = {
  latestVersion: string
  releaseNotes: string
  publishedAt: string | null
  desktop: AppUpdateAssetSummary
  android: AppUpdateAssetSummary
  updateAvailable: boolean
  current: string | null
}

type GitHubReleaseAsset = {
  id: number
  name: string
  size: number
  url: string
  browser_download_url: string
  content_type: string
}

type GitHubRelease = {
  tag_name: string
  name: string | null
  body: string | null
  published_at: string | null
  assets: GitHubReleaseAsset[]
}

function isDesktopAsset(name: string): boolean {
  return /^Nega-POS-Setup-.+\.exe$/i.test(name)
}

function isAndroidAsset(name: string): boolean {
  return /^Nega-POS-.+\.apk$/i.test(name) && !/^Nega-POS-Setup-/i.test(name)
}

export default class AppUpdateService {
  private getConfig() {
    const enabled = env.get('APP_UPDATES_ENABLED') ?? true
    const repo = (env.get('APP_UPDATES_GITHUB_REPO') ?? 'Greimer29/nega-pos').trim()
    const token = (env.get('APP_UPDATES_GITHUB_TOKEN') ?? '').trim()

    if (enabled === false) {
      throw new AppUpdatesNoConfiguradoException(
        'Las actualizaciones de la app están deshabilitadas en el servidor.'
      )
    }

    if (!token) {
      throw new AppUpdatesNoConfiguradoException(
        'Falta APP_UPDATES_GITHUB_TOKEN en el servidor para consultar GitHub Releases.'
      )
    }

    if (!repo.includes('/')) {
      throw new AppUpdatesNoConfiguradoException(
        'APP_UPDATES_GITHUB_REPO debe tener el formato owner/repo.'
      )
    }

    return { repo, token }
  }

  private authHeaders(token: string): HeadersInit {
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'nega-pos-api',
    }
  }

  private async fetchLatestRelease(): Promise<{ release: GitHubRelease; token: string }> {
    const { repo, token } = this.getConfig()
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: this.authHeaders(token),
    })

    if (response.status === 404) {
      throw new AppUpdatesNoConfiguradoException('No hay releases publicadas en GitHub todavía.')
    }

    if (!response.ok) {
      throw new AppUpdatesNoConfiguradoException(
        `No se pudo consultar GitHub Releases (${response.status}).`
      )
    }

    const release = (await response.json()) as GitHubRelease
    return { release, token }
  }

  private findAsset(
    assets: GitHubReleaseAsset[],
    platform: AppUpdatePlatform
  ): GitHubReleaseAsset | null {
    const match = assets.find((asset) =>
      platform === 'desktop' ? isDesktopAsset(asset.name) : isAndroidAsset(asset.name)
    )
    return match ?? null
  }

  async getLatest(current?: string | null): Promise<AppUpdateLatestResult> {
    const { release } = await this.fetchLatestRelease()
    const latestVersion = normalizeSemver(release.tag_name || release.name || '')
    if (!latestVersion) {
      throw new AppUpdatesNoConfiguradoException(
        'La última release de GitHub no tiene un tag de versión válido.'
      )
    }

    const desktopAsset = this.findAsset(release.assets, 'desktop')
    const androidAsset = this.findAsset(release.assets, 'android')
    const currentNormalized = current?.trim() ? normalizeSemver(current) : null

    return {
      latestVersion,
      releaseNotes: (release.body ?? '').trim(),
      publishedAt: release.published_at,
      desktop: {
        available: Boolean(desktopAsset),
        fileName: desktopAsset?.name ?? null,
      },
      android: {
        available: Boolean(androidAsset),
        fileName: androidAsset?.name ?? null,
      },
      updateAvailable: currentNormalized ? isSemverNewer(latestVersion, currentNormalized) : true,
      current: currentNormalized,
    }
  }

  async openDownloadStream(platform: AppUpdatePlatform): Promise<{
    fileName: string
    contentType: string
    contentLength: number | null
    body: ReadableStream<Uint8Array>
  }> {
    const { release, token } = await this.fetchLatestRelease()
    const asset = this.findAsset(release.assets, platform)
    if (!asset) {
      throw new AppUpdatesAssetNoEncontradoException()
    }

    const response = await fetch(asset.url, {
      headers: {
        ...this.authHeaders(token),
        Accept: 'application/octet-stream',
      },
      redirect: 'follow',
    })

    if (!response.ok || !response.body) {
      throw new AppUpdatesNoConfiguradoException(
        `No se pudo descargar el asset desde GitHub (${response.status}).`
      )
    }

    const contentLengthHeader = response.headers.get('content-length')
    return {
      fileName: asset.name,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      contentLength: contentLengthHeader ? Number(contentLengthHeader) : asset.size || null,
      body: response.body,
    }
  }
}
