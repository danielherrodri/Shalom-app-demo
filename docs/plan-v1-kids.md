# Plan de la versión 1 · Administración, correos y Shalom Kids

**Fecha:** 28 de octubre de 2026 · **Estado:** alcance aceptado; Fase 1 en código (backend).

## Alcance

La primera versión real de Shalom incluye **administración de cuentas y perfiles, correos, asistencia y todo el universo de Shalom Kids**. Eventos, Avisos generales, Tu opinión, Cafetería, aportaciones y acompañamiento quedan para versiones posteriores; sus mockups se conservan en la demo.

El sistema vigente de Kids **sigue siendo la fuente de verdad** hasta un corte aprobado, conciliado y reversible, sin doble escritura (decisión del 23 oct 2026).

## Fases

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

1. **Evaluación de impacto de Kids**, con `privacy-legal:pia-generation`, partiendo de la [evaluación de cuentas](legal/pia-cuentas-google-v01.md).
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
- Fuera de desarrollo, las rutas de administración quedan **cerradas** hasta que exista la verificación en dos pasos (Fase 2).
- El perfil Joven no se puede asignar hasta que exista el consentimiento del tutor (Fase 2).
- Correo: en desarrollo y pruebas los mensajes quedan en memoria; en producción usa SMTP con TLS y credenciales de variables de entorno. El enlace lleva el token en el fragmento (`#`) para que no llegue a registros del servidor.
