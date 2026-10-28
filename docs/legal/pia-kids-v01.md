NOTAS DE INVESTIGACIÓN — NO ES ASESORÍA LEGAL — REVISAR CON UN ABOGADO ANTES DE ACTUAR

# Evaluación de impacto en privacidad: Shalom Kids

**Preparada con:** formato de privacy-legal `pia-generation` (perfil genérico; el complemento no estaba disponible en esta sesión) | **Fecha:** 28 oct 2026 | **Estado:** BORRADOR para el abogado
**Responsable del producto:** `[PENDIENTE]` | **Revisión de privacidad:** `[PENDIENTE — persona de datos personales]` + abogado

**Contexto previo:** el [plan de la versión 1](../plan-v1-kids.md) exige esta evaluación antes de la Fase 3 (Datos Kids). Parte de la [evaluación de cuentas](pia-cuentas-google-v01.md), que ya cubre identidad, acceso y adolescentes con cuenta, y no repite sus conclusiones. Las cuentas de tutores, docentes y coordinación siguen esa evaluación; esta cubre lo que Kids agrega: **datos de niñas y niños, su salud, su imagen, quién los recoge, su asistencia y los pagos de libros.**

**Fuentes legales:** igual que la evaluación de cuentas. Las citas de la [investigación del 28 oct 2026](investigacion-lfpdppp-2025.md) van marcadas `[ChatGPT búsqueda web — verificar]`. Lo que esa investigación no cubre (datos de salud, emergencias, derechos de niñas, niños y adolescentes, deberes de aviso ante maltrato) va marcado `[model knowledge — verify]`. **El abogado debe confirmar todas las citas.**

**Qué describe:** el diseño propuesto en la [arquitectura de producción](../arquitectura-produccion-v01.md) (sección 6) y los mockups de la demo. **Nada de esto está implementado ni trata datos reales todavía.** El sistema vigente (hojas de cálculo y QR) sigue siendo la fuente de verdad hasta un corte aprobado.

---

## Resumen

Shalom Kids registrará a niñas y niños, sus tutores y las personas autorizadas para recogerlos. Registrará también sus alergias e indicaciones médicas, su asistencia con hora de entrada y de salida, su consentimiento de imagen y los pedidos de libros. El diseño ya minimiza bastante:

- la salud va cifrada y aparte del registro del niño;
- Recepción solo ve que hay una indicación, no cuál es;
- el QR del gafete no contiene datos personales y por sí solo no libera al niño;
- los cambios de quién recoge se hacen en persona;
- Shalom no ve datos de tarjeta.

Pero se combinan **tres categorías de alto riesgo**: menores, salud (dato sensible) y afiliación religiosa (dato sensible). A eso se suma un riesgo físico: **entregar un niño a quien no debe recogerlo.**

**Riesgo general:** 🔴 Alto antes de mitigar · 🟡 Medio después de las condiciones `[a fijar por el revisor]`

---

## 1. Descripción del tratamiento

**Qué:** operar el ministerio infantil. Incluye inscripción de familias, grupos por edad, reservas, entrada y salida con gafete, atención de alergias durante la clase, seguimiento de incidencias, avisos a tutores, rol de docentes y venta de libros.

**Titulares:**
- niñas y niños del ministerio `[PENDIENTE — rango de edad de Kids]`;
- madres, padres y tutores, con cuenta;
- personas autorizadas para recoger, que pueden no tener cuenta;
- docentes y voluntarios;
- visitantes de una sola vez.

**Datos:**

| Dato | De quién | ¿Obligatorio? | Quién lo ve | Minimización propuesta |
|---|---|---|---|---|
| Nombre del niño e identificador interno | Niño | Sí | Su tutor; docentes de su grupo; Recepción; coordinación | Nada de esto aparece en el QR ni en los correos a terceros |
| Fecha de nacimiento | Niño | Sí, para el grupo por edad | Tutor y coordinación | Docentes y Recepción ven el grupo, no la fecha. ¿Basta año y mes? (pregunta K8) |
| Grupo, reservas y asistencia (hora de entrada y de salida, quién registró, quién recogió y cómo se verificó) | Niño y adultos | Sí | Tutor (sus hijos); docente (su grupo, el día de clase); coordinación | Plazo de conservación definido (sección 3); fuera de reportes nominales para otros perfiles |
| **Alergias, medicamentos e indicaciones** (nota breve de hasta 120 caracteres) | Niño | Ver pregunta K3 | Detalle: docente del grupo **el día de su clase** y coordinación. Recepción: solo el indicador «requiere atención» | **Cifrado de campo**, separado del registro del niño; lecturas en la bitácora; excluido de exportaciones y correos |
| Tutor: vínculo con el niño y constancia de acreditación (sin copia del documento) | Tutor | Sí | Coordinación y administración | La constancia dice qué se verificó, cuándo y quién, sin números de documento |
| Teléfono de contacto del tutor | Tutor | Sí, para emergencias | Docente del grupo durante la clase; coordinación | No se publica ni va en listas impresas |
| Personas autorizadas para recoger: nombre, relación y vigencia | Tercero | No | Recepción al momento de la salida; tutor; coordinación | Solo se agregan o quitan **en persona con coordinación**. La foto de quien recoge queda fuera del lanzamiento |
| Código de recogida del adulto y gafete con QR | Tutor o autorizado; niño | Sí | Nadie lo lee: solo se guarda su verificador | Códigos aleatorios y opacos, revocables y con vigencia |
| Consentimiento de imagen: uso interno y difusión pública, por separado | Niño, a través del tutor | No; sin marcar equivale a no | Coordinación | Dos finalidades distintas; revocable; sin fotos en correos |
| Incidencias (qué pasó, a quién, qué se hizo, aviso al tutor) | Niño y adultos | Cuando ocurren | Coordinación; el tutor de los niños involucrados | Campos estructurados; no van en correos; conservación definida (pregunta K7) |
| Visitante: nombre, edad, un adulto con teléfono, alergias sí o no, y la nota | Niño y adulto | Sí, el día de la visita | Recepción, docente y coordinación | Sin cuenta; borrado si no se inscribe (propuesta: 60 días) |
| Docentes y voluntarios: grupos asignados, rol de clases y foto opcional | Adulto | El rol, sí; la foto, no | Coordinación; las familias ven nombre y foto del equipo de su grupo | Sin teléfonos ni datos de contacto visibles para las familias |
| Pedido de libros: folio, libro, monto, id de pago de Mercado Pago, estado y entrega (quién entregó, a qué adulto) | Tutor | Solo si compra | El tutor; administración y coordinación | Sin datos de tarjeta; el precio lo fija el servidor |
| Bitácora (altas, cambios, lecturas de salud, entregas, cambios de autorizados) | Todos | Sí | Administración y coordinación | Solo identificadores internos; sin contenido de salud |

**Finalidades primarias:**
1. Cuidar y proteger a los niños durante el servicio: entrada, atención de alergias, salida solo con un adulto autorizado e incidencias.
2. Organizar grupos, clases y docentes.
3. Avisar a los tutores de la entrada y la salida, y enviarles recordatorios.
4. Vender y entregar los libros del ciclo.

**Finalidades secundarias:** ninguna. Los reportes de asistencia sirven para operar el ministerio. Si después se agregan estadísticas no necesarias para operar, mercadotecnia o difusión pública de imágenes fuera del consentimiento, se necesita aviso y opción de negarse (Ley, art. 15, frs. III–IV) `[ChatGPT búsqueda web — verificar]`.

**Decisiones automatizadas:** ninguna con efecto sobre las personas. El grupo por edad se propone de forma automática, pero lo confirma coordinación.

---

## 2. Base de legitimación (México)

| Finalidad / dato | Base | Notas |
|---|---|---|
| Datos de identificación del niño, el grupo y la asistencia | Consentimiento de quien ejerce la patria potestad o la tutela, mediante el aviso de privacidad | La ley no fija edades; el reglamento (art. 89) remite a la representación del Código Civil Federal `[ChatGPT búsqueda web — verificar]`. Lo da el tutor acreditado en persona, desde su cuenta verificada |
| **Salud del niño** (alergias, medicamentos, indicaciones) | **Consentimiento expreso y por escrito del tutor** (vale el medio electrónico) | El estado de salud es dato sensible (Ley, art. 2, fr. VI) `[model knowledge — verify]`. Casilla propia, sin premarcar y **separada** del consentimiento religioso y del de imagen. Si hay una excepción por emergencia médica en la ley de 2025: **NO VERIFICADO** (pregunta K2) |
| Afiliación religiosa implícita (inscribir al niño en el ministerio de una iglesia) | Consentimiento expreso del tutor | Las creencias religiosas son dato sensible (Ley, art. 2, fr. VI; arts. 7–9) `[ChatGPT búsqueda web — verificar]`. Igual que en cuentas (pregunta 2 de la investigación) |
| Imagen del niño | Consentimiento del tutor, por finalidad: uso interno y difusión pública | Además de la LFPDPPP, la Ley General de los Derechos de Niñas, Niños y Adolescentes protege su intimidad e imagen (arts. 76–77) `[model knowledge — verify]` (pregunta K6) |
| Personas autorizadas para recoger | Las proporciona el tutor; son datos de un tercero | Hay que informarles el tratamiento. La forma y el momento: **NO VERIFICADO** (pregunta K5) |
| Teléfono de emergencia y contacto con el tutor | Consentimiento del tutor; necesario para el cuidado | — |
| Avisos de entrada y salida por correo | Consentimiento del tutor | Se propone activarlos por defecto para el tutor principal, con opción de desactivarlos (pregunta K9) |
| Pedidos y pagos | Relación de compraventa con el tutor | Mercado Pago, ¿encargado o responsable independiente? (pregunta K10) |
| Bitácora y verificación en dos pasos de coordinación | Deber de seguridad (Ley, arts. 18–20) `[ChatGPT búsqueda web — verificar]` | — |

---

## 3. Flujo de datos

**Recolección:**
- **Inscripción:** el tutor, una vez acreditado en persona, inscribe desde su cuenta o en persona con coordinación.
- **Visitantes:** se registran en Recepción.
- **Asistencia:** se registra con el gafete en Recepción, y la salida con la verificación del adulto.
- **Sistema vigente:** sus datos se migran una sola vez. Lo hace la iglesia con un script validado, nunca a través del repositorio, y con conciliación (pregunta K11).

**Almacenamiento:**
- PostgreSQL en Cloud SQL, cifrado en reposo y con respaldos automáticos.
- **Salud:** cifrado de campo con una llave en Secret Manager, distinta de la de la base.
- Región `[PENDIENTE]`:
  - Querétaro (`northamerica-south1`) si Cloud Run y Firebase Hosting funcionan ahí;
  - si no, `us-central1`, que sería una remisión internacional a un encargado (Ley, art. 2, frs. XII y XX) `[ChatGPT búsqueda web — verificar]`.

**Acceso** (siempre lo valida el servidor y queda en la bitácora):

| Perfil | Ve |
|---|---|
| Tutor | Solo sus hijos: asistencia, salud que él capturó, autorizados, imagen, incidencias de su hijo y pedidos |
| Docente | Niños de su grupo **el día de su clase**: nombres, asistencia, detalle de salud y teléfono del tutor. Nada de otros grupos |
| Recepción (dispositivo compartido, sesión de 5 minutos) | Lista del día, entrada y salida, indicador de atención y autorizados del niño que sale. **No ve el detalle de salud** |
| Coordinación Kids (con verificación en dos pasos) | Todo Kids, con lecturas de salud en la bitácora |
| Administración (con verificación en dos pasos) | Perfiles, catálogo, pedidos y reportes. Lee salud solo si además tiene el perfil de coordinación |
| Finanzas | Pagos y conciliación; nada de salud ni de asistencia |

**Terceros:**

| Tercero | Papel | Qué recibe |
|---|---|---|
| Google Cloud | Encargado (hosting) | Todo, cifrado |
| Brevo | Encargado (correo) | Correo del tutor y avisos mínimos («[Nombre] registró su entrada a las 10:02 en [grupo]»), sin salud ni datos de otras personas |
| Mercado Pago | Pregunta K10 | Monto, referencia del pedido y los datos que el tutor capture en su checkout |

No hay venta ni uso publicitario.

**Conservación** (todas son `[PROPUESTA — confirmar con el abogado, pregunta K7]`):

| Dato | Plazo propuesto |
|---|---|
| Salud | Mientras el niño esté inscrito; se borra al darlo de baja o a los 12 meses sin asistencia |
| Asistencia nominal | 24 meses; después, solo conteos agregados |
| Incidencias | El plazo que indique el abogado (puede haber deberes de conservación) |
| Consentimientos y constancias de acreditación | Mientras duren y, después, el plazo de prescripción que indique el abogado |
| Visitantes | 60 días si no se inscriben |
| Pedidos y pagos | El plazo fiscal aplicable |
| Bitácora | 12 meses; las lecturas de salud, 24 meses |

---

## 4. Consistencia con el aviso de privacidad

No existe aviso real. **Condición bloqueante:** el aviso integral (ver la [evaluación de cuentas](pia-cuentas-google-v01.md), sección 4) necesita un **apartado de Kids** con:

| Compromiso | Estado |
|---|---|
| Datos de niñas y niños, y quién consiente por ellos | 🟡 Pendiente |
| Datos de salud como sensibles: finalidad, quién los ve y cuánto se conservan | 🟡 Pendiente |
| Imagen: uso interno y difusión pública por separado, y cómo revocar | 🟡 Pendiente |
| Personas autorizadas: qué datos se guardan y para qué | 🟡 Pendiente |
| Avisos de entrada y salida, y cómo desactivarlos | 🟡 Pendiente |
| Mercado Pago, Brevo y hosting, con su papel (encargado o transferencia) | 🟡 Pendiente |
| Plazos de conservación | 🟡 Pendiente |

---

## 5. Riesgos y mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación | Estado | Responsable |
|---|---|---|---|---|---|---|
| 1 | **Se entrega un niño a un adulto no autorizado:** un QR copiado, un autorizado ya vencido o un tutor con restricción judicial | M | **Muy alto** (seguridad física) | El QR del niño **no basta**: la salida exige el código de recogida del adulto o que esté en la lista de autorizados, con identificación. Los cambios de autorizados solo en persona. Vigencias. Registro de quién entregó y cómo verificó. Si no coincide, no se entrega y se abre una incidencia. Restricciones de custodia visibles en Recepción (pregunta K4) | Diseñada | Coordinación + desarrollo |
| 2 | **El detalle de salud llega a quien no atiende al niño:** docente de otro grupo, Recepción, administración general, exportaciones o correos | M | A | Cifrado de campo; acceso por grupo y por día; Recepción solo ve el indicador; lecturas en la bitácora; excluido de exportaciones, correos y listas impresas | Diseñada | Desarrollo |
| 3 | **Consentimiento inválido para la salud:** una casilla general, o dado por quien no ejerce la patria potestad | M | A | Casilla propia y separada; tutor acreditado en persona; evidencia con versión y fecha; texto revisado por el abogado | Diseñada (falta el texto) | Producto + abogado |
| 4 | **Sin datos de salud no hay atención:** el tutor no da el consentimiento y un docente desconoce una alergia | M | Muy alto | Pregunta K2/K3: ¿puede la inscripción exigir declarar alergias? Propuesta: sin la declaración (aunque sea «ninguna»), no se confirma la inscripción | **Abierto** | Abogado + coordinación |
| 5 | **Disputas de custodia:** dos tutores en desacuerdo, uno revoca o hay una orden judicial | M | A | Procedimiento escrito: quién consiente, cómo se registra una restricción y quién decide. Una orden judicial se registra en persona y bloquea la salida a esa persona | **Abierto** (pregunta K4) | Coordinación + abogado |
| 6 | **Los avisos de entrada y salida revelan ubicación y horario** de un niño a un correo comprometido o a un ex tutor | M | M | Contenido mínimo; solo tutores vigentes; se revoca al cambiar la custodia; se pueden desactivar | Diseñada | Desarrollo |
| 7 | **Las fotos se usan más allá de lo autorizado** (redes sociales) | M | M | Finalidades separadas, sin premarcar y revocables; ninguna foto de niños en correos; reconocimiento facial prohibido | Diseñada | Coordinación |
| 8 | **El QR o el código se filtran** (foto del gafete) | M | M | Código opaco sin datos; solo se guarda el verificador; revocable; el QR solo no libera al niño (riesgo 1); límite de intentos en el código de recogida | Diseñada | Desarrollo |
| 9 | **Personas autorizadas sin aviso:** se tratan datos de terceros que no lo saben | A | B | Datos mínimos (nombre, relación y vigencia); aviso breve cuando se presentan por primera vez (pregunta K5) | Parcial | Coordinación |
| 10 | **La migración desde el sistema vigente expone datos reales** en copias, correos o el repositorio | M | A | La ejecuta la iglesia con un script validado; nunca en Git; acceso restringido; conciliación; las hojas se retiran tras el corte según su conservación | Diseñada | Iglesia + desarrollo |
| 11 | **Las incidencias guardan detalles sensibles** de conducta, salud o posible maltrato | M | A | Campos estructurados; solo coordinación; conservación definida; no van en correos. Deber de aviso a las autoridades ante sospecha de maltrato: pregunta K13 | **Abierto** | Coordinación + abogado |
| 12 | **Se conserva de más la asistencia histórica** de menores | A sin control | M | Purga automática: asistencia nominal a 24 meses; después, solo conteos | Diseñada | Desarrollo |
| 13 | **Una cuenta de coordinación comprometida** expone todo Kids | B | A | Verificación en dos pasos (implementada); bitácora; sesiones con caducidad; recuperación en persona | Implementada (Fase 2) | Desarrollo |
| 14 | **Datos de pago** | B | M | Checkout Pro: Shalom no ve tarjetas; el webhook se verifica con firma y consulta a la API; el precio lo fija el servidor | Diseñada | Desarrollo |

**Riesgo residual tras las mitigaciones:** medio. Quedan abiertos tres puntos, todos de criterio legal u operativo y no de tecnología:
- qué hacer si el tutor no da los datos de salud (riesgo 4);
- el procedimiento de custodia (riesgo 5);
- los deberes ante sospecha de maltrato (riesgo 11).

---

## 6. Derechos ARCO y revocación

| Derecho | Quién lo ejerce | Cómo |
|---|---|---|
| Acceso | El tutor, por su hijo; cada adulto, por sí | «Solicitar mis datos» o «Solicitar los datos de mi hijo» (cola asíncrona, entrega por correo verificado) |
| Rectificación | El tutor | Edita la salud y las preferencias desde Mis hijos. Los autorizados y la fecha de nacimiento, en persona con coordinación |
| Cancelación | El tutor | Dar de baja al niño: se borran salud, imagen y autorizados; se conserva lo obligatorio (asistencia según su plazo, pagos, incidencias) |
| Oposición | El tutor | A los avisos por correo (interruptor) y a la difusión de imagen |
| Revocación | El tutor | Imagen y avisos: interruptor. Salud: equivale a dar de baja la inscripción si la salud es requisito (riesgo 4) |
| Autorizados | La persona autorizada | Puede pedir que la quiten; coordinación avisa al tutor |

Plazos: **20 días hábiles** para responder y **15 días hábiles** para ejecutar, ampliables una vez (Ley, art. 31) `[ChatGPT búsqueda web — verificar]`. Cuando el niño cumpla la mayoría de edad, sus derechos los ejerce él.

---

## 7. Recomendación

**APROBADO CON CONDICIONES** `[propuesta — la firma la pone el revisor]`

**Condiciones antes de la Fase 3 (Datos Kids):**
- [ ] Respuestas del abogado a las preguntas K1–K4 (salud, emergencia, custodia).
- [ ] Texto del consentimiento expreso de salud, separado del religioso y del de imagen. Responsable: abogado + producto.
- [ ] Rango de edad de Kids y quién ve el detalle de alergias, confirmados por coordinación (la demo propone: el docente del grupo el día de su clase).

**Condiciones antes del piloto (Fase 7):**
- [ ] Aviso de privacidad con el apartado de Kids (sección 4), revisado por el abogado.
- [ ] Procedimiento escrito de acreditación del tutor, de custodia y restricciones, y de cambios de autorizados. Responsable: coordinación + abogado.
- [ ] Procedimiento de incidencias, con los deberes de aviso (pregunta K13).
- [ ] Plazos de conservación confirmados y purga automática implementada.
- [ ] Contratos de encargo con Google Cloud y Brevo; papel de Mercado Pago aclarado; región confirmada.
- [ ] Persona o departamento de datos personales designado.
- [ ] Plan de migración: script validado, ejecución por la iglesia, conciliación y retiro de las hojas.
- [ ] **Pruebas automatizadas** (las escribe desarrollo en las fases 3 y 4):
  - un docente de otro grupo, o de otro día, no ve la salud;
  - Recepción no ve el detalle;
  - el QR solo no registra la salida;
  - un autorizado vencido no recoge;
  - los cambios de autorizados exigen coordinación;
  - las exportaciones y los correos no llevan salud;
  - un tutor no ve a otros niños;
  - las lecturas de salud quedan en la bitácora.

**Firma:** `[PENDIENTE]`

---

## 8. Preguntas para el abogado

Complementan las 12 de la [investigación](investigacion-lfpdppp-2025.md).

1. **K1 · Consentimiento de salud:** ¿una casilla sin premarcar, separada y marcada por el tutor acreditado desde su cuenta verificada, con evidencia auditable, cumple el consentimiento expreso y por escrito para datos de salud de su hijo?
2. **K2 · Emergencias:** ¿la ley de 2025 permite tratar datos de salud sin consentimiento en una emergencia médica? ¿Cubre que un docente conozca una alergia para prevenir una reacción?
3. **K3 · Requisito de inscripción:** ¿puede la iglesia exigir que el tutor declare alergias o indicaciones (aunque sea «ninguna») como condición para recibir al niño, por seguridad?
4. **K4 · Custodia:** con dos tutores, ¿basta el consentimiento de uno? ¿Qué pasa si el otro revoca? ¿Cómo se registra y se hace valer una orden judicial que restringe la recogida? ¿Qué documento se pide?
5. **K5 · Personas autorizadas:** ¿cómo y cuándo se les informa del tratamiento? ¿Se debe pedir identificación al recoger y conservar algo de ella?
6. **K6 · Imagen:** ¿qué forma debe tener el consentimiento de imagen de un menor para uso interno y para difusión? ¿Qué límites añade la Ley General de los Derechos de Niñas, Niños y Adolescentes?
7. **K7 · Conservación:** ¿qué plazos aplican a asistencia, incidencias, salud, consentimientos, constancias de acreditación y pagos?
8. **K8 · Fecha de nacimiento:** ¿es proporcional la fecha completa del niño, o basta año y mes para el grupo por edad?
9. **K9 · Avisos de entrada y salida:** ¿requieren un consentimiento propio o basta el aviso de privacidad, si se pueden desactivar?
10. **K10 · Mercado Pago:** ¿actúa como encargado o como responsable independiente (transferencia)? ¿Qué debe decir el aviso?
11. **K11 · Migración:** ¿pasar los datos del sistema vigente al nuevo, con el mismo responsable y la misma finalidad, requiere un nuevo consentimiento o solo un aviso?
12. **K12 · Visitantes:** ¿qué aviso y consentimiento mínimo aplican a un niño que asiste una sola vez?
13. **K13 · Maltrato e incidencias:** ¿qué deberes tiene la iglesia de avisar a las autoridades o a los tutores ante una sospecha de maltrato, y cómo se documenta sin exponer al niño?

---

## Siguientes pasos

1. **Llevar al abogado** este documento junto con la [evaluación de cuentas](pia-cuentas-google-v01.md), la [investigación](investigacion-lfpdppp-2025.md) y la [arquitectura](../arquitectura-produccion-v01.md). Prioridades: K1–K4 y K13.
2. **Coordinación Kids** confirma el rango de edad, quién ve las alergias y el borrador del procedimiento de custodia y autorizados.
3. Con las respuestas, ajustar esta evaluación (v0.2) y diseñar los modelos de la Fase 3 con las pruebas de la sección 7.
