NOTAS DE INVESTIGACIÓN — NO ES ASESORÍA LEGAL — REVISAR CON UN ABOGADO ANTES DE ACTUAR

# Investigación jurídica · Protección de datos personales para Shalom App

**Corte normativo:** 27 oct 2026 · **Origen:** investigación con búsqueda web hecha en ChatGPT a partir del prompt de verificación, aportada por el usuario el 28 oct 2026. **Etiqueta de fuente:** `[ChatGPT búsqueda web — verificar]`. Según ese informe, las fuentes son la Cámara de Diputados, el DOF y documentos oficiales, pero los enlaces no se conservaron al copiarlo y **Claude no verificó las citas de forma independiente**. El abogado debe confirmarlas.

## Conclusión preliminar

La iglesia, como persona moral privada que trata datos de su comunidad, está sujeta a la **LFPDPPP**. Su carácter religioso y sin fines de lucro **no la exime**. El riesgo principal no es usar Google OpenID Connect ni enlaces por correo: es que **crear una cuenta revela vinculación religiosa**, en especial cuando se trata de menores.

## Marco normativo

- **Ley:** nueva LFPDPPP, publicada en el DOF el 20 mar 2025 y vigente desde el 21 mar 2025. Abrogó la ley de 2010. Última reforma identificada: 14 nov 2025.
- **Reglamento:** el del 21 dic 2011 sigue publicado como vigente. Sus referencias a artículos y al INAI quedaron desfasadas y deben interpretarse conforme a la ley de 2025.
- **Autoridad:** Secretaría Anticorrupción y Buen Gobierno, en sustitución del INAI para particulares (Ley, art. 2, fr. XV; arts. 38 y ss.).
- **Plazos:** los «días» de la ley son **días hábiles**, salvo disposición específica.

## Respuestas (Ley = LFPDPPP 2025; Reg. = Reglamento 2011)

| # | Tema | Respuesta | Artículos | Confianza |
|---|---|---|---|---|
| 1 | Ley y reglamento | Nueva ley 2025 vigente; reglamento 2011 formalmente vigente, con referencias desfasadas | Decreto 20/03/2025, transitorios 1.º y 2.º; Ley, arts. 1 y 2 | Alta (vigencia); Media (compatibilidad) |
| 2 | Autoridad | Secretaría Anticorrupción y Buen Gobierno | Ley, art. 2, fr. XV; arts. 38 y ss. | Alta |
| 3 | Dato religioso y consentimiento | Las creencias religiosas son **datos sensibles**: requieren consentimiento **expreso y por escrito** (firma autógrafa, electrónica u otro mecanismo de autenticación). En una app basta un mecanismo electrónico que identifique al titular, registre una manifestación inequívoca y permita demostrarla. **NO VERIFICADO:** que una casilla baste por sí sola en todos los casos, o que Google OIDC equivalga al consentimiento | Ley, art. 2, fr. VI; arts. 7, 8 y 9. Reg., arts. 12, 15, 19 y 20 | Alta (obligación); Media (implementación) |
| 4 | Menores | La ley no fija los umbrales de 13 y 18 años para cuentas. El reglamento remite a la representación del Código Civil Federal (patria potestad). Acreditar en persona sin guardar copia es una minimización razonable. **NO VERIFICADO:** que la constancia sin copia baste en todos los casos | Ley, arts. 8, 27 y 28. Reg., art. 89. CCF, arts. 412, 414, 424 y 425 | Media |
| 5 | Aviso integral | I) identidad y domicilio del responsable; II) datos tratados, identificando los sensibles; III) finalidades, señalando cuáles requieren consentimiento; IV) opciones para limitar uso o divulgación; V) mecanismos ARCO; VI) cómo se comunican los cambios. En medios electrónicos, aviso **simplificado** con I–IV y dónde consultar el integral | Ley, arts. 14, 15 (frs. I–VI) y 16, fr. II. Reg., arts. 23–26 | Alta |
| 6 | ARCO y revocación | **20 días hábiles** para responder y **15 días hábiles** para ejecutar; cada plazo se puede ampliar una vez por un periodo igual, con justificación. La revocación procede en cualquier momento, sin efectos retroactivos, por un medio gratuito y sencillo | Ley, art. 2, fr. VIII; arts. 7, 21–28 y **31**. Reg., art. 21 | Alta (ARCO); Media (plazo de revocación) |
| 7 | Seguridad y vulneraciones | Designar una persona o departamento de datos personales. Medidas administrativas, técnicas y físicas según el riesgo. Si una vulneración afecta significativamente derechos patrimoniales o morales, avisar **de inmediato a los titulares**. **NO VERIFICADO:** que exista una obligación general de avisar a la Secretaría | Ley, arts. 18, 19, 20 y 29. Reg., arts. 57 y 60–66 | Alta (titulares); NO VERIFICADO (autoridad) |
| 8 | Encargados y hosting extranjero | La relación debe constar en cláusulas u otro instrumento verificable: instrucciones, finalidades, seguridad, confidencialidad, eliminación, subcontratación y comunicaciones. Un hosting extranjero que trata datos por cuenta de Shalom es **remisión internacional, no transferencia**: no requiere consentimiento adicional. Si el receptor actúa como responsable independiente, podría haber transferencia | Ley, art. 2, frs. XII y XX; arts. 35–36. Reg., arts. 49–55 | Alta (distinción); Media (según proveedor) |
| 9 | Exenciones | No hay exención para iglesias, asociaciones religiosas ni para todas las organizaciones sin fines de lucro | Ley, art. 1 y art. 2, fr. XVI | Alta |

## Recomendaciones de diseño del informe

- **Separar la autenticación (Google o correo) de la aceptación del tratamiento sensible.**
- **Consentimiento documentable antes de activar la cuenta:** versión del aviso, fecha, identificador de cuenta, finalidad y mecanismo de autenticación.
- **Adolescentes:** cuenta pendiente de activación hasta la autorización del representante. La constancia indica que se verificó la representación, qué se consintió, cuándo y con qué procedimiento, sin números de documento innecesarios.
- **Administración:** verificación en dos pasos, permisos por función, bitácora y separación de cuentas. La ley no exige expresamente verificación en dos pasos; es una medida del deber de seguridad.
- **Minimización (art. 12, proporcionalidad):** valorar si basta una clasificación de edad en lugar de la fecha de nacimiento completa. Definir la conservación de fotos, consentimientos y cuentas.

## Preguntas para el abogado

1. **Consentimiento religioso:** ¿una casilla sin premarcar dentro de una sesión autenticada (Google o enlace por correo), con evidencia auditable, cumple el consentimiento expreso y por escrito del art. 8?
2. **Pertenencia religiosa:** ¿toda cuenta es dato sensible, aun si la persona es solo visitante, voluntaria externa o familiar y no comparte las creencias?
3. **Menores:** ¿se permite el esquema de 13 a 17 años con autorización del representante, o hay condiciones adicionales en la legislación de niñas, niños y adolescentes?
4. **Acreditación:** ¿qué documentos prueban la patria potestad o tutela? ¿Basta una constancia presencial sin copias?
5. **Constancia:** ¿qué información mínima debe conservarse, por cuánto tiempo y cómo se prueban después las facultades de quien autorizó?
6. **Consentimientos separados:** ¿el religioso debe separarse de los de foto, comunicaciones, eventos y funciones futuras?
7. **Vulneraciones:** ¿hay que avisar también a la Secretaría? ¿En qué supuesto y plazo?
8. **Proveedores:** ¿los contratos de hosting, correo y autenticación permiten tratarlos solo como encargados? ¿La telemetría o los subencargados pueden ser transferencias?
9. **Reglamento de 2011:** ¿qué disposiciones siguen aplicando y cómo se leen sus referencias desfasadas?
10. **Ámbito local:** ¿aplica el código civil del estado donde opera Shalom (capacidad, patria potestad, tutela)?
11. **Identidad del responsable:** ¿la iglesia es asociación religiosa, asociación civil u otra figura? ¿Qué denominación y domicilio van en el aviso?
12. **Fecha de nacimiento:** ¿es proporcional pedirla completa a todos los adultos, o basta calcular la edad al registrarse y guardar solo lo necesario?

## Dictamen preliminar del informe

| Componente | Evaluación | Acción |
|---|---|---|
| Google OIDC / enlace por correo | Viable, sujeto al diseño | Separar autenticación y consentimiento |
| Cuenta con vinculación religiosa | Alto cuidado | Consentimiento expreso y por escrito verificable |
| Registro de adultos | Condicionado | No activar sin consentimiento |
| Registro de 13 a 17 años | Requiere validación jurídica | Activar después de la autorización acreditada |
| Exclusión de menores de 13 | Política conservadora | Mantener |
| Foto opcional | Minimización adecuada | No copiarla automáticamente |
| Hosting internacional | Potencialmente viable | Verificar función contractual y subencargados |
| Verificación en dos pasos | Medida favorable | Mantener |

Prioridades para el abogado: **(1) la prueba del consentimiento electrónico del dato sensible y (2) la autorización de los representantes de adolescentes.**
