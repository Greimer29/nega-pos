import { getTenantStore } from '#utils/tenant_context'
import transmit from '@adonisjs/transmit/services/main'

/**
 * Only the authenticated tenant may subscribe to its own company channel.
 */
transmit.authorize<{ id: string }>('company/:id', (ctx, { id }) => {
  const store = getTenantStore()
  if (!store || !ctx.auth.user) {
    return false
  }

  return store.companyId === Number(id)
})
