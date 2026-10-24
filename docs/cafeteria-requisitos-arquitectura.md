# Cafetería Shalom — Requisitos funcionales y arquitectura inicial

**Estado:** propuesta/documentación; **no implementado en producción**.  
**Fecha:** 23 de octubre de 2026.  
**Ámbito:** módulo de cafetería de la plataforma integral Iglesia Cristiana Shalom.

## 1. Situación observada (relato del usuario)

- Aproximadamente cinco personas atienden la cafetería: una registra y cobra, otras preparan bebidas/alimentos y entregan (distribución exacta por confirmar).
- Una tableta registra artículos demasiado genéricos (p. ej., «café» para americano o capuchino). Una pantalla orientada al cliente muestra categoría y total sin suficiente detalle.
- El importe se captura por separado en una terminal Mercado Pago. **Integración y compatibilidad todavía no verificadas.**
- Los detalles de preparación se transmiten verbalmente o mediante notas manuscritas. El equipo llama al cliente por su nombre al entregar.
- Tiempo observado: aproximadamente 15–20 minutos para alimentos y 10 minutos para cafés. Son observaciones, no medidas instrumentadas.
- Se forman filas y existen interrupciones por conversaciones; una mejora técnica por sí sola no sustituye procedimientos operativos.

## 2. Propósito

Conservar una experiencia amable y simple, pero lograr que un pedido se capture una sola vez y se comparta de forma precisa entre caja, preparación, entrega y cliente. Empezar con operaciones presenciales, sin pedidos anticipados hasta conocer la capacidad real de cocina.

## 3. Flujos de usuario

### Caja
1. Identificar productos específicos por catálogo y precio individual, sin depender de categorías genéricas.
2. Agregar cantidades y modificadores estructurados: tamaño, tipo de leche, «sin cebolla», etc.
3. Mostrar al cliente un resumen detallado en tiempo real.
4. Confirmar el importe; cobrar en la terminal Mercado Pago existente.
5. **Confirmar el pago en el sistema**: inicialmente de forma manual por el cajero; más adelante, por integración verificada y callbacks/webhooks del proveedor si son compatibles.
6. Crear/enviar a preparación una única comanda inmutable en cuanto a productos y precio, con correcciones auditadas (en vez de sobrescrituras ocultas).
7. Ofrecer recibo digital por correo (correo opcional), QR o enlace de consulta, sin obligar al cliente a registrarse.

### Cocina/KDS
- Recibir automáticamente pedidos pagados, visibles con número, artículos específicos, modificadores y antigüedad.
- Estaciones lógicas «Bebidas» y «Alimentos»; un mismo pedido puede tener líneas en cada estación.
- Estados por estación o línea: pendiente → preparando → listo.
- Alertar visualmente pedidos demorados con umbrales configurables, sin exponer nombres privados.
- Evitar pérdida, duplicado y omisiones: reintentos seguros, números estables, confirmación de recepción y recuperación tras desconexión.
- La entrega puede completarse separadamente por estación; conservar estado global del pedido.

### Cliente
- Mostrar en pantalla orientada al público el detalle **antes** de cobrar, sin información personal excesiva.
- Dar número de orden, y permitir consultar «Recibido», «Preparando», «Listo para recoger», «Entregado».
- Enviar correo transaccional estilo Uber Eats con detalles del pedido, modificadores, cantidades, totales, moneda MXN, método de pago genérico (p. ej., terminal), número y fecha, y enlace seguro de seguimiento.
- El correo **no constituye CFDI**. Si se necesitan facturas, requerir módulo/proveedor fiscal distinto y obligaciones aplicables.
- Envío del correo solo tras evento de **pago confirmado**. En modalidad manual, «confirmado» indica registro del cajero, no prueba electrónica de Mercado Pago.
- Dirección de correo opcional y separada del consentimiento para promociones. No enviar datos bancarios o de menores. Ofrecer visualización de recibo sin correo y opción de reenviar.

## 4. Estados y entidades recomendados

- Producto(id, nombre, categoria, precio, disponible, estación_de_preparación)
- Modificador/variante(id, producto, descripción, ajuste_precio)
- Pedido(id_interno_UUID, número_visible_diario, fecha, canal, estado, precio_total)
- Línea_pedido(id, producto_id, nombre_y_precio_snapshot, cantidad, modificadores_snapshot, subtotal, estación, estado)
- Pago(id, pedido_id, monto, moneda, método, estado, proveedor_referencia_opcional, confirmado_por, fecha)
- Evento_pedido(id, pedido_id, transición, actor, timestamp, detalles_no_sensibles)
- Recibo(id, pedido_id, destinatario_opcional, estado_envío, identificador_idempotencia, reintentos)
- Stock/Movimiento_inventario (fase posterior, con reglas de recetas si se decide).

Las cantidades y precios de cada línea se conservan como copia en el pedido para mantener íntegro el recibo si se edita el catálogo después.

## 5. Dimensionamiento preliminar

**Hechos de referencia:** aproximadamente 250–300 asistentes dominicales en Shalom, cinco personas en cafetería (estimación del usuario). No se conocen datos reales de tasa de compra ni ventas por servicio.

**Escenarios hipotéticos, no mediciones:**
- Moderado: 40–60 pedidos por domingo.
- Alto: 80–120 pedidos por domingo.
- Extraordinario: 150+ pedidos por domingo.
- Capacidad de diseño inicial: al menos **10 nuevos pedidos por minuto**, con pruebas de carga y margen de recuperación.

Un backend de aplicación con **2 vCPU y 4 GB RAM** puede servir como presupuesto de prueba inicial, **no como garantía**; deben medirse consumo y latencia con PostgreSQL, sincronización de KDS, resto de módulos, copias de seguridad, número real de usuarios simultáneos y proveedor de alojamiento.

La app actual de GitHub Pages es **solo prototipo estático**, sin sincronización centralizada ni autenticación, cobros o envío de correo real.

## 6. Arquitectura sugerida

- PWA móvil/tabletas responsive: interfaces de caja, cocina, entrega y consulta del cliente.
- Backend central seguro (p. ej. Django/DRF o Node), permisos servidor por rol.
- PostgreSQL para transacciones atómicas, comprobantes y auditoría.
- Eventos push a pantallas mediante WebSocket/SSE, con consulta de respaldo y reconciliación en reconexión.
- Cola persistente de trabajos para envío de email transaccional **fuera del flujo del cobro**; política de reintentos y deduplicación.
- Servicio de email transaccional con dominio verificado (SPF/DKIM/DMARC) y monitoreo de entregas/errores.
- Cobros Mercado Pago: **fase 1 captura independiente y confirmación manual**; fase 2 estudiar capacidad/API del POS y conciliación. No afirmar compatibilidad sin conocer modelo e integración disponible.
- HTTPS, control de sesiones, respaldos restaurables, registros sin credenciales ni datos completos de tarjeta y alertas de fallos.

## 7. Reglas de seguridad y privacidad

- No almacenar número completo de tarjeta, CVV ni PIN; delegar procesamiento a Mercado Pago.
- Recopilar email solo para entrega del comprobante si la persona lo proporciona; aviso de privacidad y retención limitada.
- No usar correos transaccionales para promociones sin consentimiento adecuado.
- Un pedido puede cobrar una vez y recibir un comprobante varias veces por reenvío; deduplicar efectos de notificaciones repetidas.
- Correo y pantalla pública deben omitir identificadores privados innecesarios.
- Cambios, cancelaciones, descuentos, devoluciones y cortes de caja requieren permisos, auditoría y operaciones reversibles.

## 8. Etapas

1. **Descubrimiento (1–2 domingos):** contar órdenes, tiempos de fila, pago, preparación y entrega; catalogar productos/precios/modificadores; revisar red Wi-Fi y equipo físico.
2. **MVP operacional:** catálogo detallado, caja, vista cliente, KDS en dos estaciones, números de pedido, pantalla de entrega, registro básico de pago y recibo descargable. No doble captura.
3. **Recibos por correo:** email optativo, plantilla institucional, cola y pruebas de envíos y reintentos; métricas de entrega.
4. **Operación avanzada:** inventario, mermas, cortes, analítica, permisos y eventualmente integración Mercado Pago confirmada.
5. **Pedidos anticipados:** solo después de validar capacidad real de cocina para no perjudicar pedidos presenciales.

## 9. Criterios de aceptación iniciales

- Distinción capuchino vs americano (SKU separado, precio independiente) y modificaciones visibles en caja, cocina y comprobante.
- La comanda se captura una sola vez y aparece en la estación correcta sin gritar o transcribir papel.
- El total en pantalla cliente coincide con la suma exacta de artículos y opciones.
- No se envía correo cuando pago está «pendiente», «rechazado» o «cancelado».
- La caída temporal de la conexión no produce comandas duplicadas ni pedidos silenciosamente perdidos; operación de contingencia definida.
- Tiempo para completar cobro y preparación medido antes/después; no prometer reducción sin piloto.
- Toda la experiencia respeta la marca Iglesia Shalom: Inter, Noche/Crema, acento cobre #c8956c, tarjetas con borde y sin sombras (Guía de estilos, octubre 2026).

## 10. Preguntas pendientes para levantamiento

- Número de pedidos real por servicio y hora pico; mayor/menor mezcla de bebidas y alimentos.
- Software POS actual: ¿permite SKUs, comandas, exportaciones/API?
- Modelo específico de terminal Mercado Pago y modalidad de cobro compatible.
- Tabletas/pantallas existentes, red y estabilidad de señal en cafetería.
- Definición de la entrega: solo número visible vs número y nombre opcional.
- Tarifas, productos, precios, descuentos, impuestos aplicables y requisitos fiscales.
- Quién autoriza cambios de precio, devoluciones y cortes; si se dispone de correo/dominio transaccional.

> Este documento especifica una propuesta. No hay implantación real ni un SLA acordado.
