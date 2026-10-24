# Shalom · Comunicaciones y privacidad · DEMO v0.6

23 de octubre de 2026. Base inspeccionada: `main` v0.5, commit `e9aa3e4ab5da314ce93e0ca554a9755989d2ff16`. v0.5 es la versión declarada en README; no había una etiqueta Git v0.5. Ver [auditoría](auditoria-diseno-v06.md) y [pruebas](pruebas-v06.md).

## Abrir y probar

- [Avisos públicos](../comunicaciones.html#avisos)
- [Preferencias](../comunicaciones.html#preferencias)
- [Privacidad](../comunicaciones.html#privacidad)
- [Administración simulada](../comunicaciones.html#admin)
- [Galería de ocho correos](../comunicaciones.html#correos)

El módulo es una página estática. No autentica, envía correo, procesa pagos, carga archivos personales ni guarda autorizaciones. Los cambios se mantienen **solo en memoria de esta pestaña**, sin localStorage, sessionStorage, cookies ni solicitudes POST. Al recargar se pierden publicaciones, preferencias, lecturas, solicitudes e historial ficticio. El reloj inicia en 23 de octubre de 2026 deliberadamente, para mantener reproducible la demo. La infraestructura de alojamiento puede registrar datos técnicos de visita; no se afirma ausencia total de tratamiento por terceros.

El resto de la app v0.5 conserva su almacenamiento local de ejemplos y la cafetería su simulación de pedidos. Esos datos no son un registro de consentimiento. Shalom Kids real, sus hojas, QR, docentes, alumnos, Apps Script y permisos no se modifican ni se integran.

## Recorridos de revisión

1. En Avisos, busca «mesa», cambia categoría y descarga CSV. Cambia a Familias + Kids para ver un aviso segmentado. Vuelve a Público para comprobar que desaparece.
2. Abre Administración, crea un borrador, edítalo y fija su posición. Elige una vigencia futura y estado Programado. Cambia la fecha de prueba para verlo publicado y después vencido. Archivar es reversible; restaurar devuelve un borrador.
3. En Preferencias marca un tema e intenta aplicarlo sin confirmar: aparece un error. Confirma y aplica; después desactiva o revoca sin una nueva aceptación. General, Kids, eventos y ministerios son independientes. Frecuencia semanal/por publicación es ilustrativa.
4. En Privacidad marca lectura del aviso y comprueba que no activa correos ni imágenes. Autoriza uso interno de «Menor de ejemplo A», confirma el escenario de tutor y verifica que difusión pública permanece desactivada. Revoca ambas finalidades.
5. Solicita exportación o eliminación. Revisa el paso explicativo y crea un folio DEMO. No se exporta información personal ni se borra una cuenta: es una solicitud sin enviar.
6. Recarga. Todas esas decisiones se pierden. No uses datos reales.
7. Abre Plantillas de correo, filtra Shalom/Kids, busca por asunto o tipo, pagina, previsualiza y descarga HTML/texto/CSV de catálogo.

## Reglas funcionales

| Área | Comportamiento de la demo |
| --- | --- |
| Publicaciones | Texto, imagen de biblioteca y video tipográfico local. Título, mensaje, categoría, audiencia, ministerio, fechas, fijación y estado. Sin subida de archivos o URLs externas. |
| Categorías | Generales, Kids, Eventos, Ministerios. No modifican preferencias automáticamente. |
| Audiencias | Público, Congregantes, Familias, Voluntarios, Administración. Intersección con ministerio seleccionado; «Público» y «Todos» no restringen por ese eje. Son ejemplos, sin confidencialidad. |
| Orden | Fijados primero, después fecha inicial descendente; orden estable ante empate. |
| Vigencia | Días calendario de Ciudad de México, inicio y fin incluidos. Borrador/archivado nunca aparecen en público. Programado pasa a vigente según reloj de prueba, sin trabajo en segundo plano. |
| Programación | Requiere inicio futuro. Publicar ahora requiere fecha de prueba dentro del intervalo. Se rechaza fin anterior a inicio y título/mensaje en blanco. |
| Accesibilidad multimedia | Alt obligatorio en imagen, transcripción obligatoria en video. Clip con controles, WebVTT, sin sonido ni autoplay. |
| Estados | Vacío natural por filtros, vacío/carga/error seleccionables, reintento, formularios con errores vinculados al foco. |
| Consentimiento optativo | Desmarcado al inicio. Activar nuevos temas requiere confirmación explícita. Desactivar/revocar no la requiere. Se registra solo un ejemplo en memoria con versión DEMO. |
| Imágenes de menores | Uso interno y difusión separados. Ninguno depende de correos. Confirmación de tutor es un supuesto ficticio, no una verificación. No hay foto ni identidad real. |
| Aviso | Borrador versionado, lectura separada de aceptación, alcance y pendientes expresos. No afirma cumplimiento legal. |
| Solicitudes | Dos pasos, folio ficticio e indicación «Sin enviar». Ningún plazo o resultado real prometido. |

## Listados, filtros y exportaciones

Avisos y Administración tienen búsqueda, filtros, tamaño de página, anterior/siguiente, totales y CSV de **todos los resultados filtrados**, no solo de la página visible. Al filtrar se vuelve a la página 1; al reducir resultados se ajusta el límite. CSV público solo usa avisos visibles en la experiencia seleccionada. La galería de correo exporta metadatos de plantillas; nunca autorizaciones.

Las herramientas reutilizables se añaden a Eventos, Proyectos, Mi familia, Personas y familias, Mis aportaciones y tablas `.data-table` de otras vistas. Kids se excluye de esta mejora de listados. La caja y el menú de cafetería conservan sus filtros y búsqueda operativos existentes; no se pagina el menú durante la captura de un pedido.

Los CSV usan UTF-8 con BOM, CRLF y comillas escapadas. Se antepone apóstrofo a celdas que pueden interpretarse como fórmulas (`=`, `+`, `-`, `@`, incluso tras espacios/controles). Esto no constituye una solución de exportación segura para datos de producción. No se exportan scripts, tokens o decisiones de privacidad. En los listados antiguos de tarjetas, el CSV exporta el contenido visible como texto; las tablas conservan columnas y los avisos tienen esquema estructurado.

## Diseño y medios

Inter con Arial de respaldo. Noche por defecto y Crema opcional. Cobre #c8956c con texto #1a1a1a en botones; texto cobre #82552f en claro y #d9ad86 en oscuro. Superficies de la guía, bordes sin sombras, tarjetas de 28 px, espaciados 16/24/32. Los tonos de error distinguen una validación operativa y no amplían la paleta de marca.

La fotografía de café es **referencia de demo** con licencia de Pexels, sin personas. No representa a la iglesia. Es una excepción explícita de biblioteca de prueba frente a la preferencia de la guía por fotos de Shalom. Sustituirla por fotografía de la comunidad con autorización antes de producción. No se utilizaron fotos de menores. Ver [licencias](../assets/LICENCIAS.md). El video de seis segundos se generó como tipografía local, no como registro de un evento. Logo blanco/negro suministrado por el usuario, sin recolorear.

## Arquitectura para producción · pendiente

Separar frontend, API autenticada y base de datos. Ningún rol, preferencia, estado, fecha o elegibilidad enviado por el navegador puede ser la fuente de autorización. Aplicar consultas y controles de audiencia en servidor y en las URLs de medios; no descargar contenido privado y ocultarlo con CSS.

Modelo propuesto:

- `communication`: id, versión, autor, formato, cuerpo, categoría, audiencia/ministerio, estado, inicio/fin en zona IANA y timestamps, fijación, revisión y referencias de medios.
- `media`: propietario, finalidad, licencia/permiso, alt/transcripción/subtítulos, estado de revisión, caducidad y ubicación no pública cuando proceda. Analizar tipos, tamaño y contenido antes de publicar.
- `communication_preference`: persona, canal, finalidad/tema, frecuencia, estado y versión del aviso. Consultar al encolar **y antes de enviar**.
- `consent_event`: actor verificado, titular, finalidad, canal, texto/versión presentado, decisión afirmativa o revocación, fecha de servidor, origen y evidencia mínima necesaria. Evidencia protegida con acceso y retención definidos; no tratar la bitácora ficticia como auditoría.
- `minor_image_authorization`: representante y facultades verificadas, menor mediante ID protegido, finalidad separada, actividad, canales, vigencia, texto/versión y revocación. No confundir autorización interna, publicación y marketing.
- `privacy_request`: tipo, identidad/facultades verificadas, alcance, estado, responsable, fechas y resultado. Exportar de forma autenticada y temporal; eliminar según revisión de dependencias y conservación aplicable, sin prometer borrado absoluto.
- `delivery`: idempotency key, mensaje/plantilla/versión, categoría transaccional o marketing, destinatario autorizado, proveedor, eventos de entrega/rebote/baja; sin almacenar secretos en el cliente.

### Secuencia de implementación

| Fase | Trabajo | Criterio para avanzar |
| --- | --- | --- |
| 1 · Definir operación | Responsable, finalidades, menores, representantes, medios, retención, roles de edición/aprobación/finanzas y proceso de derechos; revisión profesional del aviso. | Decisiones documentadas y textos aprobados para esa operación, sin reclamar certificación. |
| 2 · Backend | Identidad, roles verificados, segmentación server side, almacenamiento seguro, migraciones, preferencias por finalidad y auditoría protegida. | Pruebas negativas de permisos y separación de familias/ministerios; ningún dato real en GitHub público. |
| 3 · Publicación | Flujo borrador → revisión → publicación; trabajos idempotentes de programación en America/Mexico_City; invalidación al vencer; permisos de medios. | Programación/expiración reproducibles y enlaces privados protegidos. |
| 4 · Email | Proveedor con secretos en servidor, SPF/DKIM/DMARC, colas/reintentos/idempotencia, rebotes y supresión. Plantillas multipart HTML/texto. | Entregabilidad probada en entorno de prueba; marketing respeta preferencias y revocaciones antes del envío. |
| 5 · Baja | Enlace de un clic mediante token opaco, sin login obligatorio, sin datos personales en URL; endpoint idempotente, enlaces y cabeceras List-Unsubscribe/List-Unsubscribe-Post según proveedor. | Revocar afecta futuras colas y envíos; prueba de carreras, replay y baja por tema/global. Confirmar formato con documentación vigente del proveedor. |
| 6 · Privacidad | Canal real, verificación proporcional, exportación segura temporal, revisión de eliminación/conservación, seguimiento y evidencias. | Pruebas de identidad, revisión y respuesta sin filtrar información a terceros. |
| 7 · Piloto | Revisiones con familias/coordinación, NVDA/VoiceOver, Safari/iOS/Android y correo Gmail/Outlook/Apple Mail. | Criterios de aceptación y seguimiento de fallos definidos. Integración Kids solo como proyecto separado autorizado. |

**Transaccional vs marketing:** un recibo por una compra solicitada, recuperación de acceso o confirmación de cambio no se condiciona al consentimiento promocional. No añadir promociones a esas plantillas. Recordatorios Kids operativos requieren una asignación real y la finalidad definida; boletines e invitaciones Kids son optativos. La clasificación se valida por contenido y contexto, no solo por el nombre de la plantilla.

## Publicación y reversión

Publicar únicamente este prototipo público revisado, con ejemplos ficticios, fuentes y medios licenciados. Excluir `node_modules`, navegadores de pruebas, capturas temporales, archivos privados, la guía fuente y HTML adjunto original. Verificar `origin/main` contra la base antes del push; si cambió, integrar y repetir las pruebas afectadas. No hacer force-push.

Para revertir, crear un commit de reversión del cambio v0.6 en la misma rama pública y dejar que Pages vuelva a desplegar; no reescribir el historial compartido. La app estática no migra registros productivos ni consentimientos. Los ejemplos v0.5 continúan con su clave local anterior.
