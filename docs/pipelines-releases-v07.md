# Procesamiento y entregas · propuesta v0.7

23 de octubre de 2026. Prototipo público estático. No hay backend, correo, exportaciones de información, autenticación ni registro de consentimientos reales. Esta arquitectura es una propuesta pendiente de validación, contratación y despliegue.

## Probar la demo

Abrir Comunicaciones → Procesamiento demo. Cargar ejemplos y avanzar lotes manualmente. Cada lote selecciona como máximo 3 trabajos y una exportación; cada bloque representa hasta 100 filas ficticias. Reparto rotativo alta/alta/media/baja, sin promesa de orden absoluto. La prioridad baja queda suprimida si no se activa el supuesto optativo de ejemplo. No representa un consentimiento válido.

Los correos transitorios tienen 3 intentos como máximo, con espera de 30 y 120 segundos de reloj manual; cuota pausa el proveedor, espera 600 segundos y también limita a 3 intentos. Reanudar no elimina esa espera. La pausa interrumpe los correos ya seleccionados en el lote; las exportaciones pueden continuar. Los trabajos caducan a la hora de prueba cuando vuelven a examinarse. No hay proceso automático ni reloj de pared. Error permanente pasa a correo muerto; cada trabajo muerto admite una sola revisión corregida. Un resultado incierto requiere conciliación ficticia, nunca reenvío automático. Aceptado no significa entregado: hace falta un evento separado.

La solicitud representa todos los resultados filtrados, sin limitarse a la página visible. Guarda metadatos ficticios; no crea CSV, PDF ni enlaces de datos. Se deduplica mientras está pendiente, generando o generada, incluida su entrega simulada. Recargar vacía la cola. El catálogo de plantillas conserva HTML/TXT descargables como materiales editables de diseño, distintos de una exportación de información.

## Arquitectura provisional de producción

App autenticada → API con autorización por persona/finalidad → base transaccional con solicitud y outbox → despachador → colas separadas (acceso urgente, transaccional, optativa, exportaciones) → workers → proveedor de correo → eventos autenticados y conciliación.

La API debe obtener el correo del perfil verificado; nunca aceptar un destinatario arbitrario ni confiar en los roles de esta demo. Registrar actor, alcance, filtro canónico, versión de datos o instante de snapshot, columnas permitidas, formato, schemaVersion y correlationId. Aplicar autorización al solicitar y al ejecutar. No exportar datos fuera del alcance autorizado. Evitar datos personales en payloads y logs; enviar referencias opacas. Definir retención, cifrado y borrado con responsables.

Una transacción guarda solicitud y outbox. El despachador confirma publicación; repetir publicación es seguro por una clave estable. Worker adquiere lease y escribe checkpoints por bloque; liberar/reintentar tras caída sin repetir bloques ni generar dos entregas. Finalizar archivo y correo dependiente mediante transacción y restricción única. Snapshot reproducible y paginación por cursor; búsqueda y filtros en servidor. Neutralizar fórmulas CSV al generar y validar escape, codificación y columnas. La demo ya no genera CSV y no prueba ese serializador futuro.

La entrega se propone por correo con vínculo de acceso breve, autenticado y revocable, sin botón de descarga de datos en la app. Elegir adjunto solo tras revisar sensibilidad y tamaño. El destinatario vuelve a autorizarse antes de entregar. Consentimiento optativo vigente, bajas y supresiones se evalúan inmediatamente antes del envío; lo esencial requiere finalidad y política propia. No usar marketing como requisito de acceso.

Cloud Tasks es una opción provisional para ejecución explícita; no proporciona orden garantizado ni evita todos los duplicados. Las prioridades serían colas separadas con un planificador propio y envejecimiento para evitar inanición. Aplicar concurrencia, presupuesto de filas/bytes/tiempo y tasa por cola, más un límite global compartido del proveedor entre todos los workers. No sumar cuotas por cola como si fueran independientes. Fijar deadline de aplicación estricto además de configuración de reintentos: no suponer que la combinación de límites del servicio sustituye la caducidad de negocio. Backoff exponencial con jitter y Retry-After en producción. Los números de la demo son ilustrativos, no dimensionamiento.

DLQ de aplicación: tabla de trabajos agotados/permanentes con causa, último intento, revisión autorizada y referencia a la nueva ejecución; no se atribuye a Cloud Tasks una DLQ nativa. Timeout tras enviar → incierto; conciliar por clave de proveedor antes de reintentar. Si el proveedor no puede garantizar deduplicación o consulta, revisión manual. Webhooks firmados, eventos deduplicados por ID y transiciones monotónicas; entregado significa evento de proveedor, no lectura humana. Rebote permanente suprime el destino según política; no recrear campañas a esa dirección sin corrección verificada.

Apps Script puede servir como puente acotado, pero sus cuotas y tiempo máximo de ejecución dependen de cuenta y servicio; revisar cuotas vigentes y capacidad real antes del piloto. No usar sleeps largos o triggers como garantía de entrega. No se modifica el sistema actual en esta versión.

## Mejoras, versiones y releases

1. Registrar defecto con pasos, impacto, evidencia ficticia, responsable y criterio de aceptación. Corregir en rama; añadir regresión que reproduzca el defecto y revisar cambios de privacidad/compatibilidad.
2. Versionado semántico: patch para corrección compatible, minor para capacidad compatible, major para ruptura. Mantener changelog y decisiones; separar versión de UI, payload, plantilla y migración.
3. CI propuesta: instalación reproducible con lockfile, revisión de secretos y datos personales, sintaxis, pruebas de flujos/colas, matriz responsive y axe, enlaces internos, revisión humana. Publicar artefacto inmutable por SHA, con manifiesto y checksum. Este documento no configura protecciones ni afirma una ejecución remota de CI.
4. Staging aislado con datos sintéticos y proveedor de correo de prueba o capturador sin destinatarios reales. Ensayar cuotas, caídas entre checkpoints, eventos duplicados/fuera de orden, revocación antes de envío, recuperación y migraciones.
5. Producción futura: aprobar evidencias, backup y responsable; desplegar primero workers compatibles con payload anterior y nuevo. Migración expandir → backfill por lotes verificables → validar → cambiar lectores/escritores → contraer en otra versión, después de vaciar trabajos antiguos. Mantener consumidores N/N-1 durante la retención máxima. Payload desconocido va a revisión, sin descartar ni reinterpretar.
6. Despliegue gradual por cohortes autorizadas: 5%, 25%, 100%, con ventanas de observación definidas según volumen. Propuesta inicial: detener ante cualquier destinatario no autorizado/duplicado o error irreversible; pausar ante >2% fallos durante 15 minutos o cola urgente >5 minutos. Ajustar umbrales con operación real antes de habilitar envíos.
7. Rollback: detener nuevos despachos/envíos, conservar outbox y checkpoints; volver a artefacto compatible anterior y conciliar los intentos inciertos. No reenviar la cola completa, no revertir datos con migración destructiva y no prometer retirar correos ya enviados. Si hubo datos expuestos, activar el procedimiento de incidentes. Para este prototipo estático, volver a la revisión anterior solo cambia archivos públicos.
8. Revisar semanalmente antigüedad por prioridad, tiempo a entrega, cuotas, reintentos, rebotes, DLQ, duplicados, bajas efectivas y costo por trabajo. Asignar dueño y fecha a mejoras; validar con usuarios mayores, familias y coordinación.

## Fuentes oficiales verificadas

- [Cloud Tasks: tasas, concurrencia y reintentos](https://docs.cloud.google.com/tasks/docs/configuring-queues).
- [Cloud Tasks: orden y ejecuciones duplicadas](https://docs.cloud.google.com/tasks/docs/common-pitfalls).
- [Cuotas de Apps Script](https://developers.google.com/apps-script/guides/services/quotas).
- [GitHub: entornos y reglas de despliegue](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

Las fuentes describen capacidades de los servicios. La separación de colas, outbox, DLQ de aplicación, umbrales y estrategia de releases son decisiones propuestas del proyecto.
