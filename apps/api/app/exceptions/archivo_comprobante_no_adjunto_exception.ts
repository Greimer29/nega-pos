import { Exception } from '@adonisjs/core/exceptions'

export default class ArchivoComprobanteNoAdjuntoException extends Exception {
  static code = 'ARCHIVO_COMPROBANTE_NO_ADJUNTO'
  static message = 'El expense no tiene comprobante adjunto'

  constructor() {
    super(ArchivoComprobanteNoAdjuntoException.message, {
      status: 404,
      code: ArchivoComprobanteNoAdjuntoException.code,
    })
  }
}
