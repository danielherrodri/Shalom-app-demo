# Cuentas, acceso con Google y foto de perfil · definición funcional v0.1

**Fecha:** 28 de octubre de 2026 · **Estado:** borrador para decidir antes del lanzamiento. Nada de esto está implementado: la demo pública sigue usando sesiones de ejemplo y el backend Django solo tiene acceso por contraseña para desarrollo (`LOCAL_PASSWORD_LOGIN`). Complementa la sección «Autenticación y sesiones» del [ADR-001](arquitectura-seguridad-v08.md).

## 1. Objetivo

Que cualquier persona de la iglesia entre a Shalom con su cuenta de Google, sin crear otra contraseña, y que su foto de Google aparezca en su perfil **si ella lo elige**. Google solo dice *quién es* la persona; **Shalom decide qué puede hacer**.

## 2. Principios

1. **Google identifica; Shalom autoriza.** Los perfiles (voluntario, docente, coordinación, administración, caja) se asignan dentro de Shalom por administración. Nada de Google concede permisos.
2. **No se vincula por coincidencia de correo.** Si la persona ya existe en Shalom (familia de Kids, voluntario), se vincula con una invitación de un solo uso o con coordinación en persona.
3. **Pedir lo mínimo a Google:** `openid`, `email` y `profile`. Nunca contactos, Drive, Gmail ni Calendar en el inicio de sesión. (La conexión de Calendar de acompañantes es una autorización aparte; ver [acompañamiento](acompanamiento-google-calendar-v01.md).)
4. **La foto es opcional y sin premarcar.** Sin foto se muestra la inicial, como hoy.
5. **Los niños no tienen cuenta.** Sus fotos siguen el consentimiento de imagen de Kids, separado de la cuenta del adulto.

## 3. Perfiles

| Perfil | Cómo se obtiene | Verificación en dos pasos |
|---|---|---|
| Congregante (por defecto) | Al entrar por primera vez con Google | Opcional |
| Familia / tutor | Coordinación Kids lo vincula a sus hijos (invitación o en recepción) | Opcional |
| Voluntario · Caja · Preparación | Administración lo asigna al equipo y turno | Opcional |
| Docente | Coordinación Kids lo asigna a su grupo | Recomendada |
| Coordinación Kids · Administración · Finanzas | Administración, con segunda persona que confirma | **Obligatoria** |

Una persona puede tener varios perfiles (p. ej., familia y voluntario). El selector «Sesión de ejemplo» de la demo desaparece en producción: el servidor entrega los perfiles reales.

## 4. Recorridos

### 4.1 Primer ingreso (persona nueva)
1. Inicio de sesión → **Continuar con Google**.
2. Google pide permiso para compartir nombre, correo y foto. Si cancela → vuelve a Shalom con «No se completó el inicio de sesión. Puedes intentarlo de nuevo».
3. Shalom recibe la identidad verificada. Si el correo no está verificado por Google → no se crea la cuenta.
4. Pantalla **Completa tu perfil** (una sola vez):
   - Nombre visible, prellenado con el de Google y editable.
   - Casilla «Usar mi foto de Google», **sin marcar**, con vista previa.
   - Aviso de privacidad: aceptación obligatoria y separada.
   - Avisos optativos (Generales, Jóvenes, Kids…): desactivados por defecto, como en Preferencias.
5. Entra a Inicio como **Congregante**.

### 4.2 Persona que ya existe en Shalom
1. Coordinación o administración envía una **invitación** a [correo] (enlace de un solo uso, vence en 7 días).
2. Al abrirla, la persona entra con Google; la cuenta de Google queda vinculada al registro existente y conserva sus perfiles.
3. Invitación vencida o ya usada → «Esta invitación ya no es válida. Pide una nueva a coordinación». El mensaje no revela si la cuenta existe.
4. Alternativa presencial: en recepción de Kids, coordinación muestra un código QR de vinculación de un solo uso.

### 4.3 Ingresos siguientes
- Entra directo. Si activó la foto, se actualiza cuando cambia en Google; el nombre visible **no** se sobrescribe.
- La sesión cierra por inactividad y por tiempo máximo (valores a fijar con seguridad); administración vuelve a autenticarse para acciones sensibles.

### 4.4 Mi perfil → Cuenta
- Foto: activar/desactivar «Usar mi foto de Google». Al desactivar se borra la copia.
- «Cuenta de Google vinculada: [correo]», con **Desvincular** (solo si queda otra forma de entrar).
- **Cerrar sesión en todos los dispositivos.**
- **Eliminar mi cuenta**: solicitud que revisa administración, porque puede haber asistencia de Kids, aportaciones o inscripciones que deben conservarse por obligación.

### 4.5 Errores que hay que diseñar
Inicio cancelado · correo no verificado · cuenta de Google ya vinculada a otra persona · invitación vencida · cuenta suspendida («Tu acceso está en revisión; contacta a [correo]») · Google no responde («No pudimos conectar con Google. Intenta de nuevo»).

## 5. Foto de perfil

- **Origen:** dato `picture` de Google, solo si la casilla está marcada.
- **Almacenamiento:** Shalom guarda una **copia reducida** (256 × 256) en su almacenamiento cifrado, en lugar de enlazar la imagen de Google. Así la foto no depende de Google, no revela a Google quién mira los perfiles y se borra cuando la persona la desactiva o elimina su cuenta.
- **Dónde se ve:** Mi perfil, la tarjeta de «Más» y la barra superior, para la propia persona. Que la vean otras personas (p. ej., recepción de Kids al validar al adulto que recoge) es un **uso distinto** y requiere su propio consentimiento (ver decisiones).
- **Sin foto:** círculo con la inicial (comportamiento actual).

## 6. Datos que se guardan

| Dato | Para qué | Notas |
|---|---|---|
| Emisor + identificador de Google (`sub`) | Reconocer la cuenta en cada ingreso | Llave de vinculación; **no** el correo |
| Correo verificado | Avisos de cuenta e invitaciones | Puede cambiar; no se usa como identificador |
| Nombre visible | Mostrarlo en la app | Editable por la persona |
| Foto (copia) | Mostrarla si la persona lo aceptó | Se borra al desactivarla |
| Aceptación del aviso de privacidad | Evidencia de consentimiento | Fecha y versión del aviso |

No se guardan tokens de Google: el inicio de sesión no necesita acceso posterior a su cuenta.

## 7. Requisitos técnicos (resumen)

- Flujo OpenID Connect **Authorization Code + PKCE**, `state` y `nonce`; validar emisor, audiencia, firma y `email_verified`. URIs de retorno exactas por entorno.
- Biblioteca mantenida en Django (propuesta: `django-allauth` con proveedor Google). No escribir el protocolo a mano.
- Sesión de servidor en cookie `Secure`, `HttpOnly`; nada de tokens en `localStorage`.
- ID y secreto de cliente en el gestor de secretos del servidor. **Nunca** en el repositorio ni en variables `VITE_*`.
- Registro de auditoría: alta, vinculación, cambio de perfiles, desvinculación y eliminación.

## 8. Lo que debe preparar la iglesia antes del lanzamiento

1. Proyecto en Google Cloud con la **pantalla de consentimiento OAuth** (nombre «Shalom», logotipo, correo de soporte).
2. Dominio propio de la app y URLs públicas del **aviso de privacidad** y **términos**. El aviso actual es solo una demo (`aviso-privacidad-DEMO.md`) y debe sustituirse por uno revisado.
3. Credenciales de cliente web por entorno (pruebas y producción), entregadas al gestor de secretos, no por chat ni correo.
4. Definir quién administra los perfiles al inicio (al menos dos personas).

## 9. Criterios de aceptación

- Una persona nueva entra con Google y queda como Congregante, sin ver datos de otras personas.
- Una persona con invitación queda vinculada a su registro existente; con el mismo correo pero **sin** invitación, no se vincula sola.
- La foto solo aparece si se marcó la casilla; al desactivarla desaparece en la app y se borra la copia.
- Ningún perfil con permisos se obtiene desde Google; administración necesita verificación en dos pasos para entrar.
- Cancelar en Google, correo no verificado o invitación vencida muestran su mensaje sin revelar si una cuenta existe.
- Pruebas automatizadas del flujo con un proveedor simulado y datos ficticios; sin cuentas reales en pruebas.

## 10. Decisiones abiertas para el lanzamiento

| # | Pregunta | Recomendación |
|---|---|---|
| D1 | ¿Solo Google o también otra forma de entrar? | Google + enlace por correo (sin contraseña) para quien no tenga o no quiera usar Google |
| D2 | ¿Quién puede crear cuenta? | Cualquiera, como Congregante; los perfiles con permisos siempre por invitación |
| D3 | ¿Edad mínima para tener cuenta? | 18 años en el lanzamiento; jóvenes de 13 a 17 en una fase posterior con autorización de tutor |
| D4 | ¿Otras personas ven la foto? | En el lanzamiento, solo la propia persona. La foto para recoger en Kids, como consentimiento aparte más adelante |
| D5 | ¿Cómo se exige verificación en dos pasos a administración? | Google Workspace de la iglesia para cuentas de equipo, o verificación propia de Shalom para administración |
