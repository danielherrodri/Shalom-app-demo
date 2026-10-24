# Experiencia, sesiones y continuidad · propuesta v0.8

23 de octubre de 2026. Complementa la [arquitectura y seguridad](arquitectura-seguridad-v08.md). Son criterios de diseño y objetivos pendientes de implementación, validación operativa y presupuesto; no una auditoría nueva ni certificación de accesibilidad. El prototipo sigue siendo ficticio.

## Diseño para Shalom

Conservar Inter y los temas Noche/Crema, con componentes React compartidos. Priorizar legibilidad, personas mayores, teléfonos y operación rápida de Kids. La escala actual del prototipo incluye cuerpo de 16 px y título de 48 px; para pantallas operativas se propone una jerarquía más contenida. No se cambian aquí los tokens ni las vistas existentes.

| Uso | Tamaño propuesto equivalente, con base de navegador de 16 px | Peso |
| --- | --- | --- |
| Texto y campos principales | 18 px (1.125 rem) | 400 |
| Etiquetas y botones | 16–18 px | 500–600 |
| Ayudas y metadatos secundarios | 14–16 px; nunca el único lugar de una instrucción crítica | 400 |
| Títulos de sección/tarjeta | 20–24 px | 600 |
| Título de pantalla | 28–32 px; adaptable sin recortar | 700 |

Estos tamaños son decisiones del proyecto, no mínimos normativos WCAG. Evitar pesos muy finos, párrafos enteros en negrita y mayúsculas prolongadas; usar negrita para títulos, nombres relevantes y una instrucción clave. Interlineado de cuerpo cercano a 1.5, texto alineado a la izquierda y ancho de lectura moderado. Usar rem, respetar tamaño de fuente del navegador y permitir espaciado personalizado sin pérdida. Los encabezados tendrán jerarquía semántica, no solo tamaño visual.

Objetivo de accesibilidad: WCAG 2.2 AA. Revisar contraste por tema y estado: texto normal 4.5:1, texto grande 3:1, y componentes/indicadores pertinentes 3:1. No depender del color para estado o error. Preferencia de producto: objetivos táctiles de al menos 44 × 44 CSS px, mayores en acciones frecuentes de Kids. Esto supera el mínimo AA de 24 × 24 con sus excepciones y no debe confundirse con una obligación general de 44 en AA.

## Navegación, formularios y respuesta de la app

- Inicio según tarea y permisos: las familias encuentran su información; el equipo Kids llega a grupo/sesión. Una acción principal clara por contexto, navegación estable, texto junto a iconos poco evidentes. No convertir toda la pantalla en botones del mismo énfasis.
- Etiquetas permanentes, campos obligatorios identificados, teclado apropiado para correo/teléfono, autocompletado y mensajes concretos al lado del campo más resumen enfocable cuando proceda. Validar sin borrar lo capturado ni mover el foco inesperadamente. Admitir pegar contraseñas/códigos y usar gestores de contraseñas.
- Diseñar estados de carga, vacío, sin resultados, error, sin permiso y conexión interrumpida. “Sin resultados” no debe confundirse con un fallo. Ante resultado incierto de asistencia o envío, consultar estado antes de repetir; confirmar éxito solo tras respuesta del servidor.
- Confirmación específica para cambios sensibles: persona, acción y consecuencia. Preferir corrección auditable donde corresponda; no un “deshacer” que invalide una entrega física ya efectuada. Evitar confirmaciones rutinarias que acostumbren a aceptar sin leer.
- Teclado completo, foco visible y no oculto por cabeceras/pies fijos, enlace para saltar navegación, HTML semántico y nombres accesibles. Diálogos con foco inicial adecuado, contención mientras abiertos, salida apropiada y devolución de foco. Mensajes de estado anunciables sin interrumpir cada actualización.
- Movimiento reducido, sin reproducción automática ni flashes; alternativas textuales, subtítulos para video hablado y controles multimedia. Errores importantes permanecen visibles, no solo avisos que desaparecen.
- En dispositivos compartidos, minimizar datos visibles y ofrecer bloqueo/cierre claro; los mensajes de error no revelan otras familias. Los desafíos anti-bot necesitan alternativa accesible.

## Adaptación a pantallas y pruebas de UX

Diseño desde móvil, con una columna cuando haga falta. Cambiar distribución según contenido, no reducir letras para hacer caber el escritorio. Listados móviles con datos prioritarios y detalle accesible; conservar acciones y relaciones semánticas. Tablas genuinamente bidimensionales pueden tener desplazamiento local controlado, sin obligar a desplazar toda la página. Probar orientación, teclado virtual, nombres largos, traducciones futuras y errores extensos.

Verificar 320, 390, 810 y 1366 CSS px, tamaños intermedios, temas y todos los estados críticos. Texto ampliado al 200%; redistribución equivalente a 320 CSS px, por ejemplo zoom al 400% desde 1280 px, con las excepciones normativas aplicables. Sin bloqueo de zoom ni de orientación sin necesidad esencial. Las dimensiones de prueba son cobertura propuesta, no garantía para todos los dispositivos.

Cada componente tendrá tokens, variantes y estados documentados. Automatizar axe y regresión de flujos, complementar con teclado, NVDA y VoiceOver y observación con familias, personas mayores y coordinación. Validar completar acceso, buscar grupo, corregir un error y registrar asistencia con datos ficticios. Las comprobaciones automatizadas no acreditan conformidad por sí solas.

## Duración de sesiones: propuesta inicial

El navegador de un celular usa la política web; la política de app nativa aplica cuando la construyamos. Se impone la política más restrictiva entre función y dispositivo. Todos los valores siguientes son propuestas de Shalom, no duraciones exigidas por OWASP.

| Contexto | Inactividad | Límite absoluto antes de nuevo acceso |
| --- | --- | --- |
| Web personal, familia | 30 minutos | 12 horas |
| Web de coordinación/finanzas | 15 minutos | 8 horas |
| Equipo compartido Kids, web o nativo | 5 minutos | 8 horas; sin “recordarme” |
| App nativa personal, familia | Bloquear vista privada tras 2 minutos en segundo plano; desbloquear localmente | Autorización renovable hasta 30 días, expira también tras 7 días sin uso verificado |

En móvil personal, el bloqueo local no equivale a cerrar la sesión ni reemplaza autorización del servidor. Acceso API de corta duración: candidato 10 minutos, con renovación rotada y detección de reutilización según proveedor. La renovación no prolonga indefinidamente el límite de 30 días ni demuestra actividad humana. Coordinación/finanzas y equipos compartidos mantienen los límites breves del servidor también en móvil; no heredan 30 días. Verificar viabilidad con proveedor antes de implementar. Biometría del sistema o desbloqueo seguro del dispositivo protege la reapertura local; no recopilar biometría en Shalom ni tratarla como MFA del servidor por sí sola.

El servidor calcula expiración y rechaza sesiones revocadas. Polling, trabajos y renovación automática no reinician inactividad por sí solos. Señales del cliente ayudan a UX, pero un cliente modificado puede simular actividad: el límite absoluto y la reautenticación siguen siendo necesarios. Un nuevo acceso rota identificadores y exige los factores de su política.

Reautenticación reciente, candidata de los últimos 5 minutos, para cambiar identidad/MFA, conceder privilegios o confirmar exportaciones sensibles. Cambiar contraseña, recuperar cuenta, desactivar usuario o reportar dispositivo perdido revoca sesiones/renovación según alcance; permisos se comprueban en cada petición. Logout limpia vista/cachés y revoca servidor; cerrar una pestaña no garantiza logout. Definir revocación de access tokens breves mediante comprobación de sesión o mecanismo equivalente para no prometer efecto instantáneo sin soporte.

Aviso accesible antes del vencimiento por inactividad, inicialmente con 2 minutos de anticipación y acción sencilla para continuar. Resolver ajuste/extensión del tiempo según WCAG 2.2.1: diseñar al menos diez extensiones simples del plazo de inactividad y recuperación del flujo tras reautenticación al alcanzar el máximo absoluto; revisar que el conjunto satisface el criterio o justificar una excepción real, no declarar que toda sesión es excepción de seguridad. Borradores sensibles solo en servidor con autorización, caducidad y conservación definida; no localStorage. Tras volver a autenticar, recuperar borrador autorizado y revisar antes de enviar. Nada de envíos automáticos por restauración.

## Respaldos y recuperación

Objetivos iniciales del servicio completo: pérdida máxima deseada de datos confirmados de 15 minutos (RPO) y restauración en 4 horas (RTO) desde declaración del incidente. Sujetos a ensayo y costos; un objetivo no es garantía del proveedor. Para Kids, preparar procedimiento manual restringido de continuidad que mantenga verificación de entrega, conciliación posterior y custodia de cualquier papel. La app no inventa confirmaciones sin conexión.

| Protección propuesta | Frecuencia / conservación inicial |
| --- | --- |
| Base PostgreSQL y registros para recuperación a un punto en el tiempo (PITR) | Archivado continuo; vigilar retraso para cumplir RPO; ventana inicial de 14 días |
| Respaldo base compatible con esa cadena de recuperación | Diario, o frecuencia equivalente validada del servicio administrado; cadena completa necesaria durante la ventana |
| Copia recuperable separada del entorno productivo | Diaria, 30 días; permisos independientes e inmutabilidad/bloqueo de borrado con plazo revisado |
| Ensayo de restauración | Mensual y antes de cambios de alto riesgo; simulacro integral trimestral |

La base diaria por sí sola permite perder casi un día; PITR necesita respaldo base más cadena de registros íntegra. Una réplica no sustituye respaldo: puede replicar borrados o corrupción. Replicar/cifrar objetos privados y sus versiones con objetivo de recuperación coherente con referencias de base; incluir configuración recuperable y dependencias de llaves, sin copiar secretos junto al respaldo. Sin respaldo de objetos no se restaura el servicio completo.

Alertar por fallo, retraso y ausencia de copias; designar responsable y suplente. Restaurar en entorno aislado antes de reabrir, verificar integridad y muestra funcional, medir RPO/RTO reales y registrar evidencia sin datos sensibles. Tras restaurar, invalidar sesiones antiguas, reconciliar eventos externos/colas para evitar reenvíos y reaplicar revocaciones/supresiones/borrados posteriores al punto restaurado mediante registro protegido. No copiar respaldos productivos a desarrollo. Ajustar conservación con revisión legal: no retener indefinidamente “por si acaso”; documentar expiración de copias y retenciones excepcionales por incidente.

## Procedimiento ante sospecha de filtración

1. Activar responsable técnico, responsable de datos y suplentes; registrar hora, alcance conocido e incertidumbre en canal restringido. Prioridad inmediata si involucra menores, credenciales o extracción activa. Meta interna de primera evaluación: 1 hora desde alerta; no plazo legal ni promesa de atención sin personal asignado.
2. Contener: restringir endpoint/cuenta afectada, pausar exportaciones/envíos y bloquear vías de exfiltración. Revocar sesiones y credenciales comprometidas. Preservar registros/evidencia con acceso mínimo y trazabilidad; no borrar el servidor ni publicar evidencia con datos personales.
3. Determinar sistemas, categorías, personas y periodo afectados; distinguir evidencia de exposición, acceso y extracción. Revisar proveedores y respaldos. Restaurar no revierte una divulgación. No afirmar ausencia de filtración solo porque no hay logs.
4. Coordinar con asesoría jurídica los avisos a afectados y otras obligaciones aplicables, sin esperar un informe final para valorar notificación inmediata. Canal seguro y mensajes claros: qué se sabe, datos involucrados, medidas de protección y contacto; comunicación al representante verificado cuando corresponda. No enviar listas de víctimas ni secretos en avisos.
5. Corregir causa, rotar secretos/llaves según alcance con plan de recuperación, probar y volver gradualmente. Mantener evidencia, decisiones y comunicaciones; informe posterior con responsables y fechas para medidas preventivas. Simular el procedimiento antes del piloto.

## Revisión legal inicial: México

Supuesto: Shalom opera como entidad privada en México; confirmar responsable jurídico y países de usuarios/proveedores. No es dictamen ni aviso legal terminado.

La LFPDPPP vigente consultada (reforma 14-11-2025) incluye creencias religiosas entre datos sensibles (art. 2); exige medidas de seguridad (18) y notificación inmediata a titulares cuando una vulneración afecta significativamente sus derechos patrimoniales o morales (19). No adoptar automáticamente el plazo europeo de 72 horas. Revisar consentimiento para datos sensibles y financieros, excepciones y evidencia (7–9); aviso de privacidad, ARCO, transferencias y conservación.

Antes de operar, asesoría jurídica debe validar: entidad responsable/contacto; bases por finalidad; representación de menores y autorizaciones de imagen separadas; contratos con proveedores, ubicaciones y transferencias; plazos de atención y conservación por categoría, incluidos recibos; cancelación y respaldos; obligaciones y canales de notificación. Un checkbox o aviso publicado no acredita cumplimiento. Separar aceptación informada de suscripción optativa y limitar datos a finalidades necesarias.

## Evidencia y pendientes

Faltan proveedor, presupuesto, volúmenes, personal de respuesta, prueba de restauración y validación jurídica. No hay datos suficientes para afirmar RPO/RTO alcanzados, conformidad WCAG o seguridad implementada. Antes del piloto: inventario de campos, pruebas de roles/sesiones, revisión manual de accesibilidad, recuperación completa e incidente simulado. Mantener evidencia privada sin datos de personas en Git.

## Fuentes

- [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/), [tiempos ajustables](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) y [autenticación accesible](https://w3c.github.io/wcag/understanding/accessible-authentication-minimum.html).
- [OWASP: sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) y [sesiones móviles](https://mas.owasp.org/MASWE/MASVS-AUTH/MASWE-0024/).
- [PostgreSQL: archivado continuo y PITR](https://www.postgresql.org/docs/17/continuous-archiving.html).
- [Cámara de Diputados: LFPDPPP vigente](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf), artículos citados arriba. Verificar nuevamente al implementar y antes de operar.
