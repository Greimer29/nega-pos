import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/components/auth-provider'
import { BusinessThemeProvider } from '@/features/branding/business-theme-provider'
import { loadRuntimeApiConfig } from '@/lib/api'
import { queryClient } from '@/lib/query-client'
import { router } from '@/routes/router'
import '@/index.css'

async function bootstrap() {
  // Solo config local (runtime-config.json). CSRF lo pide el interceptor en el primer POST/PUT.
  await loadRuntimeApiConfig()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BusinessThemeProvider>
            <RouterProvider router={router} />
          </BusinessThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

void bootstrap()
