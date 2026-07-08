type NegaPosIdentityProps = {
  variant?: 'login' | 'compact'
}

export function NegaPosIdentity({ variant = 'login' }: NegaPosIdentityProps) {
  const isLogin = variant === 'login'

  return (
    <div className={isLogin ? 'mb-10' : 'mb-0'}>
      <div className="flex items-baseline justify-center gap-2">
        <span
          className={
            isLogin
              ? 'text-4xl font-bold tracking-tight text-white sm:text-5xl'
              : 'text-lg font-bold tracking-tight text-foreground'
          }
        >
          NEGA
        </span>
        <span
          className={
            isLogin
              ? 'text-4xl font-light tracking-tight text-white/85 sm:text-5xl'
              : 'text-lg font-light tracking-tight text-muted-foreground'
          }
        >
          POS
        </span>
      </div>
      {isLogin ? (
        <p className="mt-3 text-center text-sm font-medium tracking-[0.2em] text-neutral-300 uppercase">
          Punto de venta
        </p>
      ) : null}
    </div>
  )

}
