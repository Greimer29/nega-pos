const COREVA_IDENTITY = '/coreva_logo.png'

export function CorevaIdentity() {
  return (
    <>
      <img
        src={COREVA_IDENTITY}
        alt="COREVA"
        draggable={false}
        className="login-identity-mark mx-auto mb-3 block h-auto w-[min(24.375rem,95%)] max-w-full select-none object-contain py-[9px]"
      />
      <p className="mb-20 text-center text-xs font-medium tracking-[0.38em] text-neutral-400 uppercase">
        FUERZA EN MOVIMIENTO
      </p>
    </>
  )
}
