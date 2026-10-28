NOTAS DE INVESTIGACIÓN — NO ES ASESORÍA LEGAL — REVISAR CON UN ABOGADO ANTES DE ACTUAR

# Evaluación de impacto en privacidad: Cuentas, acceso con Google y foto de perfil

**Preparada con:** privacy-legal `pia-generation` (perfil genérico) | **Fecha:** 28 oct 2026 | **Estado:** BORRADOR
**Responsable del producto:** `[PENDIENTE]` | **Revisión de privacidad:** `[PENDIENTE — persona de datos personales]` + abogado

**Contexto previo:** el [triaje del 28 oct 2026](triage-cuentas-google-v01.md) concluyó que se requiere evaluación por datos sensibles (creencias religiosas), menores e identidad. Esta evaluación parte de ese resultado y no baja su nivel de riesgo. No hay evaluaciones anteriores sobre esta actividad.

**Fuentes legales:** no hay herramienta de investigación legal conectada. Toda referencia a la ley proviene del conocimiento del modelo y está marcada `[model knowledge — verify]`. **Ninguna cita ni plazo debe usarse sin que el abogado lo confirme contra el texto vigente de la LFPDPPP 2025**, ley que sustituyó a la de 2010; además, el INAI se extinguió.

---

## Resumen

Shalom permitirá entrar con Google o con un enlace por correo, con foto opcional, y abrirá cuentas a adolescentes de 13 a 17 años con consentimiento de su tutor. El diseño minimiza bien los datos (no guarda tokens de Google, guarda copia propia de la foto, no vincula por correo y administración asigna los perfiles). Pero el tratamiento revela **creencias religiosas** y abarca **menores**, por lo que solo es viable con consentimiento expreso, un aviso de privacidad real y los controles listados abajo.

**Riesgo general:** 🟠 Alto antes de mitigar · 🟡 Medio después de las condiciones `[a fijar por el revisor]`

---

## 1. Descripción del tratamiento

**Qué:** cuentas personales para usar la app de Shalom; administración asigna los perfiles (Congregante, Joven, Familia, Voluntario, Docente, Coordinación, Administración).

**Datos:**

| Dato | ¿Nuevo? | Obligatorio |
|---|---|---|
| Emisor + identificador de Google (`sub`) | Sí | Si entra con Google |
| Correo verificado | Sí | Sí |
| Nombre visible | Sí | Sí |
| Fecha de nacimiento | Sí | Sí |
| Foto (copia de 256 × 256) | Sí | No; opt-in |
| Perfiles asignados (revelan participación religiosa y función) | Sí | Sí |
| Consentimientos: aviso, dato sensible, foto y, en adolescentes, constancia de acreditación del tutor | Sí | Sí |
| Secreto de verificación en dos pasos | Sí | Solo administración, coordinación y finanzas |
| Bitácora de auditoría (altas, perfiles, consentimientos) | Sí | Sí |

**Titulares:** adultos de la comunidad y adolescentes de 13 a 17 años. Los menores de 13 no tienen cuenta.
**Finalidad primaria:** identificar a la persona y darle acceso según su perfil.
**Finalidades secundarias:** ninguna. Si después se agregan (estadísticas, mercadotecnia), requieren aviso y opción de negarse `[model knowledge — verify]`.

---

## 2. Base de legitimación (México)

| Finalidad / dato | Base | Notas |
|---|---|---|
| Acceso a la cuenta (datos de identificación) | Consentimiento mediante el aviso de privacidad | Consentimiento tácito suficiente para datos no sensibles si el aviso se puso a disposición `[model knowledge — verify]` |
| Participación religiosa (dato sensible) | **Consentimiento expreso y por escrito** (vale el medio electrónico) | Casilla propia, sin premarcar y obligatoria en «Completa tu perfil»; se guarda evidencia `[model knowledge — verify]` |
| Datos de adolescentes | Consentimiento de quien ejerce la patria potestad o la tutela | Se acredita en persona y se guarda constancia, no copia del documento `[model knowledge — verify: régimen de menores en la LFPDPPP 2025 y su reglamento]` |
| Foto | Consentimiento (opt-in) | En adolescentes, también del tutor |
| Verificación en dos pasos y bitácora | Necesarias para la relación y deber de seguridad | Medidas de seguridad exigidas al responsable `[model knowledge — verify]` |

---

## 3. Flujo de datos

- **Recolección:** el inicio de sesión de Google (OpenID Connect con `openid`, `email`, `profile`) o el enlace por correo, más «Completa tu perfil». En adolescentes, además, la acreditación presencial del tutor y su consentimiento desde su cuenta.
- **Almacenamiento:** base de datos PostgreSQL de Shalom, cifrada en reposo; la foto en almacenamiento cifrado. Región: `[PENDIENTE — confirmar hosting]`. Si queda fuera de México, es transferencia o remisión internacional y debe decirse en el aviso `[model knowledge — verify]`.
- **Acceso:**
  - La persona ve sus propios datos.
  - Administración ve fecha de nacimiento, perfiles y consentimientos.
  - Ningún otro perfil ve la fecha de nacimiento ni la foto.
  - Todo acceso administrativo queda en la bitácora.
- **Terceros:**
  - **Google:** proveedor de identidad bajo sus propios términos. No recibe datos de la comunidad, pero sí sabe que la persona usa Shalom.
  - **Proveedor de correo:** encargado, con contrato.
  - **Hosting:** encargado, con contrato.
  - No hay venta ni uso publicitario.
- **Conservación** (todas son `[PROPUESTA — confirmar]`):
  - Cuenta: mientras esté activa. Tras 24 meses sin uso, aviso y luego baja.
  - Al eliminar la cuenta: borrado de cuenta y foto en 30 días.
  - Evidencias de consentimiento y constancias del tutor: durante el plazo de prescripción que indique el abogado.
  - Bitácora: 12 meses.

---

## 4. Consistencia con el aviso de privacidad

No existe aviso real (`aviso-privacidad-DEMO.md` es de demostración). **Condición bloqueante:** antes del lanzamiento debe publicarse un aviso integral que cubra todo lo de la sección 6.1 de la [definición](../cuentas-google-v01.md).

| Compromiso necesario en el aviso | Estado |
|---|---|
| Identidad y domicilio del responsable; persona de datos personales | 🟡 Pendiente |
| Datos sensibles (participación religiosa) y datos de menores | 🟡 Pendiente |
| Google como proveedor de identidad, y la alternativa por correo | 🟡 Pendiente |
| Encargados (hosting y correo) y, si aplica, transferencias internacionales | 🟡 Pendiente |
| Derechos ARCO, revocación y medios para ejercerlos | 🟡 Pendiente |

---

## 5. Riesgos y mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación | Estado | Responsable |
|---|---|---|---|---|---|---|
| 1 | Se crea una cuenta, y con ella un registro de participación religiosa, sin consentimiento expreso válido: la casilla general del aviso no basta para un dato sensible | M | A | Casilla propia, sin premarcar y obligatoria; texto revisado por el abogado; evidencia con fecha y versión; sin ella no se crea la cuenta | Diseñada (definición v0.2) | Producto + abogado |
| 2 | Un adulto sin patria potestad (familiar, hermano mayor o un tercero) autoriza la cuenta de un adolescente | M | A | Acreditación presencial con documento e identificación; constancia sin copia; consentimiento dado desde la cuenta verificada del tutor; administración no puede aceptar por él | Diseñada | Administración |
| 3 | Un adolescente miente sobre su edad y se registra como adulto, o un menor de 13 se registra | M | M | Fecha de nacimiento obligatoria. **Riesgo residual:** no hay verificación de edad para quien declara ser adulto. Mitigación adicional: avisos y eventos de Jóvenes solo para perfiles asignados; denuncia y revisión por administración | Parcial | Producto |
| 4 | Al cumplir 18, la cuenta sigue con el consentimiento del tutor y no con el del joven | A sin control | M | Pausa automática al cumplir 18 hasta que el joven dé su propio consentimiento | Diseñada | Producto |
| 5 | Una cuenta de administración comprometida expone fechas de nacimiento, perfiles y vínculos familiares de toda la comunidad, incluidos menores | B | A | Verificación en dos pasos propia (la iglesia no tiene Workspace); bitácora; sesiones con caducidad; recuperación solo en persona con una segunda persona de administración; acceso mínimo | Diseñada | Desarrollo |

**Riesgo residual tras las mitigaciones:** medio. El punto abierto es la falta de verificación de edad para quien declara ser adulto (riesgo 3), algo aceptable en el lanzamiento si el abogado está de acuerdo.

---

## 6. Derechos ARCO y revocación

| Derecho | ¿Se puede ejercer? | Cómo |
|---|---|---|
| Acceso | Sí | «Solicitar mis datos» en Mi perfil (cola asíncrona, entrega por correo verificado) |
| Rectificación | Sí | Nombre visible editable; la fecha de nacimiento, por solicitud a administración |
| Cancelación | Sí | «Eliminar mi cuenta» (revisa administración por obligaciones de conservación) |
| Oposición | Sí | Por solicitud a la persona de datos personales |
| Revocación | Sí | Foto: interruptor. Cuenta: eliminar. Adolescentes: el tutor retira el consentimiento desde Mi familia |

Plazos de respuesta: `[model knowledge — verify contra la LFPDPPP 2025]`.

---

## 7. Recomendación

**APROBADO CON CONDICIONES** `[propuesta — la firma la pone el revisor]`

**Condiciones antes del lanzamiento:**
- [ ] Aviso de privacidad integral publicado, revisado por el abogado (sección 4). Responsable: abogado.
- [ ] Texto del consentimiento expreso de dato sensible aprobado por el abogado (riesgo 1). Responsable: abogado + producto.
- [ ] Procedimiento escrito de acreditación del tutor y modelo de constancia (riesgo 2). Responsable: administración + abogado.
- [ ] Persona o departamento de datos personales designado y publicado en el aviso. Responsable: pastor / administración.
- [ ] Contratos de encargo con el hosting y el proveedor de correo; región de datos confirmada. Responsable: abogado.
- [ ] Plazos de conservación confirmados (sección 3). Responsable: abogado + administración.
- [ ] Pruebas automatizadas: sin consentimiento expreso no hay cuenta; pausa al cumplir 18; un no-tutor no puede consentir (riesgos 1, 2 y 4). Responsable: desarrollo.

**Firma:** `[PENDIENTE]`

---

## Siguientes pasos

1. **Llevar al abogado** este documento, el [triaje](triage-cuentas-google-v01.md) y la [definición](../cuentas-google-v01.md), con tres preguntas:
   - ¿Qué artículos y plazos de la LFPDPPP 2025 y su reglamento aplican, y cuál es la autoridad competente hoy?
   - ¿Qué forma exacta debe tener el consentimiento expreso para el dato sensible y para menores?
   - ¿Es aceptable el riesgo residual de verificación de edad?
2. Que la iglesia complete los campos `[PENDIENTE]` del perfil de privacidad.
3. Opcional: conectar una herramienta de investigación legal y repetir la evaluación con citas verificadas.
4. Después del visto bueno legal, implementar en Django con las pruebas de la sección 7.
