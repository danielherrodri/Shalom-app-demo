# Acompañamiento espiritual y Google Calendar · propuesta v0.1

## Experiencia de la persona

Desde Inicio: «Quiero conversar con alguien». Abrir Acompañamiento espiritual, elegir entre los dos pastores, la pastora y el equipo de personas maduras en la fe autorizadas por la iglesia. Ver presentación y horarios, escoger modalidad presencial o videollamada, revisar y solicitar. No exigir un motivo escrito. La solicitud permanece pendiente hasta la aceptación del acompañante. La persona puede consultar o cancelar sus solicitudes; reprogramar debe ofrecer otro horario con confirmación antes de liberar el anterior.

La demo incluye cinco perfiles ficticios, horarios de 30 minutos en noviembre de 2026, solicitudes en memoria, aceptación simulada y cancelación. El directorio no afirma que personas reales estén autorizadas ni que los horarios estén disponibles. No se envían solicitudes o mensajes. No se guardan registros al recargar. No introducir notas, nombres, documentos o motivos reales en el sitio público.

## Google Calendar disponible en el boceto

Después de confirmar de forma simulada, «Abrir borrador en Google Calendar · ejemplo» abre una plantilla de evento con título neutro, fechas UTC y zona America/Mexico_City. No contiene nombre del solicitante, motivo, notas, contactos o datos del acompañante. Google Calendar debe mostrar el borrador; el usuario decide si lo guarda. Esto no consulta disponibilidad, no crea automáticamente eventos ni sincroniza cancelaciones. Si se guarda, hay que quitar el evento por separado en Google Calendar. No se añaden invitados ni se generan enlaces Meet ficticios.

La conexión de Calendar disponible en el chat es distinta de una autorización OAuth de los acompañantes dentro de Shalom. No se deben copiar sus tokens o reutilizar el calendario personal conectado como calendario del ministerio. No se han creado eventos ni enviado invitaciones reales.

## Integración automática propuesta (pendiente)

Modelo inicial a validar: cada acompañante autoriza un calendario de citas y los calendarios cuya ocupación debe bloquear horarios. Alternativa: coordinación administra un calendario compartido, conservando control independiente de disponibilidad por acompañante. El calendario destino y el modelo operativo requieren definición antes de activar sincronización real.

1. Registrar una aplicación OAuth web de Shalom, dominio y URL de retorno HTTPS; cada acompañante autoriza su cuenta, elige calendario y franjas de atención. Mantener credenciales y refresh tokens cifrados solo en servidor y disponer de desconexión/revocación. Solicitar únicamente permisos necesarios para disponibilidad y eventos del calendario elegido.
2. El servidor combina ventanas de atención, zona horaria, duración y margen entre citas con FreeBusy. Mostrar solo horarios reservables, nunca títulos, asistentes o descripciones de eventos ajenos. Errores o acceso revocado significan «No se pudo consultar», no «Libre».
3. Al solicitar, validar identidad, acompañante habilitado, horario permitido y permisos. Usar retención temporal con vencimiento e idempotencia para evitar duplicados. La base de Shalom controla conflictos propios; FreeBusy es una consulta, no un bloqueo transaccional de Google.
4. Al aceptar, volver a consultar ocupación, validar el intervalo y crear un evento privado de título neutro. Google puede recibir cambios externos entre la consulta y creación: si se detecta conflicto, notificar y proponer nuevo horario. No garantizar exclusión de conflictos externos únicamente con FreeBusy.
5. Guardar calendar_id, event_id, versión/etag y estado de sincronización en servidor. Separar confirmación solicitada, pendiente de sincronización, confirmada y error para no afirmar que Google agendó si falló. Idempotencia y outbox con reintentos; una solicitud no se duplica por doble clic.
6. Cambiar o cancelar citas debe actualizar el evento existente y la solicitud, conservar trazabilidad y mostrar fallos de sincronización. Eventos cambiados desde Google requieren sincronización incremental; los canales push vencen y deben renovarse, con sincronización periódica de respaldo.
7. Los avisos e invitaciones requieren una preferencia explícita, destinatarios verificados y contenido mínimo. Un título privado no garantiza ocultación a delegados con permisos amplios ni al administrador del dominio. Evitar motivos y notas en título, descripción, URL, adjuntos y notificaciones.

## Datos y permisos

- Acompañante: cuenta, nombre de presentación autorizado, función, estado habilitado, modalidades y ventanas de atención. La iglesia define quién puede acompañar; el sistema no deduce madurez por edad, sexo, asistencia o aportaciones.
- Solicitud: persona, acompañante, inicio/fin, zona, modalidad, estado, vigencia y referencia de calendario. Sin campo de motivo obligatorio ni adjuntos en la primera versión.
- La persona solo consulta sus solicitudes; acompañantes solo las asignadas; coordinación, si tiene permiso, ve logística sin notas de conversación. Validar por registro en el servidor, también en búsquedas, exportaciones y eventos.
- La bitácora de acompañamiento debe estar separada de las reuniones administrativas y de datos de Kids. El historial del solicitante muestra fechas, acompañante y estado; no expone notas personales del acompañante.
- Notas personales: acceso exclusivamente a su autor; compartición deliberada de un resumen con consentimiento y permisos. Definir conservación y eliminación antes de uso real. Este directorio público es únicamente un boceto y no representa protección de acceso.

## Fuentes técnicas oficiales

- FreeBusy: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Creación de eventos: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- OAuth y permisos: https://developers.google.com/workspace/calendar/api/auth
- Sincronización incremental: https://developers.google.com/workspace/calendar/api/guides/sync
- Notificaciones de cambios: https://developers.google.com/workspace/calendar/api/guides/push

