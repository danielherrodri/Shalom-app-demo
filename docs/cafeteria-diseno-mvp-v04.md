# Cafetería Shalom — Propuesta funcional y técnica v0.4

**Fecha:** 23 de octubre de 2026 · **Estado:** prototipo interactivo, no POS productivo.

## Decisión

Una sola captura del pedido debe generar el resumen detallado al cliente, la comanda para cocina y el registro necesario para el recibo. Evitar doble captura, papeles y productos genéricos. Mantener inicialmente la terminal Mercado Pago independiente hasta validar modelo, API y compatibilidad.

## Problema operativo observado

Cafetería de aproximadamente cinco colaboradores. La cajera selecciona categorías genéricas en una tablet, confirma verbalmente el importe y lo captura manualmente en Mercado Pago. Las instrucciones se transmiten de palabra o en comanda manuscrita; se gritan nombres para la entrega. El cliente no ve productos y modificadores claramente. Tiempos aproximados reportados: **10 minutos para café y 15–20 minutos para alimentos**. Son observaciones, no mediciones.

## Pantalla 1 · Caja rápida

- Catálogo específico por SKU: americano y capuchino son productos distintos incluso si su precio coincide.
- Modificadores estructurados y auditables: leche deslactosada, sin cebolla, salsa aparte; los cambios deben aparecer en cocina y en el recibo.
- Carrito con cantidades, precios por línea, subtotal y total.
- Vista orientada al cliente que refleja íntegramente el pedido **antes** de confirmar el pago.
- Confirmación de pago inicialmente **manual** por la cajera; registro del método sin datos de tarjeta. No crear comanda duplicada por doble clic.
- Una orden identificada por número estable se distribuye automáticamente a las estaciones de preparación. Debe guardarse de forma transaccional en la versión real.
- Se permite comprar sin iniciar sesión; correo de recibo optativo en producción.

## Pantalla 2 · Preparación (KDS)

- Tarjetas con orden, artículo exacto, cantidad, variantes e instrucciones, antigüedad y estado.
- Dos estaciones lógicas: **Bebidas** y **Alimentos**. Un pedido mixto aparece en ambas; se procesan independientemente.
- Flujo **Pendiente → Preparando → Listo** por línea o estación.
- La orden global solo está **Lista** cuando todas las líneas están listas.
- Ordenar de más antigua a más reciente. Umbrales de demo: 8 minutos bebidas y 15 minutos alimentos; ajustarlos tras piloto.
- Avisos sin depender de gritos, reconexión, deduplicación, confirmación de recepción y contingencia ante fallos de red en producción.

## Pantalla 3 · Seguimiento y recibo

- Número de orden para consulta: registrada, en preparación, lista para recoger, entregada.
- Detalle de productos, cantidades, modificaciones, total y método registrado.
- **Vista previa de recibo estilo aplicación de entregas** y posibilidad de imprimir/guardar PDF.
- **Envío real por correo pendiente de backend:** solo tras confirmar el pago; cola de envíos fuera del proceso de caja, reintentos, deduplicación, dominio verificado (SPF/DKIM/DMARC), estado de entrega, consentimiento separado para promociones.
- El correo comercial de compra **no equivale a CFDI**.

## Proceso previsto

1. Caja selecciona productos y modificadores una sola vez.
2. El cliente revisa el detalle y el total.
3. Terminal procesa el cobro externamente.
4. La cajera confirma recepción del pago; el sistema guarda exactamente **una** orden.
5. Se publican líneas a bebidas/alimentos y se encola el recibo.
6. Preparación avanza cada estación sin depender de mensajes verbales.
7. Al terminar todo, la orden aparece lista y se confirma entrega.

## Qué está implementado en la demo / qué falta

| Capacidad | Demo v0.4 | Producción |
|---|---|---|
| Productos específicos y modificadores | Sí (ficticios) | Catálogo, permisos, precios e impuestos reales |
| Caja y vista cliente | Sí | Dos pantallas con sesiones conectadas |
| Comandas bebidas/alimentos | Sí, dentro del mismo navegador | Sincronización real entre dispositivos |
| Estados de trabajo y seguimiento | Sí | Autenticación, auditoría y acceso seguro |
| Recibo e impresión | Vista previa | Persistencia y correo real |
| Mercado Pago | No se cobra | Manual primero; integración solo si resulta compatible |
| Inventario / cortes / devoluciones | No | Fase posterior |
| Guardado | localStorage del navegador | Base de datos central |
| Correos automáticos | No | Servicio transaccional con cola |
| Seguridad de usuarios | No | Control de roles en servidor |

La demo publicada en GitHub Pages **no sincroniza tablets diferentes, no autentica usuarios, no cobra y no manda correos**. No ingresar datos reales de clientes, menores o medios de pago.

## Arquitectura para la primera versión real

- Interfaz PWA responsive con vistas de caja, cocina, entrega y consulta.
- Backend Django/DRF o Node con permisos por rol y HTTPS.
- PostgreSQL; entidades `products`, `modifiers`, `orders`, `order_lines`, `payments`, `order_events`, `receipts`, `receipt_outbox`.
- Snapshot del precio y nombre del producto al confirmar para recibos históricos correctos.
- Creación/confirmación atómica; identificador idempotente para evitar duplicación de pedidos y cobros.
- SSE/WebSocket con reconexión y reconsulta para mostrar datos reales a varias tablets.
- Cola persistente para enviar correos después del pago y reintentar sin bloquear la caja.
- No almacenar PAN, CVV, PIN o credenciales de tarjetas.
- Respaldo, restauración probada, monitoreo, control de cancelaciones y procedimiento alternativo sin red.

## Escala prevista para pruebas

Con asistencia total estimada de **250–300 personas** los domingos, escenarios meramente hipotéticos de cafetería: 40–60 pedidos (moderado), 80–120 (alto), 150+ (extraordinario). Objetivo de prueba de carga inicial: **10 nuevos pedidos por minuto** con consultas concurrentes. Un servidor de prueba de **2 vCPU y 4 GB RAM** es referencia presupuestaria, **no garantía**; medir capacidad con la carga del resto de módulos y el proveedor real.

## Plan de implementación

1. **Levantamiento:** conocer POS existente, terminal Mercado Pago, Wi-Fi, tablets, precios y productos reales; documentar responsabilidades y flujo de entrega.
2. **Línea base:** medir durante dos domingos tiempo en fila, captura, pago, preparación de bebidas y alimentos, errores y devoluciones.
3. **MVP:** caja de catálogo específico + pantalla cliente + comanda digital + estados + número de recogida y operación manual del pago.
4. **Correo digital:** servicio transaccional, cola y mensajes auditables.
5. **Control avanzado:** inventario por receta/merma, reportes y revisión de integración con terminal.
6. **Pedidos anticipados:** solamente cuando el equipo pueda absorber demanda adicional.

## Criterios de aceptación

- Americano y capuchino no son «Café» genérico.
- El total mostrado al cliente coincide con la suma detallada.
- «Sin cebolla» se ve en caja, cocina y recibo.
- Una acción de confirmación no genera dos comandas.
- Bebidas y alimentos avanzan por separado; no se anuncia orden lista a medias.
- Ningún correo transaccional se envía antes de pago confirmado.
- Las tablets recuperan estado tras corte de red sin perder o duplicar órdenes.
- Una transacción cancelada o reembolsada es auditable.
- Se comparan métricas reales antes/después; no prometer reducción de tiempos sin piloto.

## Identidad visual

Seguir **Guía de estilos Iglesia Shalom, octubre 2026**: Inter, tema Noche `#1a1a1a`, cobre `#c8956c`, tema Crema `#faf7f2`, tarjetas con borde fino sin sombras. La demo usa imágenes y datos ficticios, y no altera Shalom Kids.

## Enlaces

- [Cafetería interactiva](../cafeteria.html)
- [Aplicación principal Shalom](../index.html)
- [Requisitos previos](./cafeteria-requisitos-arquitectura.md)
