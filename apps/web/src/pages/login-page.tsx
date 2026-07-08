import { LoginForm } from '@/features/auth/components/login-form'

export function LoginPage() {
  return (
    <div className="relative flex min-h-svh">
      {/* Panel de marca — desktop */}
      <div
        aria-hidden
        className="login-brand-panel relative hidden w-[45%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        <div className="login-brand-glow pointer-events-none absolute inset-0" />
        <div className="relative z-10">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">NEGA</span>
            <span className="text-3xl font-light tracking-tight text-white/60">POS</span>
          </div>
        </div>
        <div className="relative z-10 max-w-sm">
          <p className="text-2xl leading-snug font-semibold tracking-tight text-white">
            Gestión integral para tu negocio
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            Inventario, ventas, compras y reportes en un solo lugar.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} Nega POS
        </p>
      </div>

      {/* Panel de login */}
      <div className="login-form-panel flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="login-form-enter w-full max-w-sm">
          <LoginForm showBrandOnMobile />
        </div>
      </div>
    </div>
  )
}
