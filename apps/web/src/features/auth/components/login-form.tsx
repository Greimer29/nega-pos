import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NegaPosIdentity } from '@/features/auth/components/nega-pos-identity'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

type LoginFormProps = {
  showBrandOnMobile?: boolean
}

function safeRedirectPath(from: string | undefined): string {
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.includes('://')) {
    return '/dashboard'
  }

  if (from === '/login' || from.startsWith('/login/')) {
    return '/dashboard'
  }

  return from
}

export function LoginForm({ showBrandOnMobile = false }: LoginFormProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    try {
      await login(values.email, values.password)
      const redirectTo = safeRedirectPath(
        (location.state as { from?: string } | null)?.from?.replace(/\/login\/?$/, '')
      )
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  })

  return (
    <div>
      {showBrandOnMobile ? (
        <div className="mb-8 lg:hidden">
          <NegaPosIdentity />
        </div>
      ) : (
        <div className="mb-8 hidden lg:block">
          <h1 className="text-xl font-semibold tracking-tight text-white">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-neutral-300">
            Ingresá con tu cuenta para continuar
          </p>
        </div>
      )}

      <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-white">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              disabled={isSubmitting}
              className="login-input h-11 pl-10 shadow-none"
              {...register('email')}
            />
          </div>
          {errors.email ? (
            <p className="text-sm text-red-300">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-white">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isSubmitting}
              className="login-input h-11 pr-10 pl-10 shadow-none"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 transition-colors hover:text-white"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-sm text-red-300">{errors.password.message}</p>
          ) : null}
        </div>

        {submitError ? (
          <div
            className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-200 whitespace-pre-line"
            role="alert"
            aria-live="polite"
          >
            {submitError}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn('h-11 w-full bg-white text-sm font-semibold text-neutral-900 hover:bg-neutral-100')}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Ingresando…
            </>
          ) : (
            'Ingresar'
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-neutral-400 lg:hidden">
        © {new Date().getFullYear()} Nega POS. Todos los derechos reservados.
      </p>
    </div>
  )
}
