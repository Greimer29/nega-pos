import type { HttpContext } from '@adonisjs/core/http'

export default class CsrfController {
  /**
   * GET /api/v1/csrf
   *
   * Expone el token CSRF en JSON para clientes SPA cross-origin que no pueden
   * leer la cookie XSRF-TOKEN (p. ej. localhost → API en Railway).
   * El valor plano debe enviarse como `_csrf` en el body de POST/PUT/PATCH/DELETE.
   */
  show({ request, serialize }: HttpContext) {
    return serialize({
      csrf_token: request.csrfToken ?? null,
    })
  }
}
