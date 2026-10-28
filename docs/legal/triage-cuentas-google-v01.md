NOTAS DE INVESTIGACIÓN — NO ES ASESORÍA LEGAL — REVISAR CON UN ABOGADO ANTES DE ACTUAR

# Triaje de privacidad · Cuentas con Google, foto de perfil y adolescentes

**Fecha:** 28 oct 2026 · **Herramienta:** privacy-legal `use-case-triage` con perfil genérico (`docs/legal/perfil-privacidad.md`, campos `[PENDIENTE]`) · **Actividad revisada:** [cuentas-google-v01.md](../cuentas-google-v01.md)

> Las referencias a la ley quedaron actualizadas en la [investigación del 28 oct 2026](investigacion-lfpdppp-2025.md) `[ChatGPT búsqueda web — verificar]`: LFPDPPP del 20 mar 2025, autoridad Secretaría Anticorrupción y Buen Gobierno, plazos ARCO de 20 + 15 días hábiles (art. 31). Las debe confirmar el abogado.

## Conclusión

**Se requiere evaluación de impacto en privacidad antes del lanzamiento.** No hay un conflicto que obligue a detenerse, porque todavía no existe aviso de privacidad. Pero tener cuenta en la app de una iglesia revela creencias religiosas, que la ley mexicana trata como **dato sensible**. Además, la funcionalidad incluye adolescentes.

| Pregunta | Resultado |
|---|---|
| ¿Cumple un disparador interno? | Sí: datos de menores, datos sensibles e identidad y acceso |
| ¿Evaluación obligatoria por GDPR? | No aplica (no hay titulares en la UE, `[PENDIENTE]` confirmar) |
| ¿Conflicto con el aviso de privacidad? | No hay aviso real; el de demo no genera compromisos. Es un **requisito previo**, no un conflicto |

## Actividad, tal como se entiende

- **Datos:**
  - Identificador de Google (`sub`), correo verificado, nombre visible y fecha de nacimiento.
  - Foto (copia de 256 px), opcional.
  - Evidencia de consentimientos: aviso aceptado, consentimiento del tutor y foto.
  - Secretos de verificación en dos pasos (solo administración).
  - Bitácora de auditoría.
- **Titulares:** adultos de la comunidad y adolescentes de 13 a 17 años.
- **Finalidad:** identificar a la persona y darle acceso según el perfil que asigna administración.
- **Terceros:**
  - **Google**, como proveedor de identidad. Los datos llegan *desde* Google; Shalom no le envía datos de la comunidad, pero Google sí sabe que esa persona entra a Shalom.
  - **Proveedor de correo** para enlaces e invitaciones. Es encargado.
  - **Hosting.** Es encargado.
- **Decisiones automatizadas:** ninguna. La edad solo bloquea el autorregistro; los perfiles los asigna una persona.

## Hallazgos

1. **Creencias religiosas como dato sensible (mayor riesgo).** El simple hecho de tener cuenta en Shalom, sus perfiles (miembro, voluntario, Joven) y su participación revelan afiliación religiosa.
   - Para datos sensibles, la ley exige **consentimiento expreso y por escrito**, que puede ser electrónico.
   - La casilla «Acepto el aviso» de «Completa tu perfil» probablemente **no basta** si no identifica expresamente ese dato sensible y su finalidad.
   - Ley, art. 2, fr. VI y arts. 7–9 `[ChatGPT búsqueda web — verificar]`.
2. **Adolescentes.**
   - El consentimiento lo debe dar quien ejerce la patria potestad o la tutela. La definición ya lo pide al tutor verificado por administración, lo cual es positivo.
   - Falta definir cómo se **acredita** esa relación: ¿qué documento revisa administración y qué se guarda como evidencia?
   - Falta decidir qué pasa al cumplir 18. El joven debería dar **su propio consentimiento**; no basta con que la cuenta «pase» a Congregante.
3. **Google conoce la afiliación.** Usar «Continuar con Google» le dice a Google que la persona usa la app de una iglesia. El aviso debe decirlo, y el enlace por correo debe quedar como alternativa equivalente, sin desventajas. La definición ya lo incluye.
4. **Fecha de nacimiento.** Se justifica para saber si hace falta tutor y cuándo cumple 18. Conviene limitar quién la ve, lo que ya está previsto, y no usarla para nada más.
5. **Foto.** La copia propia minimiza la exposición frente a Google, lo cual es positivo. No es dato biométrico mientras no se use para reconocimiento facial; si algún día se usa así, requiere una evaluación nueva.
6. **Encargados.** El proveedor de correo y el hosting necesitan contrato con cláusulas de encargo: tratar solo para el servicio, seguridad, aviso de vulneraciones y borrado al terminar. Google, como proveedor de identidad, se rige por sus propios términos; conviene revisarlos.
7. **Obligaciones generales del responsable.**
   - Designar a la persona o departamento de datos personales.
   - Atender los derechos ARCO y la revocación del consentimiento dentro de los plazos legales `[verificar plazos]`.
   - Tener medidas de seguridad documentadas y una bitácora de vulneraciones.

## Condiciones antes de lanzar

| Requisito | Responsable | ¿Hecho? |
|---|---|---|
| Evaluación de impacto en privacidad de cuentas y acceso (formato breve) | `[PENDIENTE]` + abogado | ☐ |
| Aviso de privacidad integral real, con: identidad y domicilio del responsable, finalidades primarias y secundarias, datos sensibles (creencias religiosas) y de menores, uso de Google como proveedor de identidad, encargados, derechos ARCO y revocación | Abogado | ☐ |
| Consentimiento **expreso** para datos sensibles en «Completa tu perfil», separado del resto y sin premarcar | Producto + abogado | ☐ |
| Procedimiento para acreditar la patria potestad o tutela, y evidencia que se guarda | Administración + abogado | ☐ |
| Nuevo consentimiento propio al cumplir 18 años | Producto | ☐ |
| Designar a la persona o departamento de datos personales | Pastor / administración | ☐ |
| Contratos de encargo con el hosting y el proveedor de correo | Abogado | ☐ |
| Proceso de derechos ARCO y revocación (incluye borrar foto y cuenta) | `[PENDIENTE]` | ☐ |
| Medidas de seguridad documentadas y bitácora de vulneraciones | Desarrollo | ☐ |

## Siguientes pasos

1. **Generar la evaluación de impacto ahora** con `privacy-legal:pia-generation`, partiendo de este triaje. **(Recomendado)**
2. Ajustar `docs/cuentas-google-v01.md` con los hallazgos 1, 2 y 3: consentimiento expreso de dato sensible, acreditación del tutor y nuevo consentimiento a los 18.
3. Llevar al abogado este triaje y la definición, con estas preguntas:
   - ¿Qué artículos y plazos de la LFPDPPP 2025 aplican?
   - ¿Cuál es la autoridad competente?
   - ¿Qué forma debe tener el consentimiento expreso para datos sensibles y para menores?
4. Esperar a que la iglesia complete los campos `[PENDIENTE]` del perfil y repetir el triaje.
