# Prueba de aceptación — Mes 1 (nega_pos)

**Para:** Dueño del taller  
**Duración estimada:** 30–45 minutos  
**Fecha de la sesión:** 1/06/2026

---

## Propósito

Esta es la prueba de aceptación del Mes 1. Si todo funciona como se describe abajo, firmás al final y se cierra el hito del primer mes.

No hace falta saber de sistemas: solo seguí los pasos y marcá si cada uno funcionó o no.

---

## Antes de empezar

Necesitás:

- [ ] Usuario y contraseña de acceso (te los comparte el equipo).
- [ ] Navegador actualizado (Chrome, Edge o Firefox).
- [ ] Conexión a internet estable.
- [ ] Ideal: al menos 1 proveedor, algunos materiales y 1 máquina ya cargados (si no, los creamos juntos en la sesión).

**Cómo entrar:** abrí la aplicación, iniciá sesión con tu usuario y contraseña.

---

## Pasos de prueba

Marca **OK** o **No OK** en cada paso. Si algo falla, anotá qué viste en *Comentarios*.

| # | Acción | Qué debería pasar | OK | No OK | Comentarios |
|---|--------|-------------------|:--:|:-----:|-------------|
| 1 | **Iniciar sesión** con tu usuario y contraseña. | Entrás al sistema y ves el menú lateral (Dashboard, Clientes, Pedidos, etc.). | si | ☐ | |
| 2 | **Ver el Dashboard.** | Ves resumen del mes: compras, gastos de máquinas y alertas de stock bajo (si hay). | si | ☐ | |
| 3 | **Crear un cliente nuevo.** Ir a *Clientes* → *Nuevo cliente*. Completar nombre y tipo. Guardar. | El cliente aparece en el listado. | si | ☐ | |
| 4 | **Crear un pedido** para ese cliente. Cantidad: **5 prendas**. Descripción clara (ej. "Polos corporativos prueba"). | El pedido queda en estado **Borrador** con un código automático (PED-…). | SI | ☐ | |
| 5 | **Agregar receta:** en el detalle del pedido, agregar **2 materiales** con cantidad por unidad. | Ves la tabla de receta con consumo total calculado (cantidad por unidad × 5). | si | ☐ | |
| 6 | **Confirmar el pedido** (botón *Confirmar*). | El estado pasa a **Confirmado**. La receta ya no se puede editar. | si | ☐ | |
| 7 | **Pasar a producción** (botón *Pasar a producción*). | El estado pasa a **En producción**. Si no hay stock, aparece advertencia con detalle. | si | ☐ | |
| 8 | **Verificar stock:** ir a *Materiales* y buscar los materiales de la receta. | El stock bajó según lo consumido por el pedido (5 × cantidad por unidad). | si | ☐ | |
| 9 | **Marcar entregado** (botón *Marcar entregado*). | El pedido pasa a **Entregado**. | si | ☐ | |
| 10 | **Pedido sin stock:** crear otro pedido con cantidad **alta** (ej. 500) y receta que consuma más de lo que hay en inventario. Intentar pasar a producción. | Aparece ventana de **stock insuficiente** con materiales, stock actual y faltante. | si | ☐ | |
| 11 | **Probar "Forzar igual"** (solo si apareció la advertencia). Confirmar dos veces. | El pedido pasa a producción aunque el stock quede negativo. | si | ☐ | |
| 12 | **Cancelar un pedido en producción** (otro pedido de prueba). | El pedido pasa a **Cancelado** y el stock de materiales **se devuelve**. | si | ☐ | |
| 13 | **Registrar un gasto de máquina.** Ir a *Máquinas* → elegir una → *Registrar gasto*. Monto en bolívares y descripción. | El gasto aparece en el detalle de la máquina. | si | ☐ | |
| 14 | **Volver al Dashboard.** | Ves actualizados los gastos de máquinas y compras del mes (si hay datos). | si | ☐ | |
| 15 | **Revisar precios en una compra** (si hay compras cargadas). | Los precios en bolívares y la referencia en dólares se ven correctamente. | si | ☐ | |

---

## Cierre de la sesión

**Resultado general:**

- [x] **Aprobado** — Todo lo probado funcionó según lo esperado.
- [ ] **Aprobado con observaciones** — Funciona en general; detalle en observaciones.
- [] **No aprobado** — Hay fallas que impiden el cierre; detalle en observaciones.

**Observaciones generales:**

```
(Espacio libre para notas del dueño o del equipo)
La interfaz es un asco, no me gusta para nada, el flujo de funcionalidad es peor todavia, esto deberia ser intuitivo y amigable y no se por que o para que funciona cada cosa, si no hubiera estado junto con el lead no entiendo nada de para que sirve o como usarlo. Confie en que me ibana a entregar un producto novedoso intuitivo ya que yo no se nada de sistemas pero en vista de esta cagada te voy a dar los cambios que vamos a requerir son los siguientes:

la moneda general sera el $

- Modulo de compras:
    - el modulo de compras comprendera 
        -Se espera visualizar 3 cards rectangulares de una relacion 3/2 los cuales son filtros de busqueda y se espera visualizar la sigueinte informacion:
        - Compras Realizadas: 
            - Este es un filtro que debe estar en focus de manera por defecto, este filtro al darle click mostrara una tabla con registros de compras.
                - Boton para "Comprar": hasta aca todo esta bien todo igual pero cuando vamos a la compra purchases/x vamos a cambiar las cosas:
                    Card1 "Datos de compra"
                    - En un texto, no en un select, el nombre del provedor y en la esquina superior derecha de la tarjeta la fecha que se ingreso anteriormente 
                    - Campo de texto para ingresar numero de factura
                    - Fecah de recepcion opcional no es necesario
                    - Tasa
                    - Notas
                    Card2 "Items" debe ir dentro de card1, no en otra card separada se ve horrible asi.
                    - vamos a cambiar el como se van a insertar estos registros de items para compra
                    - Deseo ver una tabla con los siguientes valores:
                        + Codigo
                        + Producto (descripcion/nombre)
                        + Cantidad (cantidad a comprar float con 2 decimales)
                        + Unidad
                        + Precio Unit (preico costo)
                        + Sub Total
                        + Acciones
                            + boton de papelera para eliminar item del registro de la compra
                    - En la parte superior de la carta donde se encuentran alineados "items" y entre el boton "agregar items" vamos a ubicar un buscador, que debera filtrar perfectamente entre todo nuestro inventario por descripcion, categoria, codigo, y si lo seleccionamos lo agregara a la tala (Estos registros no deen subirse a la base de datos se deben manejar como registras locales, no mandarlos a la base de datos, hasta que se confirme la compra)
                    - boton de "Nuevo", este boton abrira un modal donde me aprecera el formulario para registrar un nuevo producto y una vez creado el producto se agregara a la lista de items para la compra.
                    - Si presiono encima de uno de los registros de items para la compra me habilitara en un modal la pagina de material/producto para editar los datos, descripcion, unidad, precio venta, se guardan los cambios y aparecen los cambios en el producto seleccionado para la compra.
                    - Al final de la card me mostrara el total en la moneda principal USD y la moneda secundaria Bs
                
                - Tabla listando todos los registros de compras procesados con un paginador de 20 registros por pagina todas deben ir ordenadas por fecha. La tabla debera mostrar los siguientes datos de compra:
                    + proveedor 
                    + Nro factura
                    + Total
                    + Fecha 
                    + Total 
                    + Acciones
                        + Tres puntos
                            - Al darle a los tres puntos se debe 3 opciones, devolucion de compra (Se debe devolver la cantidad de material que se compro si se confirmo la compra, y el monto de compra debe ser devuelto/quitado del monto total en la card de Compras realizadas)
                - Darle click al registro abrira la pagina de la compra realizada mostrando los datos de compra a detalle.
                - Se puede eliminar una compra en estado pendiente pero una compra porcesada unicamente se puede devolver y quedaria como anulada si y solo si el material no ha sido consumido en su totatalidad, si hay suficiente cantidad para devolver la compra entonces se debe restar del inventario y del monto total de compras procesadas.
            - La informacion que debe mostrar es la siguiente>
                + Monto total en compras $
                + Porcentaje de compras confirmadas en relacion a las compras registradas
                + cantidad de compras registradas 
        - Gastos:
            - Esta card es un filtro de los gastos realizados por la empresa, los gastos son aquellas compras que no necesariamente vienen con factura y que no generan un aumento en la existencia de ningun producto en el inventario. Al darle click o hacer focus se debe mostrar una tabla con los gastos registrados, + un boton de registrar gasto
                - La tabla de gastos debe mostrar la siguiente informacion: 
                    + Fecha 
                    + Descripcion 
                    + Monto 
                - Crear/agregar un nuevo gasto abrira en un modal un formulario para regsitrar los datos que mostrara la tabla en la interfaz de usuario debe decir que todos los campos son requeridos, pero a nivel de BD no.
                - Input de margen semanal:
                    - En este input puedo ingresar una cantidad que puedo consumir en gastos semanalmente, si paso ese monto se debe ver que esta como en rojo de peligro
            - La informacion que debe mostrar es:
                + Monto total de gastos $
                + Cantidad de gastos registrados 
                + Porcentaje del margen ingresado que tengo para consumir en relacion al monto general de todos los gastos registrados semanalmente:
                    semana del 12-19 se ingresas un margen de gastos de 200$, registro un gasto de 50$ y otro de 50$, el porcentaje de consumo calculado va por el 50$ del permitido
        - Tasa:
            - Esta card sera un medio unicamente para ingresar una tasa en cualquier momento que sera una herramienta que me ayudara a calcular rapidamente todo en mi sistema de $ a Bs y funcionara de la siguiente manera:
                - al darle click o hacer focus mostrara un input y un boton en el cual ingresaremos la tasa en $ que vayamos a manejar y al darle al boton de guardar esta se guardara pero no editara montos o valores en ningun lugar del sistema, no debe ocasionar un recalculo de monto en ningun lugar a menos que lo amerite, luego indicaremos en que caso lo requerira.
    
avancemos con el modulo de compras por ahora 




```

**Firma del dueño:** __ROXANA CANADELL

**Fecha:** 2 / 06 / 2026

**Acompañante técnico (opcional):** ________________________________

---

*Documento generado para cierre de Mes 1 — nega_pos.*
