# Prueba de aceptación — Mes 2 Módulo de Compras (nega_pos)

**Para:** Dueño del taller  
**Duración estimada:** 45–60 minutos  
**Fecha de la sesión:** _______________

---

## Propósito

Validar el rediseño del módulo de Compras post-UAT Mes 1: moneda principal en dólares (USD), hub con 3 cards (Compras / Gastos / Tasa), detalle de compra con ítems locales hasta confirmar, y devolución de compras confirmadas.

---

## Antes de empezar

Necesitás:

- [ ] Usuario y contraseña de acceso.
- [ ] Al menos 1 proveedor activo y algunos materiales en inventario.
- [ ] Conocer la tasa Bs/USD aproximada del día (para la card Tasa).

**Cómo entrar:** iniciá sesión y andá a *Compras* en el menú lateral.

---

## Pasos de prueba

| # | Acción | Qué debería pasar | OK | No OK | Comentarios |
|---|--------|-------------------|:--:|:-----:|-------------|
| 1 | **Ver el hub de Compras** (3 cards arriba). | Cards *Compras realizadas*, *Gastos* y *Tasa* con KPIs. Por defecto activa *Compras*. | ☐ | ☐ | |
| 2 | **Card Compras:** revisar KPIs (total $, % confirmadas, cantidad). | Los números coinciden con el listado. | ☐ | ☐ | |
| 3 | **Comprar:** botón *Comprar* → elegir proveedor (o *Nuevo proveedor* en el mismo modal) y fecha → *Continuar*. | Abre detalle de compra en borrador; el proveedor recién creado queda preseleccionado. | ☐ | ☐ | |
| 4 | **Detalle:** proveedor como texto (no selector). Fecha arriba a la derecha. | Campos de factura, recepción, tasa y notas visibles en la misma card. | ☐ | ☐ | |
| 5 | **Buscar ítem:** en la barra de búsqueda, escribir nombre o código de material y seleccionar. | Se agrega fila local con cantidad y precio unitario en $. | ☐ | ☐ | |
| 6 | **Nuevo material:** botón *Nuevo* → crear material con precio de venta ($). | El material nuevo aparece como fila en la compra. | ☐ | ☐ | |
| 7 | **Editar fila:** click en una fila → editar descripción/unidad/precio venta del material. | Los cambios se reflejan en la fila local. | ☐ | ☐ | |
| 8 | **Totales:** completar tasa y revisar footer. | Total **USD** prominente; total **Bs** secundario (USD × tasa). | ☐ | ☐ | |
| 9 | **Confirmar compra** con número de factura e ítems. | Compra pasa a *Confirmada*; stock de materiales sube. | ☐ | ☐ | |
| 10 | **Listado:** volver al hub; la compra aparece con total en $. | Fila clickeable lleva al detalle. | ☐ | ☐ | |
| 11 | **Devolución:** menú ⋯ en compra confirmada → *Devolución de compra*. | Con stock suficiente: compra pasa a *Anulada* y stock baja. | ☐ | ☐ | |
| 12 | **Devolución bloqueada:** intentar devolver una compra cuyo material ya se consumió en un pedido. | Mensaje de stock insuficiente; compra sigue confirmada. | ☐ | ☐ | |
| 13 | **Card Gastos:** configurar margen semanal ($) y registrar un gasto. | Tabla con fecha, descripción y monto $. Si gastos semana > margen → indicador rojo. | ☐ | ☐ | |
| 14 | **Card Tasa:** guardar tasa Bs/USD global. | Mensaje de tasa actual; compras confirmadas anteriores **no cambian** de monto. | ☐ | ☐ | |
| 15 | **Eliminar borrador:** crear compra sin confirmar → menú ⋯ → eliminar. | Solo borradores se pueden eliminar. | ☐ | ☐ | |

---

## Cierre de la sesión

**Resultado general:**

- [ ] **Aprobado** — Todo lo probado funcionó según lo esperado.
- [ ] **Aprobado con observaciones** — Funciona en general; detalle abajo.
- [ ] **No aprobado** — Hay fallas que impiden el cierre.

**Observaciones del dueño:**

```
Muy bien continuemos con el panel de materiales:
    - Materiales:
        - el listado de materiales se dividira en 2 secciones:
            - filtros:
                - sera la seccion superior de la card del listado de productos, tendra los siguientes filtros:
                    - Estatus: 
                        + Activo 
                        + Inactivo
                        + Sin stock
                    - Categoria
                    - Ranking: productos "Mas vendidos/mas usados/ Con mas flujo entrada/salida"
            - Productos:
                - los productos no se van a listar como registros en una tabla, cada producto sera un componente tipo card que cubrira el 100 de su ancho como una fila y mostrara los siguientes datos:
                    + Imagen 
                    + Descripcion
                    + status 
                    + categoria
                    + Cantidad en stock
                    + Unidad (MTS/UND/ROL/KG/CAJ/PAQ)
                    + Precio venta 
                    + Precio venta anterior
                    + Precio Costo 
                    + Precio Costo anterior
                    + Precio Referencial
                    + Costo referencial
                    + Rating
                    + Acciones
                        + Editar
                        + Eliminar 
                - La lista debe traer los primeros 30 productos registrados y debe poder paginear hacia los proximos, ultimos,etc.

                luego de leer esto debes esperar y pedir confirmacion de referencia, el usuario te pasara una imagen de referencia para guiarte de como puede verse nuestro componente producto 

necesito que el modulo pedidos ahora se llame ventas.
 Desde aca subdividiremos en 2 secciones diferentes.
  - Facturacion:
    - Desde facturacion podremos "Vender productos o mercancia", asi que necesitamos un panel de facturacion completo con las siguientes especificaciones:
        - Datos de cliente
            - Se puede registrar un cliente con sus datos a nuestra bd con los datos que se manejan actualmente
            - No es obligatorio crear y guardar el cliente tambien se puede realizar una facturacion normal solo con ingresar el nombre en el input 
            - Busqueda de productos
            - metodos de pago 
            - facturar
                - Al confirmar la venta o la factura se registra y luego en otro modulo podremos ver los registros 
  - Pedidos
    - Es lo principal, auqnue Los pedidos se pueden generar desde "facturacion", esto es un tipo de venta que lleva mano de obra, que toma tiempo para entregar un producto completo y en este panel se requieren mas especificaciones:
        - Datos del cliente, ya debe ser un cliente registrado y debe dar la opcion para registrar ahi mismo 
        - Catalogo
            - En este apartado debe haber un catalogo: Al abrir el catalogo mostrara en cards (Te proporcionare imagenes referenciales de como se vera cada prodcuto de este catalogo) y se podra agregar al carrito.
            - Agregar producto al catalogo
                - Un modal pedira la informacion:
                    + Imagen 
                    + Descripcion
                    + Precio
                    + Categoria 
                    + Si se ajusta el precio hacia abajo tiene que salir reflejado unicamente el preico actual y con una raya tachado el precio anterior
                    + boton de agregar al carrito 
                    + Editar
                        + Desde el panel de edicion se peude eliminar el producto del catalogo siempre y cuando no tenga pedidos que esten en borrador o pendientes,
                    + mas vendido
                    + cantidad en stock 
                    + Costo: El precio costo del producto es la sumatoria total del precio costo Completo de sus materiales segun las formulas, sin embargo el usuario podra agregar un precio venta del producto siempre y cuando este por encima del costo por defecto el costo es 0
                - Configuracion:
                    - Formulas:
                        Las formulas funcionara de la siguente manera: Un producto completo del catalago contiene formulas esas formulas estan diseñadas en base a los materiales registrados en el sistema, por ejemplo:
                            - Conjunto adidas:
                                - Materiales:
                                    - Muselina negra strech
                                        - 6 mts
                                    - Hilo negro 
                                    - Hilo blanco 
                                    - Bivo 
                                    - Cinta elastica 
                                        - 0.5 mts
                        Una vez que se guarde el borrador del pedido se puede visualizar unicamente el presupuesto, pero una vez que se confirme el peiddo y entre a produccion se debe descontar el material indicado
                    Las formulas presentan la sigueinte informacion:
                        + Producto 
                        + Cantidad 
                    Se peude editar una formula, al crear un producto para el catalogo se puede agregar una formula ya diseñada se agrega un producto existente y se pone la cantidad que lleva 
            - Al aceptar los productos del catalogo me llevara a la ventana de confirmacion de pedido en el que me mostrara que es lo que llevo
            - En cualquier momento puedo agregar mas productos y en cualquier momento puedo indicar que cantidad quiero llevar de cada cosa individualemente
            - Al confirmar el pedido se crea el peidido y se mostrara en el panel de pedidos como esta el flujo actual de borrador,etc.

            Una vez aclarado estos puntos debes pedir las imagenes de referencia para proceder 
                 




```

**Firma / fecha:** _______________________________
