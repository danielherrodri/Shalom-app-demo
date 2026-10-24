# Reuniones del pastor · propuesta v0.1

Objetivo: preparar reuniones de coordinación con agenda y documentos, tomar notas y dar seguimiento a acuerdos. Propuesta visual disponible en `design/kids-paneles.html#reuniones`, con el tema oscuro y cobre de Shalom.

## Recorrido

1. Preparar: nombre, objetivo, fecha, hora, lugar, participantes previstos, agenda por tema y minutos, documentos de apoyo.
2. Durante la reunión: agenda de consulta, notas compartibles y notas personales separadas, estado en curso.
3. Acuerdos y minuta: acción, responsable, fecha compromiso y estado (pendiente/en curso/completado). Vista previa y descarga de borrador TXT para revisión del pastor.

La minuta no confirma asistencia y excluye las notas personales. Enumera referencias a documentos; no incorpora sus archivos. No se envían invitaciones, minutas o recordatorios automáticamente.

## Alcance del boceto

Solo datos ficticios, estado en memoria que se pierde al recargar, sin autenticación ni almacenamiento de servidor. Los archivos elegidos solo aportan nombre y tamaño; no se leen ni suben. La vista previa documental muestra únicamente un texto sintético incluido en el código. No usar documentos o notas reales en este sitio público. La separación visual de notas no representa protección de acceso.

## Integración propuesta

- Reunión: organizador, título, objetivo, fecha/hora con zona, lugar, estado y participantes; diferenciar invitados de asistentes confirmados.
- Tema de agenda: reunión, orden, asunto, duración y responsable opcional.
- Documento: reunión, autor, metadatos, ubicación privada y versión; validar tipo/tamaño y analizar contenido en servidor antes de permitir su descarga.
- Nota: reunión, autor y visibilidad. Las notas personales solo serán accesibles a su autor; compartir una reunión no concede acceso a ellas.
- Acuerdo: reunión, acción, responsable, vencimiento, estado e historial de cambios.
- Minuta: versión revisada, aprobador, fecha y destinatarios autorizados. Generar desde campos permitidos en servidor y excluir las notas personales por diseño.

El pastor/organizador administra reuniones y aprueba minutas. Una persona de apoyo con permiso puede preparar agenda y notas compartidas. Los participantes solo acceden a reuniones y documentos expresamente compartidos con ellos. Los permisos deben validarse por registro en servidor, incluidos adjuntos y exportaciones. No mezclar estas notas con expedientes de consejería ni incidencias de menores.

## Primera versión real

Persistencia, autenticación, permisos por reunión y autor, guardado de borradores con aviso de errores/conflictos, almacenamiento privado de adjuntos y minuta versionada. Después: invitaciones, recordatorios optativos y vista de acuerdos por responsable. Definir con el pastor quién prepara, quién participa, quién aprueba y cuánto tiempo se conservan reuniones y documentos antes de habilitar uso real.

