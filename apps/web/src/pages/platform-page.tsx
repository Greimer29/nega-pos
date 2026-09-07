import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/api-error'
import * as platformService from '@/features/platform/services/platform-service'
import type { PlatformAdmin, PlatformCompany } from '@/features/platform/services/platform-service'

export function PlatformPage() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    slug: '',
    name: '',
    admin_email: '',
    admin_password: '',
    admin_name: '',
  })
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const me = await platformService.getPlatformMe()
      setAdmin(me)
      const list = await platformService.listCompanies()
      setCompanies(list)
    } catch {
      navigate('/platform/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await platformService.createCompany(form)
      setPendingEmail(result.email)
      setOtp(result.debugCode ?? '')
      setDebugCode(result.debugCode ?? null)
      if (result.emailError) {
        setError(`Email no enviado: ${result.emailError}`)
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm(event: React.FormEvent) {
    event.preventDefault()
    if (!pendingEmail) return
    setBusy(true)
    setError(null)
    try {
      await platformService.confirmCompany(pendingEmail, otp)
      setPendingEmail(null)
      setDebugCode(null)
      setForm({
        slug: '',
        name: '',
        admin_email: '',
        admin_password: '',
        admin_name: '',
      })
      setOtp('')
      const list = await platformService.listCompanies()
      setCompanies(list)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onToggleStatus(company: PlatformCompany) {
    setBusy(true)
    setError(null)
    try {
      const next = company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
      await platformService.updateCompanyStatus(company.id, next)
      setCompanies(await platformService.listCompanies())
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function onLogout() {
    await platformService.platformLogout()
    navigate('/platform/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-300">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Platform</h1>
            <p className="text-sm text-neutral-400">{admin?.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/login">Login empresa</Link>
            </Button>
            <Button variant="secondary" onClick={() => void onLogout()}>
              Salir
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-medium">Empresas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Slug</th>
                  <th className="py-2 pr-3">BD</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-neutral-500">
                      Todavía no hay empresas. Creá la primera abajo.
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id} className="border-t border-neutral-800">
                      <td className="py-2 pr-3">{company.name}</td>
                      <td className="py-2 pr-3">{company.slug}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{company.dbName}</td>
                      <td className="py-2 pr-3">{company.status}</td>
                      <td className="py-2">
                        {company.status === 'ACTIVE' || company.status === 'SUSPENDED' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void onToggleStatus(company)}
                          >
                            {company.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-lg font-medium">
            {pendingEmail ? 'Confirmar alta (OTP)' : 'Crear empresa'}
          </h2>

          {pendingEmail ? (
            <form className="mt-4 space-y-4" onSubmit={onConfirm}>
              <p className="text-sm text-neutral-400">
                Código enviado a <span className="text-neutral-200">{pendingEmail}</span>. Si el
                email falla, el código aparece abajo o en los logs de la API.
              </p>
              {debugCode ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Código OTP (debug): <span className="font-mono text-lg tracking-widest">{debugCode}</span>
                </div>
              ) : null}
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Código de 6 dígitos"
                required
                className="border-neutral-700 bg-neutral-950 text-white placeholder:text-neutral-500"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : 'Confirmar y provisionar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    void (async () => {
                      setBusy(true)
                      setError(null)
                      try {
                        const result = await platformService.resendCompanyOtp(pendingEmail)
                        setOtp(result.debugCode ?? '')
                        setDebugCode(result.debugCode ?? null)
                        if (result.emailError) {
                          setError(`Email no enviado: ${result.emailError}`)
                        }
                      } catch (err) {
                        setError(getApiErrorMessage(err))
                      } finally {
                        setBusy(false)
                      }
                    })()
                  }}
                >
                  Reenviar código
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPendingEmail(null)
                    setDebugCode(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
              <Input
                placeholder="Slug (ej. coreva)"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                required
                className="border-neutral-700 bg-neutral-950 text-white placeholder:text-neutral-500"
              />
              <Input
                placeholder="Nombre comercial"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="border-neutral-700 bg-neutral-950 text-white placeholder:text-neutral-500"
              />
              <Input
                placeholder="Email admin"
                type="email"
                value={form.admin_email}
                onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))}
                required
                className="border-neutral-700 bg-neutral-950 text-white placeholder:text-neutral-500"
              />
              <Input
                placeholder="Nombre admin"
                value={form.admin_name}
                onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))}
                required
                className="border-neutral-700 bg-neutral-950 text-white placeholder:text-neutral-500"
              />
              <Input
                placeholder="Password admin (mín. 8)"
                type="password"
                value={form.admin_password}
                onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))}
                required
                minLength={8}
                className="bg-neutral-950 sm:col-span-2"
              />
              <Button type="submit" disabled={busy} className="sm:col-span-2">
                {busy ? <Loader2 className="animate-spin" /> : 'Enviar código OTP'}
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
