import { resolveStoragePath } from '#utils/storage_path'
import { defineConfig, services } from '@adonisjs/drive'

const driveConfig = defineConfig({
  /**
   * Imágenes y archivos adjuntos se almacenan solo en disco local
   * (./storage/uploads o volumen montado). No usar S3 ni servicios en la nube.
   */
  default: 'local' as const,

  services: {
    local: services.fs({
      location: resolveStoragePath(),
      serveFiles: false,
      visibility: 'private',
    }),
  },
})

export default driveConfig
