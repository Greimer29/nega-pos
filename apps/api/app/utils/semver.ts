/** Compara versiones semver simples (mayor.menor.patch). Ignora prefijo `v`. */
export function normalizeSemver(version: string): string {
  return version.trim().replace(/^v/i, '')
}

export function parseSemverParts(version: string): [number, number, number] {
  const normalized = normalizeSemver(version)
  const [major = '0', minor = '0', patch = '0'] = normalized.split('.')
  return [
    Number.parseInt(major, 10) || 0,
    Number.parseInt(minor, 10) || 0,
    Number.parseInt(patch, 10) || 0,
  ]
}

/** Devuelve negativo si a < b, 0 si iguales, positivo si a > b. */
export function compareSemver(a: string, b: string): number {
  const left = parseSemverParts(a)
  const right = parseSemverParts(b)
  for (let i = 0; i < 3; i++) {
    const diff = left[i]! - right[i]!
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}

export function isSemverNewer(latest: string, current: string): boolean {
  return compareSemver(latest, current) > 0
}
