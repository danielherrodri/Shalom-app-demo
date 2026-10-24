# Pruebas v0.7

23 de octubre de 2026. Ejecución local en Windows/Chromium con Playwright 1.56.1 y axe 4.11.0. Datos exclusivamente ficticios. No hay correos, archivos de información ni backend real.

## Evidencia de esta versión

- `npm test`: 64 comprobaciones de flujo y 40 combinaciones de 5 rutas × 4 anchos (320, 390, 810, 1366) × 2 temas. Incluye Procesamiento demo y solicitudes de todos los resultados filtrados.
- `npm run test:additional`: 22 comprobaciones adicionales y 40 revisiones (32 plantillas y 8 galería); conserva captura/seguimiento de comanda y sustituye impresión del recibo por solicitud en cola.
- `npm run test:processing`: 25 comprobaciones. Lotes de 3, una exportación, bloques de 100 filas, prioridades, supresión optativa, caducidad, errores permanentes, máximo 3 intentos temporales y por cuota, pausa inmediata en el mismo lote, espera diferida, replay único, conciliación sin reenvío, evento de entrega idempotente y correo dependiente único. Integración de exportaciones de avisos, perfil, aportaciones y listados; no descargas, no escrituras de red, memoria descartada al recargar y foco tras actualizar. Incluye 16 revisiones adicionales de panel/modal poblados, teclado, temas y anchos.
- `$env:AUDIT_CURRENT='1'; npm run test:audit`: 60 combinaciones de vistas anteriores sin violaciones detectadas.
- `npm run test:logos`: 16 combinaciones de perfil/tema/ancho con carga del logo y axe, más 4 verificaciones de variante de logo en Comunicaciones. La prueba espera carga de imágenes para evitar confundir dimensiones temporales de cero con logos ausentes.

**172 revisiones automatizadas con axe sin violaciones detectadas**: 40 + 40 + 16 + 60 + 16. Las cuatro verificaciones extra de variante de logo no se cuentan como escaneos. Sin desbordamiento en las matrices responsive que lo comprueban. Capturas de paneles Noche/Crema en móvil y escritorio inspeccionadas visualmente.

Los controles de la nueva cola no descargan archivos. La prueba intercepta eventos de descarga y escrituras de red y verifica que ambos contadores permanezcan en cero en los recorridos medidos. La demo no persiste consentimiento; almacenamiento heredado de datos ficticios de app/cafetería sigue documentado por separado. No se aplica una afirmación global de ausencia de red: el alojamiento y algunas fuentes externas del prototipo anterior pueden realizar GET.

## Reproducir

`npm ci`. Instalar Chromium de Playwright según las instrucciones del README; los scripts detectan `.pw-browsers` si existe. Ejecutar los cinco comandos anteriores. Servidores de pruebas temporales en puertos 4174–4178; el servidor de vista manual usa 4173. Resultados JSON/capturas y navegadores están ignorados por Git y se incluyen por separado en los entregables.

## Límites

No certifica WCAG, seguridad, consentimiento válido ni entrega de correo. No se probaron Safari/iOS, lectores de pantalla ni usuarios reales. El modo de movimiento reducido evita medir colores intermedios de transiciones. No hay serializador CSV productivo que validar en esta versión: deberá probarse escape/neutralización, codificación, alcance y autorización al implementarlo. No se ejecutó pipeline remoto de CI ni se configuraron protecciones de despliegue. Kids real conserva una revisión de solo lectura previa; no se ejecutó ningún flujo operativo real.
