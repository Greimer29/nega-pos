import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/api-error'
import { refreshCsrfToken } from '@/lib/api'
import * as platformService from '@/features/platform/services/platform-service'
import type { PlatformAdmin } from '@/features/platform/services/platform-service'

export function PlatformLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    void platformService
      .getPlatformMe()
      .then(() => navigate('/platform', { replace: true }))
      .catch(() => undefined)
      .finally(() => setChecking(false))
  }, [navigate])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await platformService.platformLogin(email, password)
      await refreshCsrfToken()
      navigate('/platform', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-300">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8">
        <h1 className="text-xl font-semibold text-white">Nega POS — Platform</h1>
        <p className="mt-1 text-sm text-neutral-400">Acceso super admin</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label htmlFor="platform-email" className="text-sm text-neutral-200">
              Email
            </label>
            <Input
              id="platform-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-neutral-700 bg-neutral-950 text-white placeholder:text-neutral-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="platform-password" className="text-sm text-neutral-200">
              Contraseña
            </label>
            <Input
              id="platform-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-neutral-700 bg-neutral-950 text-white placeholder:text-neutral-500"
            />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          <Link to="/login" className="underline hover:text-neutral-300">
            Volver al login de empresa
          </Link>
        </p>
      </div>
    </div>
  )
}

export type { PlatformAdmin }
