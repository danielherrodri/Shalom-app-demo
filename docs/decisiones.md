# Registro de decisiones

## 2026-10-23 · Arquitectura y seguridad de la aplicación futura

Estado: propuesta, sin backend ni controles productivos implementados. Modelo fijo de tablas/campos adaptado a Shalom; sin campos arbitrarios creados por usuarios. React/TypeScript/Tailwind/shadcn para web y Django REST Framework/PostgreSQL como API compartida con futuro móvil. Diseñar índices por consultas y en conjunto con cifrado. Incorporar identidad, sesiones, MFA, autorización por registro, CSRF, prevención de inyecciones, protección contra automatización y validaciones de secretos/datos en Git y CI. No es garantizable distinguir una llamada de interfaz de otra equivalente desde consola con las mismas credenciales; aplicar controles en servidor a ambas. Ver [ADR-001](arquitectura-seguridad-v08.md), con alternativas, criterios verificables y pendientes.

## 2026-10-23 · v0.7 · Exportación asíncrona

Estado: aceptado para prototipo; arquitectura productiva provisional.

Las exportaciones de información dejan de descargarse desde la app. Se solicitan en cola con filtros completos y entrega futura por correo verificado. Esta demo conserva solo metadatos en memoria y no genera archivos ni envía mensajes. Las plantillas HTML/TXT son entregables de diseño y mantienen su descarga. Los CSV directos descritos en v0.6 quedan supersedidos.

La simulación adopta lotes de 3 trabajos, una exportación, bloques de 100 filas y reparto alta/alta/media/baja. Cuota pausa globalmente el proveedor; máximo 3 intentos, caducidad, conciliación ante incertidumbre y revisión única de muertos. No se afirma procesamiento exactamente una vez: la propuesta exige idempotencia y conciliación.

Producción: API autorizada + outbox + colas separadas + workers + DLQ de aplicación, pendiente de validar proveedor y capacidad. Releases con CI, staging, gradualidad, rollback y payloads compatibles. Ver pipelines-releases-v07.md.

## 2026-10-23 · Piloto Kids

El sistema vigente sigue siendo fuente de verdad hasta un corte aprobado, conciliado y reversible. Sin doble escritura. La auditoría real es solo lectura; el inventario privado y sus pendientes no se publican con el prototipo. No se copiaron alumnos, docentes, correos, fotos ni códigos al repositorio.

## 2026-10-23 · Datos del usuario y cifrado

Estado: propuesta inicial. Cifrado administrado en servidor para datos personales, con protección de campo prioritaria en Kids, contactos y finanzas, llaves separadas y acceso mínimo. Contraseñas con hash adaptativo; códigos y tokens con verificador y límites propios. No persistir datos reales en almacenamiento del navegador por defecto. Cifrado extremo a extremo o modo sin conexión requiere una decisión separada. Ver [matriz de datos](cifrado-datos-v07.md). No se implementa criptografía ni se cambia el sistema vigente en el prototipo.

## 2026-10-28 · Cuentas con Google y foto de perfil

Estado: aceptado como definición funcional; sin implementación. Google (OpenID Connect) o enlace por correo sin contraseña. Google identifica y Shalom autoriza: administración asigna todos los perfiles y envía las invitaciones, sin vincular por coincidencia de correo. Cuenta propia desde 18 años; de 13 a 17 con consentimiento del tutor verificado y perfil Joven asignado por administración; menores de 13 sin cuenta. Foto de Google opcional, sin premarcar, copia reducida visible solo para la persona. Sin Google Workspace: verificación en dos pasos propia de Shalom (TOTP o llave de acceso) obligatoria para administración, coordinación Kids y finanzas. Pendiente: revisión legal del consentimiento de menores. Ver [definición](cuentas-google-v01.md).

## 2026-10-28 · Alcance de la versión 1: administración, correos y Shalom Kids

Estado: aceptado. La primera versión real incluye administración de cuentas y perfiles, correos, asistencia y todo Shalom Kids; los demás módulos quedan para después. Se construye por fases (administración → acceso → datos Kids → operación → coordinación → interfaz → piloto y corte), con evaluación de impacto de Kids y revisión del abogado antes de tratar datos de salud de menores. El sistema vigente sigue siendo la fuente de verdad hasta el corte. Fase 1 implementada en el backend: perfiles asignados solo por administración, confirmación de una segunda persona para perfiles privilegiados, invitaciones con verificador y registro de correos sin cuerpo. Ver [plan](plan-v1-kids.md).

## 2026-10-28 · Fase 2 · Acceso

Estado: implementado en el backend, sin interfaz. Enlace por correo de un solo uso (15 min) como único acceso fuera de desarrollo; Google OpenID Connect apagado hasta tener credenciales. Registro con consentimientos versionados e inmutables; de la fecha de nacimiento solo se conserva la declaración de mayoría de edad. TOTP con secreto cifrado, anti-reuso y bloqueo; las rutas de administración exigen la verificación en la sesión. Reinicio de MFA solo por otra persona de administración. «Cerrar sesión en todos los dispositivos» por versión de sesión. Los textos legales siguen pendientes de revisión del abogado. Ver [plan](plan-v1-kids.md).
