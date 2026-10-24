> Documento histórico v0.6. En v0.7 las descargas de información/CSV se sustituyen por solicitudes simuladas en cola. Las descargas HTML/TXT de diseño se conservan. Ver [cambios vigentes](pipelines-releases-v07.md) y [pruebas v0.7](pruebas-v07.md).

# Pruebas de revisión · v0.6

23 de octubre de 2026. Chromium automatizado en Windows. Estos resultados son controles del prototipo, no una certificación de accesibilidad, seguridad, consentimiento o cumplimiento legal.

## Resultado

- 64 comprobaciones de flujos del módulo, CSV y controles principales.
- 21 comprobaciones adicionales: plantillas, galería, estados, validación de medios, paginación principal y regresión de cafetería.
- 32 combinaciones de ruta/tema/viewport del módulo: Avisos, Preferencias, Privacidad y Administración, temas Noche/Crema, anchos 320/390/810/1366.
- 8 combinaciones de galería: mismos anchos y ambos temas.
- 32 revisiones de plantillas: 8 correos, anchos 390/600, preferencias de esquema claro/oscuro del navegador.
- 60 combinaciones de vistas anteriores: 15 vistas, ambos temas y anchos 390/1366.

**132 revisiones automatizadas actuales sin violaciones axe WCAG A/AA detectadas ni desbordamientos horizontales en las vistas revisadas.** La base v0.5 tuvo 2 instancias del mismo problema de contraste en el aviso interno de Kids demo, corregidas en el prototipo. Se conservaron capturas locales de referencia y resultados JSON. El motor revisa los criterios que puede automatizar; no verifica todo WCAG.

## Flujos comprobados

Listado público y segmentación de familias/Kids; exclusión de borradores/vencidos; fijación y orden; búsqueda, categorías, paginación y vuelta a página 1 al filtrar; CSV de resultados completos, BOM, comillas y neutralización de fórmulas; campos escapados frente a HTML en contenido.

Preferencias inicialmente desmarcadas, alta con decisión explícita, baja sin reaceptación y revocación global; finalidades internas/públicas de imagen independientes, confirmación de escenario de tutor y revocación; lectura del aviso separada de autorización; solicitudes con folio ficticio sin ejecución; ausencia de POST y ausencia de storage en el nuevo módulo; recarga que descarta decisiones.

Borrador/edición/archivo/restauración, intervalo inválido, programación futura y transición a vigente/vencido con reloj de prueba. Alt y transcripción obligatorios y confirmación de biblioteca autorizada. Carga/vacío/error/reintento. Video local con reproducción real, pista WebVTT, sin autoplay, cierre con Escape y devolución del foco. Diálogo de edición con ciclo completo de Tab. Navegación con movimiento reducido.

Herramientas en eventos, proyectos, familia, personas y aportaciones; más de cinco filas, siguiente página y búsqueda de una fila inicialmente fuera de página. Cafetería: personalización de capuchino, comanda ficticia, preparación, seguimiento y recibo con artículo específico. No se ejecutaron pagos ni correos.

Plantillas: filtros Shalom/Kids, búsqueda de asunto, páginas, vista previa aislada sin scripts y alternativa textual editable. Capturas inspeccionadas de bienvenida Kids, aviso general, recibo y galería.

## Límite de descargas en este entorno

Chromium recibió el evento de descarga y el nombre CSV correcto, pero su guardado nativo en disco fue cancelado por el entorno administrado. Las pruebas capturan y examinan **los bytes reales del Blob producido al pulsar el botón** y guardan una copia desde el proceso de pruebas. No se presenta esto como validación de guardado nativo exitoso. La descarga final del navegador del usuario requiere una prueba adicional; el ZIP de entregables y los CSV de ejemplo se proporcionan también como archivos locales.

## Repetir

1. `npm ci`.
2. Para instalar navegadores dentro del proyecto en PowerShell: `$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.pw-browsers'`; `npx playwright install chromium`.
3. `npm test`.
4. `npm run test:additional`.
5. `npm run test:audit` compara la base e9aa3e4; para revisar el estado actual: `$env:AUDIT_CURRENT='1'`; `npm run test:audit`.

Los scripts inician sus propios servidores locales temporales en 4174–4176 y los cierran. `npm run serve` usa 4173 para revisión humana. Si instalaste Playwright en otra ubicación, define PLAYWRIGHT_BROWSERS_PATH con esa ruta. Los resultados y navegadores están excluidos de Git.

## Pendiente de revisión humana/productiva

NVDA/VoiceOver, Safari/iOS/Android, zoom real al 200 % y tamaños de texto del sistema, usuarios de coordinación/familias y pruebas de entrega Gmail/Outlook/Apple Mail. Las pruebas de esquema oscuro en navegador no validan modo oscuro forzado de clientes de correo. No hay auditoría de backend porque no existe backend, ni verificación de identidad, seguridad real o integración de Kids.

## Corrección posterior de logotipos por tema

La revisión solicitada por el usuario detectó que la cabecera Noche con logo blanco se repetía también en Crema. Se cambió a las variantes originales negra/Crema y blanca/Noche en acceso, perfiles y navegación de Comunicaciones. No se recolorea ningún PNG. Se añadieron 16 revisiones de acceso/perfiles × tema × tamaño (390/1366), con cero problemas axe detectados, y 4 verificaciones de variante en Comunicaciones. Ejecutar `node tests/logos.cjs`. Estas comprobaciones se suman a la matriz anterior; las plantillas de email mantienen logo blanco porque su propia cabecera sigue siendo Noche.
