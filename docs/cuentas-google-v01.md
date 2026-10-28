# Cuentas, acceso con Google y foto de perfil · definición funcional v0.2

**Fecha:** 28 de octubre de 2026 · **Estado:** decisiones de alcance tomadas (sección 10); falta revisión legal del consentimiento de menores. Nada de esto está implementado: la demo pública sigue usando sesiones de ejemplo y el backend Django solo tiene acceso por contraseña para desarrollo (`LOCAL_PASSWORD_LOGIN`). Complementa la sección «Autenticación y sesiones» del [ADR-001](arquitectura-seguridad-v08.md).

## 1. Objetivo

Que cualquier persona de la iglesia entre a Shalom con su cuenta de Google (o con un enlace por correo si no usa Google), sin crear otra contraseña, y que su foto de Google aparezca en su perfil **si ella lo elige**. Google solo dice *quién es* la persona; **Shalom decide qué puede hacer**.

## 2. Principios

1. **Google identifica; Shalom autoriza.** Los perfiles (voluntario, docente, coordinación, administración, caja) se asignan dentro de Shalom por administración. Nada de Google concede permisos.
2. **No se vincula por coincidencia de correo.** Si la persona ya existe en Shalom (familia de Kids, voluntario), se vincula con una invitación de un solo uso o con coordinación en persona.
3. **Pedir lo mínimo a Google:** `openid`, `email` y `profile`. Nunca contactos, Drive, Gmail ni Calendar en el inicio de sesión. (La conexión de Calendar de acompañantes es una autorización aparte; ver [acompañamiento](acompanamiento-google-calendar-v01.md).)
4. **La foto es opcional y sin premarcar.** Sin foto se muestra la inicial, como hoy.
5. **Menores de 13 no tienen cuenta.** Sus fotos siguen el consentimiento de imagen de Kids, separado de la cuenta del adulto.
6. **Adolescentes de 13 a 17 solo con consentimiento de su madre, padre o tutor**, otorgado desde la cuenta verificada del tutor (sección 4.6).

## 3. Perfiles

| Perfil | Cómo se obtiene | Verificación en dos pasos |
|---|---|---|
| Congregante (por defecto, 18 años o más) | Al entrar por primera vez con Google o enlace por correo | Opcional |
| Joven (13 a 17 años) | Invitación de su tutor verificado (sección 4.6) | Opcional |
| Familia / tutor | Coordinación Kids lo vincula a sus hijos (invitación o en recepción) | Opcional |
| Voluntario · Caja · Preparación | Administración lo asigna al equipo y turno | Opcional |
| Docente | Coordinación Kids lo asigna a su grupo | Recomendada |
| Coordinación Kids · Administración · Finanzas | Administración, con segunda persona que confirma | **Obligatoria** |

Una persona puede tener varios perfiles (p. ej., familia y voluntario). El selector «Sesión de ejemplo» de la demo desaparece en producción: el servidor entrega los perfiles reales.

## 4. Recorridos

### 4.1 Primer ingreso (persona nueva)
1. Inicio de sesión → **Continuar con Google** o **Recibir un enlace por correo** (sin contraseña; el enlace es de un solo uso y vence en 15 minutos).
2. Google pide permiso para compartir nombre, correo y foto. Si cancela → vuelve a Shalom con «No se completó el inicio de sesión. Puedes intentarlo de nuevo».
3. Shalom recibe la identidad verificada. Si el correo no está verificado por Google → no se crea la cuenta.
4. Pantalla **Completa tu perfil** (una sola vez):
   - Nombre visible, prellenado con el de Google y editable.
   - Fecha de nacimiento. Si es menor de 18 → «Para crear tu cuenta necesitas que tu mamá, papá o tutor te invite desde Shalom» (sección 4.6) y no se crea la cuenta.
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

### 4.6 Adolescentes (13 a 17 años) con consentimiento del tutor
1. El tutor debe tener cuenta y estar **vinculado y verificado por coordinación** como familia del adolescente. Shalom no confía en lo que el adolescente diga sobre quién es su tutor.
2. Desde **Mi familia**, el tutor toca **Invitar a [nombre] a Shalom**. Ve qué podrá hacer el adolescente y qué datos se guardan, y acepta el consentimiento:
   - Cuenta del adolescente: obligatorio para continuar.
   - Foto de Google del adolescente: casilla aparte, sin marcar.
3. El adolescente abre la invitación (un solo uso, 7 días), entra con Google o con enlace por correo y completa su perfil. Su cuenta queda ligada a su registro familiar.
4. **Qué puede hacer un Joven:** ver Inicio, Eventos y Avisos (incluidos los de Jóvenes); inscribirse a eventos abiertos a su edad (el tutor recibe aviso); usar Pide y recoge; enviar Tu opinión.
5. **Qué no puede hacer:** aportaciones, perfiles de equipo con acceso a datos de otras personas (Kids, caja, administración) ni ver datos de otros integrantes de su familia.
6. **El tutor puede retirar el consentimiento** en cualquier momento desde Mi familia: la cuenta queda suspendida y la foto se borra.
7. **Al cumplir 18:** la cuenta pasa a Congregante, el tutor deja de administrarla y se pide al joven que revise su privacidad.
8. Se guarda evidencia del consentimiento: tutor, fecha, versión del aviso y opciones elegidas.

### 4.7 Errores que hay que diseñar
Inicio cancelado · correo no verificado · cuenta de Google ya vinculada a otra persona · invitación vencida · cuenta suspendida («Tu acceso está en revisión; contacta a [correo]») · Google no responde («No pudimos conectar con Google. Intenta de nuevo») · enlace por correo vencido o ya usado · menor de 18 sin invitación · consentimiento del tutor retirado («Tu cuenta está en pausa. Habla con tu mamá, papá o tutor»).

## 5. Foto de perfil

- **Origen:** dato `picture` de Google, solo si la casilla está marcada. En adolescentes, además, el tutor debe haberla autorizado. Quien entra con enlace por correo no tiene foto en el lanzamiento.
- **Almacenamiento:** Shalom guarda una **copia reducida** (256 × 256) en su almacenamiento cifrado, en lugar de enlazar la imagen de Google. Así la foto no depende de Google, no revela a Google quién mira los perfiles y se borra cuando la persona la desactiva o elimina su cuenta.
- **Dónde se ve:** Mi perfil, la tarjeta de «Más» y la barra superior, **solo para la propia persona**. Que la vean otras personas (p. ej., recepción de Kids al validar al adulto que recoge) es un **uso distinto**, fuera del lanzamiento, con consentimiento propio.
- **Sin foto:** círculo con la inicial (comportamiento actual).

## 6. Datos que se guardan

| Dato | Para qué | Notas |
|---|---|---|
| Emisor + identificador de Google (`sub`) | Reconocer la cuenta en cada ingreso | Llave de vinculación; **no** el correo |
| Correo verificado | Avisos de cuenta e invitaciones | Puede cambiar; no se usa como identificador |
| Nombre visible | Mostrarlo en la app | Editable por la persona |
| Foto (copia) | Mostrarla si la persona lo aceptó | Se borra al desactivarla |
| Fecha de nacimiento | Saber si necesita consentimiento del tutor y cuándo cumple 18 | Solo visible para la persona y administración |
| Aceptación del aviso de privacidad | Evidencia de consentimiento | Fecha y versión del aviso |
| Consentimiento del tutor (adolescentes) | Evidencia de autorización | Tutor, fecha, versión y opciones; se conserva aunque se retire |

No se guardan tokens de Google: el inicio de sesión no necesita acceso posterior a su cuenta. Del enlace por correo solo se guarda su verificador, nunca el enlace.

## 7. Requisitos técnicos (resumen)

- Flujo OpenID Connect **Authorization Code + PKCE**, `state` y `nonce`; validar emisor, audiencia, firma y `email_verified`. URIs de retorno exactas por entorno.
- Biblioteca mantenida en Django (propuesta: `django-allauth` con proveedor Google). No escribir el protocolo a mano.
- Sesión de servidor en cookie `Secure`, `HttpOnly`; nada de tokens en `localStorage`.
- ID y secreto de cliente en el gestor de secretos del servidor. **Nunca** en el repositorio ni en variables `VITE_*`.
- Enlace por correo: token aleatorio de un solo uso, 15 minutos, verificador almacenado, límite de solicitudes por correo y origen, y mensaje igual exista o no la cuenta.
- Registro de auditoría: alta, vinculación, cambio de perfiles, consentimientos de tutor (otorgado y retirado), desvinculación y eliminación.

## 8. Lo que debe preparar la iglesia antes del lanzamiento

1. Proyecto en Google Cloud con la **pantalla de consentimiento OAuth** (nombre «Shalom», logotipo, correo de soporte).
2. Dominio propio de la app y URLs públicas del **aviso de privacidad** y **términos**. El aviso actual es solo una demo (`aviso-privacidad-DEMO.md`) y debe sustituirse por uno revisado, **con un apartado para adolescentes y el consentimiento de sus tutores revisado por un profesional legal**.
3. Proveedor de correo para enlaces de acceso e invitaciones (dominio verificado).
4. Credenciales de cliente web por entorno (pruebas y producción), entregadas al gestor de secretos, no por chat ni correo.
5. Definir quién administra los perfiles al inicio (al menos dos personas).
6. Confirmar si la iglesia tiene **Google Workspace** para las cuentas del equipo (decisión D5).

## 9. Criterios de aceptación

- Una persona nueva entra con Google y queda como Congregante, sin ver datos de otras personas.
- Una persona con invitación queda vinculada a su registro existente; con el mismo correo pero **sin** invitación, no se vincula sola.
- La foto solo aparece si se marcó la casilla; al desactivarla desaparece en la app y se borra la copia.
- Ningún perfil con permisos se obtiene desde Google; administración necesita verificación en dos pasos para entrar.
- Cancelar en Google, correo no verificado o invitación vencida muestran su mensaje sin revelar si una cuenta existe.
- Quien declara menos de 18 años sin invitación de un tutor no obtiene cuenta.
- Un adolescente invitado solo ve lo permitido para Joven; si el tutor retira el consentimiento, la cuenta queda en pausa y su foto se borra.
- El enlace por correo funciona una sola vez y vence a los 15 minutos.
- Pruebas automatizadas del flujo con un proveedor simulado y datos ficticios; sin cuentas reales en pruebas.

## 10. Decisiones tomadas para el lanzamiento (28 oct 2026)

| # | Pregunta | Decisión |
|---|---|---|
| D1 | ¿Solo Google o también otra forma de entrar? | Google + enlace por correo, sin contraseña |
| D2 | ¿Quién puede crear cuenta? | Cualquier persona de 18 años o más, como Congregante; los perfiles con permisos siempre por invitación |
| D3 | ¿Edad mínima para tener cuenta? | 18 años por cuenta propia; **de 13 a 17 con consentimiento de su madre, padre o tutor** desde el lanzamiento (sección 4.6); menores de 13, sin cuenta |
| D4 | ¿Otras personas ven la foto? | Solo la propia persona. La foto para recoger en Kids queda para una fase posterior, con consentimiento aparte |
| D5 | ¿Cómo se exige verificación en dos pasos a administración? | Google Workspace de la iglesia para las cuentas del equipo; si no lo hay, verificación propia de Shalom para administración. Pendiente confirmar si existe Workspace |

**Pendientes:** confirmar Google Workspace (D5) y la revisión legal del consentimiento de adolescentes antes de abrir el registro.
