> Documento histórico v0.6. En v0.7 las descargas de información/CSV se sustituyen por solicitudes simuladas en cola. Las descargas HTML/TXT de diseño se conservan. Ver [cambios vigentes](pipelines-releases-v07.md) y [pruebas v0.7](pruebas-v07.md).

# Plantillas de correo · Shalom v0.6

Ocho ejemplos HTML y texto plano, sin destinatarios, credenciales, envío o integración productiva. [Abrir galería](../comunicaciones.html#correos).

## Referencia y adaptación

El HTML adjunto «Bienvenido(a) a Shalom Kids» se inspeccionó como referencia. Se extrajo su plantilla declarativa sin ejecutar sus scripts de empaquetado. Su jerarquía de bienvenida, pasos, grupos y CTA inspira esta familia. No se publica el adjunto original, su envoltura, datos embebidos, nombres de ejemplo antiguos ni enlaces Apps Script. El árbol público de Shalom-app-demo, base e9aa3e4, no contenía otras plantillas HTML independientes; sí una vista de recibo dentro de cafeteria.html.

Se sustituyeron Georgia y las fuentes de sistema por Inter con Arial de respaldo; los clientes que no admiten fuentes web usarán Arial. Shalom usa Noche/Crema y cobre; Kids blanco, fuego y oro de la guía. Botones generales cobre/negro; Kids fuego-700/on-fuego. Sin fotos de personas, sombras, animación, scripts, píxeles de seguimiento o formularios. Logo blanco sobre cabecera Noche sin distorsión. Los textos siguen las frases breves y el tono de la guía y del ejemplo suministrado.

## Archivos

| Plantilla | Tema | Finalidad propuesta |
| --- | --- | --- |
| bienvenida-kids | Kids | Incorporación al servicio, a validar con operación real. |
| recordatorio-kids | Kids | Recordatorio de asignación válida; no boletín. |
| aviso-general | Shalom | Optativo de avisos generales. |
| invitacion-evento | Shalom | Invitación optativa. |
| recibo-cafeteria | Shalom | Transaccional por pedido solicitado. |
| cambio-preferencias | Shalom | Confirmación de acción solicitada, sin resuscripción. |
| solicitud-privacidad | Shalom | Acuse de solicitud, sin afirmar resolución. |
| imagen-menores | Kids | Confirmación de una decisión verificada, sin foto del menor. |

Cada ID tiene `emails/[id].html` y `.txt`. El contenido editable central está en [catalogo.json](../emails/catalogo.json); `python tests/build-emails.py` regenera los HTML/texto y el catálogo de la galería. Puedes editar HTML directamente, pero regenerar lo reemplazará; conserva cambios en el catálogo o generador.

Los campos entre corchetes están pendientes; no son datos reales. Las llamadas a la acción y la baja llevan al prototipo, no a servicios reales. El enlace «Baja de ejemplo» **no es una baja operativa de un clic**. El backend de producción deberá sustituirlo por un enlace seguro e idempotente sin login, además de las cabeceras y endpoint del proveedor cuando proceda. Los optativos incluyen preferencias y motivo de recepción; las plantillas transaccionales describen una acción solicitada y no llevan promociones.

## Compatibilidad y entrega pendientes

La estructura usa tablas de presentación de ancho máximo 600 px, estilos inline, media query móvil y CTA VML para Outlook clásico. Imágenes locales para la vista previa: al integrar el correo deben sustituirse por URLs HTTPS públicas autorizadas o adjuntos CID compatibles. No pegar rutas de disco o enlaces relativos en el servicio de email. Mantener una versión textual multipart/alternative y sustituir los campos con escape de HTML y validación de URLs de destino.

Las pruebas de navegador y axe no equivalen a pruebas de entrega. Faltan Gmail web/móvil, Outlook clásico/nuevo, Apple Mail/iOS, imágenes bloqueadas, modo oscuro forzado, tipografía de respaldo, VML real y lectores de pantalla de clientes de correo. No hay promesa de representación idéntica ni de entregabilidad. Confirmar SPF/DKIM/DMARC, reputación, listas de supresión, rebotes, destinatarios verificados y separación marketing/transaccional antes de operar.

El prototipo propone tema claro estable para el cuerpo de email, con cabecera Noche; no fuerza el tema de la app en el buzón. Algunos clientes alteran colores en modo oscuro. Kids mantiene su propia temática y no mezcla fuego con cobre dentro del mismo cuerpo.
