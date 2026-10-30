# Plan de la versión 1 · Administración, correos y Shalom Kids

**Fecha:** 28 de octubre de 2026 · **Estado:** alcance aceptado; fases 1 y 2 cerradas en código, con su interfaz React. Infraestructura lista en código y scripts; falta que la iglesia cree los recursos de staging. Coordinación Kids (solo datos de adultos) implementada con su interfaz.

## Alcance

La primera versión real de Shalom incluye **administración de cuentas y perfiles, correos, asistencia y todo el universo de Shalom Kids**. Eventos, Avisos generales, Tu opinión, Cafetería, aportaciones y acompañamiento quedan para versiones posteriores; sus mockups se conservan en la demo.

El sistema vigente de Kids **sigue siendo la fuente de verdad** hasta un corte aprobado, conciliado y reversible, sin doble escritura (decisión del 23 oct 2026).

## Fases

> **Actualización 28 oct 2026:** la [propuesta de arquitectura de producción](arquitectura-produccion-v01.md) agrega dos fases: **Infraestructura** (Cloud Run, Cloud SQL, cola de correo), después de Acceso, y **Libros y pagos** (Mercado Pago Checkout Pro), después de Operación Kids. La numeración vigente está en su sección 8.

Cada fase es un PR con pruebas automatizadas, datos ficticios y el control de seguridad aprobado.

| Fase | Contenido | Depende del abogado |
|---|---|---|
| **1. Administración** | Perfiles que solo asigna administración; Coordinación Kids, Administración y Finanzas con confirmación de una segunda persona; invitaciones de un solo uso por 7 días (solo se guarda su verificador); registro de envíos de correo sin cuerpo; bitácora; cuenta inicial por comando | No |
| **2. Acceso** | Enlace por correo de 15 minutos; Google OpenID Connect apagado hasta tener credenciales; «Completa tu perfil» con consentimientos versionados (aviso y dato sensible); verificación en dos pasos (TOTP) para perfiles privilegiados; cierre de sesión en todos los dispositivos | Textos finales, no el código |
| **3. Datos Kids** | Familias, tutores, niños y grupos por edad; alergias y notas médicas cifradas, visibles solo para quien atiende al niño; personas autorizadas para recoger; consentimiento de imagen; registro de familias | **Sí**: consentimiento del tutor para datos de salud |
| **4. Operación Kids** | Reservas; Recepción (entrada con gafete o QR, gafete temporal, lecturas en cola); Mi grupo hoy; recogida segura con código; Seguimiento de incidencias; Mis hijos; avisos a familias por correo | No (usa la Fase 3) |
| **5. Coordinación Kids** | Rol de clases, Maestros, Lecciones, Mi agenda, Eventos y Libros Kids, Plan de cocina, Buzón, Decisiones abiertas, Configuración y reportes de asistencia | No |
| **6. Interfaz React** | Las vistas de las fases 2 a 5 sobre el armazón de `frontend/`, con las pruebas de accesibilidad de la demo. Avanza en paralelo desde la Fase 2 | No |
| **7. Piloto y corte** | Staging; piloto con un grupo de Kids en paralelo al sistema vigente; migración conciliada de datos (la ejecuta la iglesia, nunca por el repositorio); corte con plan de regreso | **Sí**: aviso publicado y contratos |

## Compuertas legales

Kids trata datos de **menores** y de **salud** (alergias, medicamentos, notas médicas), además de la afiliación religiosa. Antes de la Fase 3:

1. **Evaluación de impacto de Kids**, partiendo de la [evaluación de cuentas](legal/pia-cuentas-google-v01.md). **Borrador listo para el abogado:** [pia-kids-v01](legal/pia-kids-v01.md), con 14 preguntas (K1–K14). Todas las preguntas para el abogado, por prioridad: [preguntas-abogado](legal/preguntas-abogado.md).
2. El abogado confirma la forma del consentimiento del tutor para datos sensibles de salud y para la imagen del menor.
3. Aviso de privacidad con un apartado de Kids.

Antes de la Fase 7: aviso publicado, persona de datos personales designada y contratos de encargo con el hosting y el proveedor de correo. Ver [triaje](legal/triage-cuentas-google-v01.md).

## Lo que debe preparar la iglesia

- **Proveedor de correo** con dominio verificado (Fase 2).
- **Hosting** para Django y PostgreSQL, con región y contrato de encargado (Fase 7, conviene decidirlo antes).
- **Proyecto de Google Cloud** con la pantalla de consentimiento (Fase 2; el enlace por correo funciona sin él).
- **Dos personas de administración** para la puesta en marcha.

## Fase 1 · Uso

- Primera cuenta de administración: `python backend/manage.py bootstrap_admin <usuario>`. Solo funciona mientras no exista ninguna; esa persona invita a la segunda.
- API (sesión y CSRF): `admin/accounts/`, `admin/grants/` (asignar, `confirm/`, `revoke/`), `admin/invitations/` (crear, `revoke/`) e `invitations/accept/`. `auth/me/` devuelve los perfiles vigentes.
- Fuera de desarrollo, las rutas de administración solo se abren en una sesión con la verificación en dos pasos hecha (Fase 2).
- El perfil Joven no se puede asignar hasta que exista el consentimiento del tutor (Fase 3).
- Correo: en desarrollo y pruebas los mensajes quedan en memoria; en producción usa SMTP con TLS y credenciales de variables de entorno. El enlace lleva el token en el fragmento (`#`) para que no llegue a registros del servidor.

## Fase 2 · Uso

- **Textos de consentimiento:** `python backend/manage.py publish_consent_text <aviso|dato_sensible> <versión> <archivo.txt>`. Cada versión es inmutable; sin los dos textos publicados, el registro responde «todavía no está disponible». Los textos de `docs/legal/` son borradores: se publican solo después de la revisión del abogado.
- **Entrar por correo:** `auth/link/` envía un enlace de un solo uso que vence en 15 minutos (`/entrar#<token>`; solo se guarda su verificador). Responde lo mismo exista o no la cuenta. Límite: 3 enlaces por correo y 10 solicitudes por origen cada 15 minutos. `auth/link/consume/` abre la sesión o, si el correo es nuevo, una ventana de registro de 30 minutos.
- **Completa tu perfil:** `auth/consents/` muestra las versiones vigentes; `auth/profile/` crea la cuenta con nombre, declaración de mayoría de edad y los dos consentimientos con su versión. La fecha de nacimiento solo se usa para calcular la edad y no se guarda; con menos de 18 años no se guarda nada y se indica que el tutor la solicite a administración. La cuenta nueva no tiene perfiles: los asigna administración.
- **Verificación en dos pasos (TOTP):** `auth/mfa/setup/` (el secreto se muestra una vez y se guarda cifrado con `SHALOM_FIELD_KEY`), `auth/mfa/confirm/` y `auth/mfa/verify/`. Cada código se acepta una sola vez; tras 5 fallos se bloquea 15 minutos. `auth/me/` indica `mfaPending` y `mfaEnrolled`. Si alguien pierde su dispositivo, otra persona de administración, en persona, usa `admin/accounts/<id>/mfa-reset/`, que también cierra sus sesiones.
- **Sesiones:** dispositivo personal 30 minutos de inactividad y 12 horas absolutas; el acceso local de desarrollo (equipo compartido de Kids) conserva 5 minutos y 8 horas. `auth/logout-everywhere/` cierra todas las sesiones de la cuenta; las sesiones sin versión vigente se cierran.
- **Google OpenID Connect:** apagado (`GOOGLE_OIDC_ENABLED = False`; `auth/providers/` lo informa) hasta tener el proyecto de Google Cloud y sus credenciales.
- **Límite por origen compartido (30 oct 2026):** el contador vive en PostgreSQL (`RateCounter`) con un incremento atómico (`INSERT … ON CONFLICT`), así que todas las instancias de Cloud Run cuentan juntas sin pagar Memorystore. Solo se guarda el hash del origen; IPv6 se agrupa por /64 y los valores mal formados comparten un mismo contador. `limits.purge_expired()` borra las ventanas vencidas; la tarea diaria de la fase de Infraestructura lo llamará.
- **IP del cliente detrás del balanceador:** `SHALOM_CLIENT_IP_HEADER` (por ejemplo `X-Forwarded-For`) y `SHALOM_TRUSTED_PROXY_COUNT` (cuántos proxies agregan su salto al encabezado; se toma la entrada N contando desde la derecha). Sin configurar se usa `REMOTE_ADDR` y un `X-Forwarded-For` falsificado se ignora; si el encabezado trae menos saltos de los esperados, también. Valor esperado: 1 con Cloud Run directo y 2 con Firebase Hosting delante, **por confirmar en staging**. Riesgo conocido: quien llame directo a la URL `run.app` puede rotar el valor más a la izquierda y eludir el límite por origen (el límite por correo sigue vigente). Revisado en Infraestructura: con Firebase Hosting delante no se puede cerrar `run.app`; la solución es un balanceador ([staging](infraestructura-staging.md)).
- **`CSRF_TRUSTED_ORIGINS`:** siempre incluye el origen de `SHALOM_PUBLIC_APP_URL`; `DJANGO_CSRF_TRUSTED_ORIGINS` agrega otros (separados por coma). Fuera de desarrollo cada uno debe ser `https://host[:puerto]`, sin comodines, rutas ni usuario; si no, Django no arranca. Detrás de Firebase Hosting el `Origin` del navegador es el dominio público y no el host que ve Django, por eso hace falta.

## Infraestructura · Uso

Detalle, pasos y fuentes en [infraestructura de staging](infraestructura-staging.md).

- **Región:** Firebase Hosting no reenvía a Cloud Run en Querétaro y Cloud Scheduler no existe ahí; staging va completo en `us-central1`. Producción: `us-central1` igual, o Querétaro con balanceador en lugar de Hosting (decisión de la iglesia).
- **Contenedor:** `backend/Dockerfile` (Python 3.13 slim fijado por digest, usuario 10001, Gunicorn sin registro de accesos). Migraciones en un Cloud Run Job, antes de cada despliegue. `backend/.env.example` lista las variables, sin valores reales.
- **Settings de producción:** cookie `__session` y CSRF dentro de la sesión (Hosting borra las demás cookies), `SECURE_PROXY_SSL_HEADER`, Cloud SQL por socket `/cloudsql/` y TLS verificado por TCP, registros JSON con lista cerrada de campos y sin mensajes de excepción.
- **Cola de correo:** intento inmediato. Los enlaces de acceso no se reintentan ni guardan cuerpo. Las invitaciones guardan el cuerpo cifrado mientras están pendientes y se reintentan a los 5, 10, 20 y 40 minutos; el cuerpo se borra al enviar, al agotar intentos o en 24 h, y revocar la invitación cancela el envío.
- **Endpoints internos:** `internal/email/drain/` y `internal/daily/` (contadores vencidos y cuerpos fuera de ventana) solo con token OIDC de Google para la cuenta `SHALOM_SCHEDULER_SERVICE_ACCOUNT` y la audiencia `SHALOM_SCHEDULER_AUDIENCE`. Verificación con PyJWT y las llaves públicas de Google.
- **Scripts:** `infra/staging/01…07`, en simulación por omisión (`APLICAR=1` ejecuta). Secretos generados o leídos del teclado directo a Secret Manager.
- **CI:** `deploy-staging.yml` despliega tras «Security and backend» en `main`, con Workload Identity Federation y el entorno protegido `staging`; sin variables no corre. `security.yml` agrega la construcción de la imagen con `check --deploy`, la simulación de los scripts y `tests/hosting-staging.cjs`.
- **Pendiente:** crear los recursos, confirmar en staging el número de proxies y el host que envía Hosting, procedimiento de rotación de la llave de campos y retención de `OutboundEmail` y `LoginLink`.

## Coordinación Kids · Uso (solo datos de adultos)

El sistema vigente (Apps Script y Sheets) sigue siendo la fuente de verdad: este módulo no lo lee ni escribe en él, no hay doble captura ni sincronización. Se usa con datos ficticios en desarrollo y staging, y en el piloto según la fase de corte.

- **Perfiles:** Coordinación Kids (privilegiado: lo confirma otra persona de administración y exige el segundo factor) administra todo; Docente, Voluntario y Preparación forman el equipo Kids. Administración, por sí sola, no ve Coordinación Kids. Cada permiso se decide en el servidor por petición y por registro (`core/kids.py`).
- **Configuración** (`kids/groups/`, `kids/services/`): grupos con nombre, rango de edad (0 a 17) y docentes por clase; servicios con día, inicio y fin. No se borran, se desactivan. Ningún niño se registra aquí.
- **Rol de clases** (`kids/roster/`): fecha, servicio, grupo y docente. El servidor exige el perfil Docente vigente, un servicio de ese día de la semana, una fecha no pasada, que la persona no tenga otra clase que se traslape y que la clase no supere su cupo; bloquea a la docente y al grupo para que dos asignaciones simultáneas no rebasen el cupo. Consultas de 120 días como máximo.
- **Recordatorio:** la tarea diaria (`internal/daily/`) envía un correo por docente con sus clases de los próximos 2 días que no se le hayan recordado, por la cola con reintentos y al correo verificado de su cuenta. Si cambian la fecha o la docente, se vuelve a recordar.
- **Maestros** (`kids/team/`): equipo Kids con sus perfiles, número de clases próximas, siguiente fecha y grupos. Sin teléfonos ni correos. Para sumar a alguien, Administración invita con el perfil Docente.
- **Lecciones** (`kids/lessons/`): una por grupo y fecha, con unidad, título, página del manual, objetivo y materiales. Coordinación escribe; el equipo consulta.
- **Eventos Kids** (`kids/events/`, `kids/items/`): tareas y materiales con responsable del equipo, fecha límite, cantidad y recibidos. Asignar no equivale a aceptar: la persona acepta y luego completa en «Mi agenda»; si se reasigna, vuelve a quedar pendiente. Un evento archivado congela sus tareas.
- **Mi agenda docente** (`kids/agenda/`): solo las clases propias de las próximas 8 semanas con su lección, y las tareas propias pendientes.
- **Bitácora** (`kids/audit/`): cada alta, cambio, baja, aceptación y cierre queda en `AuditEvent` con quién y cuándo; Coordinación consulta los últimos 200.
- **Errores:** la API responde un solo mensaje legible por error de validación (`core/errors.py`).
- **Pruebas:** `core/tests_kids.py` (permisos por perfil, segundo factor, reglas del rol, cupo con asignaciones simultáneas, recordatorios, bitácora y que ningún nombre de niño aparezca en las respuestas) y `tests/coordinacion-react.cjs` (recorrido completo a 360 px con axe; corre en CI).
- **Fuera de alcance:** reportes de asistencia con nombres de niños y cualquier dato de menores (fase Datos Kids). **Pendiente:** permutas registradas por docentes, encargado(a) del día y que «Mi clase de hoy» use el rol en lugar de las asignaciones actuales (fase Operación Kids).

## Interfaz de las fases 1 y 2 (Fase 6, en curso)

- `frontend/` (React): «Entrar a Shalom» con enlace por correo, `/entrar#…` y `/invitacion#…` (el token sale de la barra de direcciones y del historial al abrir la página), «Completa tu perfil» con ambos consentimientos sin premarcar, verificación en dos pasos (alta con clave de configuración y código en cada sesión nueva), «Mi cuenta» con cierre en todos los dispositivos, Administración (perfiles, confirmaciones de otra persona, invitaciones y reinicio de la verificación) y la asistencia Kids existente.
- Los perfiles privilegiados no ven ninguna sección hasta verificar el segundo factor. La interfaz solo oculta; el servidor decide cada permiso.
- Desarrollo: `python backend/manage.py runserver` y `npm run dev --prefix frontend` (Vite reenvía `/api` conservando el host para la comprobación de origen de CSRF).
- Prueba de extremo a extremo con Django, PostgreSQL y Chromium: `node tests/acceso-react.cjs` con `PGDATABASE` terminada en `_e2e` (la vacía). Recorre menor de edad, enlace usado, alta adulta, cierre en todos los dispositivos, alta del segundo factor, asignación, invitación y confirmación por una segunda persona, con axe en cada pantalla. Corre en CI (`access-e2e`).
- **Código QR del segundo factor (30 oct 2026):** `auth/mfa/setup/` devuelve también `qr`, un SVG generado en el servidor con `segno` (sin servicios externos de imágenes) que codifica el mismo `otpauth://`. La interfaz solo lo muestra si es un `data:image/svg+xml`, dentro de `<img>` (no ejecuta scripts), con texto alternativo; se conservan la clave escrita y el enlace para el celular, y todo desaparece al confirmar. La prueba de extremo a extremo comprueba que se dibuja, pasa axe y desaparece.
