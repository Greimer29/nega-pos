import { defineConfig } from '@adonisjs/transmit'

export default defineConfig({
  /**
   * Keep SSE connections alive through proxies (Railway / reverse proxies).
   */
  pingInterval: '30s',
  /**
   * Single API instance for now. Enable Redis transport if we scale to replicas.
   */
  transport: null,
})
