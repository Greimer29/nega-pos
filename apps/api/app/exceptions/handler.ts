import app from '@adonisjs/core/services/app'
import { ExceptionHandler, type HttpContext } from '@adonisjs/core/http'
import { errors as authErrors } from '@adonisjs/auth'
import { errors as shieldErrors } from '@adonisjs/shield'
import { errors as vineErrors } from '@vinejs/vine'
import UserInactiveException from '#exceptions/user_inactive_exception'
import MachineExpenseNoEncontradoException from '#exceptions/gasto_maquina_no_encontrado_exception'
import MachineNoEncontradaException from '#exceptions/maquina_no_encontrada_exception'
import MaterialNoEncontradoException from '#exceptions/material_no_encontrado_exception'
import CodigoDuplicadoException from '#exceptions/codigo_duplicado_exception'
import CodigoMonedaDuplicadoException from '#exceptions/codigo_moneda_duplicado_exception'
import MonedaNoEncontradaException from '#exceptions/moneda_no_encontrada_exception'
import MonedaProtegidaException from '#exceptions/moneda_protegida_exception'
import MonedaRegistroUsdRequeridaException from '#exceptions/moneda_registro_usd_requerida_exception'
import TasaCambioInvalidaException from '#exceptions/tasa_cambio_invalida_exception'
import PurchaseItemReferenciaInvalidaException from '#exceptions/compra_item_referencia_invalida_exception'
import PurchaseItemNoEncontradoException from '#exceptions/compra_item_no_encontrado_exception'
import PurchaseNoEditableException from '#exceptions/compra_no_editable_exception'
import PurchaseNoEncontradaException from '#exceptions/compra_no_encontrada_exception'
import PurchaseSinItemsException from '#exceptions/compra_sin_items_exception'
import PurchaseYaConfirmadaException from '#exceptions/compra_ya_confirmada_exception'
import PurchaseNoDevolvableException from '#exceptions/compra_no_devolvable_exception'
import StockInsuficienteDevolucionException from '#exceptions/stock_insuficiente_devolucion_exception'
import ExpenseNoEncontradoException from '#exceptions/gasto_no_encontrado_exception'
import IncomeNoEncontradoException from '#exceptions/ingreso_no_encontrado_exception'
import ArchivoComprobanteFaltanteException from '#exceptions/archivo_comprobante_faltante_exception'
import ArchivoComprobanteNoAdjuntoException from '#exceptions/archivo_comprobante_no_adjunto_exception'
import ArchivoReferenciaFaltanteException from '#exceptions/archivo_referencia_faltante_exception'
import ArchivoReferenciaNoAdjuntoException from '#exceptions/archivo_referencia_no_adjunto_exception'
import ArchivoFacturaFaltanteException from '#exceptions/archivo_factura_faltante_exception'
import ArchivoFacturaNoAdjuntoException from '#exceptions/archivo_factura_no_adjunto_exception'
import NumeroFacturaRequeridoException from '#exceptions/numero_factura_requerido_exception'
import CustomerNoEncontradoException from '#exceptions/cliente_no_encontrado_exception'
import EmailDuplicadoException from '#exceptions/email_duplicado_exception'
import ClienteOInvitadoRequeridoException from '#exceptions/cliente_o_invitado_requerido_exception'
import CounterOrderExcedidoException from '#exceptions/contador_pedido_excedido_exception'
import PermisoDenegadoException from '#exceptions/permiso_denegado_exception'
import UltimoAdminException from '#exceptions/ultimo_admin_exception'
import UsuarioNoEncontradoException from '#exceptions/usuario_no_encontrado_exception'
import OrderNoCancelableException from '#exceptions/pedido_no_cancelable_exception'
import OrderNoDevolvableException from '#exceptions/pedido_no_devolvable_exception'
import OrderNoEditableException from '#exceptions/pedido_no_editable_exception'
import OrderNoEncontradoException from '#exceptions/pedido_no_encontrado_exception'
import SupplierNoEncontradoException from '#exceptions/proveedor_no_encontrado_exception'
import RifDuplicadoException from '#exceptions/rif_duplicado_exception'
import TelefonoDuplicadoException from '#exceptions/telefono_duplicado_exception'
import TelefonoInvalidoException from '#exceptions/telefono_invalido_exception'
import TransicionInvalidaException from '#exceptions/transicion_invalida_exception'
import StockInsuficienteException from '#exceptions/stock_insuficiente_exception'
import OrderMaterialNoEncontradoException from '#exceptions/pedido_material_no_encontrado_exception'
import MaterialDuplicadoEnRecetaException from '#exceptions/material_duplicado_en_receta_exception'
import ProductoCatalogoNoEncontradoException from '#exceptions/producto_catalogo_no_encontrado_exception'
import FormulaEnUsoException from '#exceptions/formula_en_uso_exception'
import FormulaNoEncontradaException from '#exceptions/formula_no_encontrada_exception'
import PrecioVentaMenorCostoException from '#exceptions/precio_venta_menor_costo_exception'
import ProductoCatalogoEnPedidosActivosException from '#exceptions/producto_catalogo_en_pedidos_activos_exception'
import ProductoCatalogoStockFormulaException from '#exceptions/producto_catalogo_stock_formula_exception'
import ProductoTallaDuplicadaException from '#exceptions/producto_talla_duplicada_exception'
import ProductoTallaRequeridaException from '#exceptions/producto_talla_requerida_exception'
import ProductoConFormulaNoPermiteTallasException from '#exceptions/producto_con_formula_no_permite_tallas_exception'
import ServicioCatalogoOperacionInvalidaException from '#exceptions/servicio_catalogo_operacion_invalida_exception'
import ArchivoImagenNoDisponibleException from '#exceptions/archivo_imagen_no_disponible_exception'
import VentaNoEditableException from '#exceptions/venta_no_editable_exception'
import VentaNoEncontradaException from '#exceptions/venta_no_encontrada_exception'
import RutaIdInvalidoException from '#exceptions/ruta_id_invalido_exception'
import PedidoLineaNoEncontradaException from '#exceptions/pedido_linea_no_encontrada_exception'
import LineaVentaInvalidaException from '#exceptions/linea_venta_invalida_exception'
import PagoClienteExcedeSaldoException from '#exceptions/pago_cliente_excede_saldo_exception'
import PagoProveedorExcedeSaldoException from '#exceptions/pago_proveedor_excede_saldo_exception'
import MetodoPagoRequeridoException from '#exceptions/metodo_pago_requerido_exception'
import MetodoPagoNoEncontradoException from '#exceptions/metodo_pago_no_encontrado_exception'
import CodigoMetodoPagoDuplicadoException from '#exceptions/codigo_metodo_pago_duplicado_exception'
import UltimoMetodoPagoActivoException from '#exceptions/ultimo_metodo_pago_activo_exception'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof shieldErrors.E_BAD_CSRF_TOKEN) {
      return ctx.response.status(403).json({
        error: {
          code: 'CSRF_TOKEN_MISMATCH',
          message:
            'La sesión expiró o el token de seguridad no es válido. Recargá la página e intentá de nuevo.',
        },
      })
    }

    if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
      return ctx.response.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email o contraseña incorrectos',
        },
      })
    }

    if (error instanceof UserInactiveException) {
      return ctx.response.status(403).json({
        error: {
          code: UserInactiveException.code,
          message: error.message || UserInactiveException.message,
        },
      })
    }

    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
      return ctx.response.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Debe iniciar sesión para acceder a este recurso',
        },
      })
    }

    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return ctx.response.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Los datos enviados no son válidos',
          details: error.messages,
        },
      })
    }

    if (error instanceof OrderNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: OrderNoEncontradoException.code,
          message: error.message || OrderNoEncontradoException.message,
        },
      })
    }

    if (error instanceof ClienteOInvitadoRequeridoException) {
      return ctx.response.status(422).json({
        error: {
          code: ClienteOInvitadoRequeridoException.code,
          message: error.message || ClienteOInvitadoRequeridoException.message,
        },
      })
    }

    if (error instanceof CustomerNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: CustomerNoEncontradoException.code,
          message: error.message || CustomerNoEncontradoException.message,
        },
      })
    }

    if (error instanceof SupplierNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: SupplierNoEncontradoException.code,
          message: error.message || SupplierNoEncontradoException.message,
        },
      })
    }

    if (error instanceof TelefonoInvalidoException) {
      return ctx.response.status(422).json({
        error: {
          code: TelefonoInvalidoException.code,
          message: error.message || TelefonoInvalidoException.message,
        },
      })
    }

    if (error instanceof PermisoDenegadoException) {
      return ctx.response.status(403).json({
        error: {
          code: PermisoDenegadoException.code,
          message: error.message || PermisoDenegadoException.message,
        },
      })
    }

    if (error instanceof UsuarioNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: UsuarioNoEncontradoException.code,
          message: error.message || UsuarioNoEncontradoException.message,
        },
      })
    }

    if (error instanceof UltimoAdminException) {
      return ctx.response.status(422).json({
        error: {
          code: UltimoAdminException.code,
          message: error.message || UltimoAdminException.message,
        },
      })
    }

    if (error instanceof EmailDuplicadoException) {
      return ctx.response.status(422).json({
        error: {
          code: EmailDuplicadoException.code,
          message: error.message || EmailDuplicadoException.message,
        },
      })
    }

    if (error instanceof TelefonoDuplicadoException) {
      return ctx.response.status(422).json({
        error: {
          code: TelefonoDuplicadoException.code,
          message: error.message || TelefonoDuplicadoException.message,
        },
      })
    }

    if (error instanceof RifDuplicadoException) {
      return ctx.response.status(422).json({
        error: {
          code: RifDuplicadoException.code,
          message: error.message || RifDuplicadoException.message,
        },
      })
    }

    if (error instanceof MachineNoEncontradaException) {
      return ctx.response.status(404).json({
        error: {
          code: MachineNoEncontradaException.code,
          message: error.message || MachineNoEncontradaException.message,
        },
      })
    }

    if (error instanceof MachineExpenseNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: MachineExpenseNoEncontradoException.code,
          message: error.message || MachineExpenseNoEncontradoException.message,
        },
      })
    }

    if (error instanceof MaterialNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: MaterialNoEncontradoException.code,
          message: error.message || MaterialNoEncontradoException.message,
        },
      })
    }

    if (error instanceof CodigoDuplicadoException) {
      return ctx.response.status(422).json({
        error: {
          code: CodigoDuplicadoException.code,
          message: error.message || CodigoDuplicadoException.message,
        },
      })
    }

    if (error instanceof CodigoMonedaDuplicadoException) {
      return ctx.response.status(422).json({
        error: {
          code: CodigoMonedaDuplicadoException.code,
          message: error.message || CodigoMonedaDuplicadoException.message,
        },
      })
    }

    if (error instanceof MonedaNoEncontradaException) {
      return ctx.response.status(404).json({
        error: {
          code: MonedaNoEncontradaException.code,
          message: error.message || MonedaNoEncontradaException.message,
        },
      })
    }

    if (error instanceof MonedaProtegidaException) {
      return ctx.response.status(409).json({
        error: {
          code: MonedaProtegidaException.code,
          message: error.message || MonedaProtegidaException.message,
        },
      })
    }

    if (error instanceof TasaCambioInvalidaException) {
      return ctx.response.status(422).json({
        error: {
          code: TasaCambioInvalidaException.code,
          message: error.message || TasaCambioInvalidaException.message,
        },
      })
    }

    if (error instanceof MonedaRegistroUsdRequeridaException) {
      return ctx.response.status(422).json({
        error: {
          code: MonedaRegistroUsdRequeridaException.code,
          message: error.message || MonedaRegistroUsdRequeridaException.message,
        },
      })
    }

    if (error instanceof PurchaseNoEncontradaException) {
      return ctx.response.status(404).json({
        error: {
          code: PurchaseNoEncontradaException.code,
          message: error.message || PurchaseNoEncontradaException.message,
        },
      })
    }

    if (error instanceof PurchaseItemNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: PurchaseItemNoEncontradoException.code,
          message: error.message || PurchaseItemNoEncontradoException.message,
        },
      })
    }

    if (error instanceof PurchaseItemReferenciaInvalidaException) {
      return ctx.response.status(422).json({
        error: {
          code: PurchaseItemReferenciaInvalidaException.code,
          message: error.message || PurchaseItemReferenciaInvalidaException.message,
        },
      })
    }

    if (error instanceof OrderNoEditableException) {
      return ctx.response.status(OrderNoEditableException.status).json({
        error: {
          code: OrderNoEditableException.code,
          message: error.message || OrderNoEditableException.message,
        },
      })
    }

    if (error instanceof TransicionInvalidaException) {
      return ctx.response.status(TransicionInvalidaException.status).json({
        error: {
          code: TransicionInvalidaException.code,
          message: error.message,
        },
      })
    }

    if (error instanceof OrderNoCancelableException) {
      return ctx.response.status(OrderNoCancelableException.status).json({
        error: {
          code: OrderNoCancelableException.code,
          message: error.message || OrderNoCancelableException.message,
        },
      })
    }

    if (error instanceof OrderNoDevolvableException) {
      return ctx.response.status(OrderNoDevolvableException.status).json({
        error: {
          code: OrderNoDevolvableException.code,
          message: error.message || OrderNoDevolvableException.message,
        },
      })
    }

    if (error instanceof StockInsuficienteException) {
      return ctx.response.status(StockInsuficienteException.status).json({
        error: {
          code: StockInsuficienteException.code,
          message: error.message,
          details: error.details,
        },
      })
    }

    if (error instanceof OrderMaterialNoEncontradoException) {
      return ctx.response.status(OrderMaterialNoEncontradoException.status).json({
        error: {
          code: OrderMaterialNoEncontradoException.code,
          message: error.message || OrderMaterialNoEncontradoException.message,
        },
      })
    }

    if (error instanceof MaterialDuplicadoEnRecetaException) {
      return ctx.response.status(MaterialDuplicadoEnRecetaException.status).json({
        error: {
          code: MaterialDuplicadoEnRecetaException.code,
          message: error.message || MaterialDuplicadoEnRecetaException.message,
        },
      })
    }

    if (error instanceof CounterOrderExcedidoException) {
      return ctx.response.status(CounterOrderExcedidoException.status).json({
        error: {
          code: CounterOrderExcedidoException.code,
          message: error.message || CounterOrderExcedidoException.message,
        },
      })
    }

    if (error instanceof PurchaseNoEditableException) {
      return ctx.response.status(409).json({
        error: {
          code: PurchaseNoEditableException.code,
          message: error.message || PurchaseNoEditableException.message,
        },
      })
    }

    if (error instanceof PurchaseYaConfirmadaException) {
      return ctx.response.status(409).json({
        error: {
          code: PurchaseYaConfirmadaException.code,
          message: error.message || PurchaseYaConfirmadaException.message,
        },
      })
    }

    if (error instanceof PurchaseNoDevolvableException) {
      return ctx.response.status(PurchaseNoDevolvableException.status).json({
        error: {
          code: PurchaseNoDevolvableException.code,
          message: error.message || PurchaseNoDevolvableException.message,
        },
      })
    }

    if (error instanceof StockInsuficienteDevolucionException) {
      return ctx.response.status(StockInsuficienteDevolucionException.status).json({
        error: {
          code: StockInsuficienteDevolucionException.code,
          message: error.message || StockInsuficienteDevolucionException.message,
          details: error.details,
        },
      })
    }

    if (error instanceof ExpenseNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: ExpenseNoEncontradoException.code,
          message: error.message || ExpenseNoEncontradoException.message,
        },
      })
    }

    if (error instanceof IncomeNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: IncomeNoEncontradoException.code,
          message: error.message || IncomeNoEncontradoException.message,
        },
      })
    }

    if (error instanceof NumeroFacturaRequeridoException) {
      return ctx.response.status(422).json({
        error: {
          code: NumeroFacturaRequeridoException.code,
          message: error.message || NumeroFacturaRequeridoException.message,
        },
      })
    }

    if (error instanceof PurchaseSinItemsException) {
      return ctx.response.status(422).json({
        error: {
          code: PurchaseSinItemsException.code,
          message: error.message || PurchaseSinItemsException.message,
        },
      })
    }

    if (error instanceof ArchivoComprobanteNoAdjuntoException) {
      return ctx.response.status(404).json({
        error: {
          code: ArchivoComprobanteNoAdjuntoException.code,
          message: error.message || ArchivoComprobanteNoAdjuntoException.message,
        },
      })
    }

    if (error instanceof ArchivoComprobanteFaltanteException) {
      return ctx.response.status(500).json({
        error: {
          code: ArchivoComprobanteFaltanteException.code,
          message: error.message || ArchivoComprobanteFaltanteException.message,
        },
      })
    }

    if (error instanceof ArchivoReferenciaNoAdjuntoException) {
      return ctx.response.status(404).json({
        error: {
          code: ArchivoReferenciaNoAdjuntoException.code,
          message: error.message || ArchivoReferenciaNoAdjuntoException.message,
        },
      })
    }

    if (error instanceof ArchivoReferenciaFaltanteException) {
      return ctx.response.status(500).json({
        error: {
          code: ArchivoReferenciaFaltanteException.code,
          message: error.message || ArchivoReferenciaFaltanteException.message,
        },
      })
    }

    if (error instanceof ArchivoFacturaNoAdjuntoException) {
      return ctx.response.status(404).json({
        error: {
          code: ArchivoFacturaNoAdjuntoException.code,
          message: error.message || ArchivoFacturaNoAdjuntoException.message,
        },
      })
    }

    if (error instanceof ArchivoFacturaFaltanteException) {
      return ctx.response.status(500).json({
        error: {
          code: ArchivoFacturaFaltanteException.code,
          message: error.message || ArchivoFacturaFaltanteException.message,
        },
      })
    }

    if (error instanceof FormulaNoEncontradaException) {
      return ctx.response.status(404).json({
        error: {
          code: FormulaNoEncontradaException.code,
          message: error.message || FormulaNoEncontradaException.message,
        },
      })
    }

    if (error instanceof FormulaEnUsoException) {
      return ctx.response.status(409).json({
        error: {
          code: FormulaEnUsoException.code,
          message: error.message || FormulaEnUsoException.message,
        },
      })
    }

    if (error instanceof ArchivoImagenNoDisponibleException) {
      return ctx.response.status(error.status ?? ArchivoImagenNoDisponibleException.status).json({
        error: {
          code: ArchivoImagenNoDisponibleException.code,
          message: error.message || ArchivoImagenNoDisponibleException.message,
        },
      })
    }

    if (error instanceof ProductoCatalogoNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: ProductoCatalogoNoEncontradoException.code,
          message: error.message || ProductoCatalogoNoEncontradoException.message,
        },
      })
    }

    if (error instanceof PrecioVentaMenorCostoException) {
      return ctx.response.status(422).json({
        error: {
          code: PrecioVentaMenorCostoException.code,
          message: error.message || PrecioVentaMenorCostoException.message,
        },
      })
    }

    if (error instanceof ProductoCatalogoEnPedidosActivosException) {
      return ctx.response.status(409).json({
        error: {
          code: ProductoCatalogoEnPedidosActivosException.code,
          message: error.message || ProductoCatalogoEnPedidosActivosException.message,
        },
      })
    }

    if (error instanceof ProductoCatalogoStockFormulaException) {
      return ctx.response.status(409).json({
        error: {
          code: ProductoCatalogoStockFormulaException.code,
          message: error.message || ProductoCatalogoStockFormulaException.message,
        },
      })
    }

    if (error instanceof ProductoTallaDuplicadaException) {
      return ctx.response.status(ProductoTallaDuplicadaException.status).json({
        error: {
          code: ProductoTallaDuplicadaException.code,
          message: error.message || ProductoTallaDuplicadaException.message,
        },
      })
    }

    if (error instanceof ProductoTallaRequeridaException) {
      return ctx.response.status(ProductoTallaRequeridaException.status).json({
        error: {
          code: ProductoTallaRequeridaException.code,
          message: error.message || ProductoTallaRequeridaException.message,
        },
      })
    }

    if (error instanceof ProductoConFormulaNoPermiteTallasException) {
      return ctx.response.status(ProductoConFormulaNoPermiteTallasException.status).json({
        error: {
          code: ProductoConFormulaNoPermiteTallasException.code,
          message: error.message || ProductoConFormulaNoPermiteTallasException.message,
        },
      })
    }

    if (error instanceof ServicioCatalogoOperacionInvalidaException) {
      return ctx.response.status(ServicioCatalogoOperacionInvalidaException.status).json({
        error: {
          code: ServicioCatalogoOperacionInvalidaException.code,
          message: error.message || ServicioCatalogoOperacionInvalidaException.message,
        },
      })
    }

    if (error instanceof VentaNoEncontradaException) {
      return ctx.response.status(404).json({
        error: {
          code: VentaNoEncontradaException.code,
          message: error.message || VentaNoEncontradaException.message,
        },
      })
    }

    if (error instanceof RutaIdInvalidoException) {
      return ctx.response.status(RutaIdInvalidoException.status).json({
        error: {
          code: RutaIdInvalidoException.code,
          message: error.message || RutaIdInvalidoException.message,
        },
      })
    }

    if (error instanceof VentaNoEditableException) {
      return ctx.response.status(VentaNoEditableException.status).json({
        error: {
          code: VentaNoEditableException.code,
          message: error.message || VentaNoEditableException.message,
        },
      })
    }

    if (error instanceof PedidoLineaNoEncontradaException) {
      return ctx.response.status(404).json({
        error: {
          code: PedidoLineaNoEncontradaException.code,
          message: error.message || PedidoLineaNoEncontradaException.message,
        },
      })
    }

    if (error instanceof LineaVentaInvalidaException) {
      return ctx.response.status(422).json({
        error: {
          code: LineaVentaInvalidaException.code,
          message: error.message || LineaVentaInvalidaException.message,
        },
      })
    }

    if (error instanceof PagoClienteExcedeSaldoException) {
      return ctx.response.status(422).json({
        error: {
          code: PagoClienteExcedeSaldoException.code,
          message: error.message || PagoClienteExcedeSaldoException.message,
        },
      })
    }

    if (error instanceof PagoProveedorExcedeSaldoException) {
      return ctx.response.status(422).json({
        error: {
          code: PagoProveedorExcedeSaldoException.code,
          message: error.message || PagoProveedorExcedeSaldoException.message,
        },
      })
    }

    if (error instanceof MetodoPagoRequeridoException) {
      return ctx.response.status(422).json({
        error: {
          code: MetodoPagoRequeridoException.code,
          message: error.message || MetodoPagoRequeridoException.message,
        },
      })
    }

    if (error instanceof MetodoPagoNoEncontradoException) {
      return ctx.response.status(404).json({
        error: {
          code: MetodoPagoNoEncontradoException.code,
          message: error.message || MetodoPagoNoEncontradoException.message,
        },
      })
    }

    if (error instanceof CodigoMetodoPagoDuplicadoException) {
      return ctx.response.status(422).json({
        error: {
          code: CodigoMetodoPagoDuplicadoException.code,
          message: error.message || CodigoMetodoPagoDuplicadoException.message,
        },
      })
    }

    if (error instanceof UltimoMetodoPagoActivoException) {
      return ctx.response.status(422).json({
        error: {
          code: UltimoMetodoPagoActivoException.code,
          message: error.message || UltimoMetodoPagoActivoException.message,
        },
      })
    }

    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
