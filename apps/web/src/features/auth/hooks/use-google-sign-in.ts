import { useCallback, useEffect, useState } from 'react'

const SCRIPT_ID = 'google-gsi-client'

function loadGoogleScript(): Promise<void> {
  if (document.getElementById(SCRIPT_ID)) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity'))
    document.head.appendChild(script)
  })
}

export function useGoogleSignIn(onCredential: (idToken: string) => void | Promise<void>) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await loadGoogleScript()
        if (cancelled || !window.google) {
          return
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            void onCredential(response.credential)
          },
        })
        if (!cancelled) {
          setReady(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar Google')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clientId, onCredential])

  const renderButton = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !ready || !window.google) {
        return
      }
      el.innerHTML = ''
      window.google.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'large',
        width: el.clientWidth || 320,
        text: 'continue_with',
        shape: 'rectangular',
      })
    },
    [ready]
  )

  return { enabled: Boolean(clientId), ready, error, renderButton }
}
