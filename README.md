# Shalom App · Prototipo público v0.7

Inter, Noche, Crema y cobre. **Solo ejemplos ficticios. Sin backend, autenticación, correos, cobros o consentimientos reales.** El sistema real Shalom Kids no se modifica.

## Áreas de Shalom

La navegación principal conecta cinco espacios: **Inicio**, **Shalom Kids**, **Cafetería**, **Avisos** y **Tu opinión**. Las pestañas internas se reservan a las tareas de cada módulo. Estas páginas son demostraciones, no los sistemas productivos. El tema Noche/Crema se conserva al navegar por todas las áreas en un mismo navegador y dominio. Documentación: [Arquitectura de información](docs/arquitectura-areas-v01.md).

## Evolución visual institucional 2026 (propuesta)

La identidad oficial permanece: Inter, logotipos originales blanco/negro, Noche/Crema y cobre en Iglesia; fuego/oro en Kids. La nueva hoja compartida `assets/shalom-visual-2026.css` usa los colores complementarios **aprobados para el prototipo** el 27 de octubre de 2026 para distinguir funciones sin sacrificar contraste. Alcance, tokens, accesibilidad y asignación semántica: [Identidad visual 2026](docs/identidad-visual-propuesta-2026.md). No modifica el Shalom Kids operativo.

## Explorar

- [Shalom Kids · Vistas de docentes, coordinación y otros equipos](https://danielherrodri.github.io/Shalom-app-demo/design/kids-paneles.html#inicio)

- [App principal](https://danielherrodri.github.io/Shalom-app-demo/)
- [Avisos y comunicaciones](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#avisos)
- [Preferencias](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#preferencias)
- [Privacidad](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#privacidad)
- [Administración simulada](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#admin)
- [Ocho plantillas de correo](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#correos)
- [Cafetería v0.5](https://danielherrodri.github.io/Shalom-app-demo/cafeteria.html)

## Estructura y mejoras UX/UI

La primera fase de armonización visual ya está integrada en la rama principal, y esta iteración reúne los accesos bajo cinco áreas con nombres claros, tema persistente y una página de opiniones coherente con el resto. Véanse [primera fase UX/UI](docs/ux-implementacion-v01.md) y [arquitectura de áreas](docs/arquitectura-areas-v01.md). La base React/Django continúa separada de estos prototipos públicos y **no reemplaza el Shalom Kids operativo**.

## Qué cambia en v0.7

Avisos de texto/imagen/video con categorías, vigencias, fijación, audiencias y ministerios de ejemplo; borradores, edición, programación por reloj simulado y archivo reversible. Búsqueda, filtros y paginación conservados. Las exportaciones de información ahora son solicitudes en cola de todos los resultados filtrados, con entrega por correo simulada, sin descargar ni crear archivos de datos. Galería de correos Shalom/Kids, HTML y texto plano editables, con búsqueda y filtro; las descargas HTML/TXT siguen disponibles como material de diseño.

Preferencias optativas independientes, revocación, correos esenciales diferenciados, aviso versionado de borrador, autorizaciones separadas de imagen interna/difusión de menores y solicitudes de exportación/eliminación **sin enviar ni ejecutar**. No se afirma cumplimiento legal.

**Comunicaciones vive solo en memoria**: sus cambios funcionales desaparecen al recargar. No guarda decisiones de correo o privacidad en localStorage/sessionStorage ni manda formularios. La única preferencia compartida que se almacena es el tema visual claro/oscuro. La app anterior y cafetería conservan ejemplos locales en el mismo navegador; no se sincronizan entre dispositivos. Nunca introducir información real. La administración de demo es pública y sus roles no son seguridad.

El [centro de procesamiento demo](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#procesamiento) permite probar prioridades, lotes, cuota, reintentos, correo muerto y conciliación. Todo su estado desaparece al recargar.

## Ejecutar localmente y editar

Requiere Node.js 20 o posterior. `npm ci`, después `npm run serve`, y abrir http://127.0.0.1:4173/. También puede alojarse como archivos estáticos. No hay proceso de compilación ni secretos de entorno.

- `comunicaciones.html` y `assets/comunicaciones.*`: módulo nuevo.
- `assets/design-tokens.json`: tokens editables.
- `assets/list-tools.*`: herramientas reutilizables de listados.
- `emails/catalogo.json` + `python tests/build-emails.py`: edición y generación de plantillas.
- `emails/*.html` y `emails/*.txt`: archivos editables/descargables. Los links relativos son para demo y deben sustituirse al preparar un envío real.

Pruebas: `npx playwright install chromium`, `npm test`, `npm run test:processing`, `npm run test:additional` y `npm run test:logos`. Los navegadores de pruebas pueden instalarse en `.pw-browsers` (ignorado); ver [pruebas y límites](docs/pruebas-v06.md).

## Entregables y decisiones

- [Auditoría visual](docs/auditoria-diseno-v06.md)
- [Recorridos, especificación y roadmap de producción](docs/comunicaciones-v06.md)
- [Borrador de aviso de privacidad](docs/aviso-privacidad-DEMO.md)
- [Borrador de aviso de privacidad de producción (México, para revisión legal)](docs/aviso-privacidad-produccion-BORRADOR-v01.md)
- [Plantillas de correo y compatibilidad](docs/plantillas-correo-v06.md)
- [Arquitectura y releases v0.7](docs/pipelines-releases-v07.md)
- [Registro de decisiones](docs/decisiones.md)
- [Propuesta de arquitectura, datos y seguridad](docs/arquitectura-seguridad-v08.md)
- [UX, accesibilidad, sesiones, respaldos e incidentes](docs/ux-operacion-v08.md)
- [Protección y cifrado de datos del usuario](docs/cifrado-datos-v07.md)
- [Reglas y controles de desarrollo seguro](docs/desarrollo-seguro.md)
- [Pruebas v0.7](docs/pruebas-v07.md)
- [Medios y licencias](assets/LICENCIAS.md)

La fotografía de café es una referencia licenciada, rotulada como ajena a Shalom; sustituir por foto de la iglesia autorizada antes de producción. Logo aportado por el usuario. No hay fotografías de menores. El clip local es tipografía de seis segundos, sin sonido ni autoplay.

Base verificada: `main` e9aa3e4 (README v0.5), sin etiqueta Git v0.5. Esta entrega no convierte la app en servicio operativo. El roadmap cubre backend, roles y segmentación en servidor, almacenamiento seguro, evidencia de decisiones, colas de email, separación transaccional/marketing, baja real de un clic y revisión profesional de privacidad.

Documentación anterior de cafetería: [diseño v0.4](docs/cafeteria-diseno-mvp-v04.md), [requisitos](docs/cafeteria-requisitos-arquitectura.md), [movimiento v0.5](docs/microinteracciones-v05.md).

## Tu opinión en Shalom

[Formulario y seguimiento de opiniones](https://danielherrodri.github.io/Shalom-app-demo/feedback.html): experiencia común por servicio, incluido Kids. Prototipo en memoria; no recibe opiniones reales y se reinicia al recargar. [Alcance y pendientes de producción](docs/feedback-v01.md).

## Ideas integradas del primer prototipo

- **Marco común en celular** (fase 1 de la propuesta UX): una sola franja «Versión de demostración» con el botón **Aa** y la misma barra inferior en las cinco áreas (Inicio · Eventos · Kids · Cafetería · Más). Las pestañas propias de Cafetería y Avisos van arriba del contenido; los accesos del perfil en Inicio, Avisos y Tu opinión están en «Más».
- **Aa · Accesibilidad**: tema Noche o Crema, texto Normal, Grande o Máximo y «Reducir movimiento». Las preferencias se conservan en este navegador al recargar y navegar.
- Los colores nuevos de la propuesta están en `assets/design-tokens.json` bajo `palette2026`, aprobados para el prototipo.
- **Inicio reordenado** (fase 2): bienvenida con «Soy nuevo» y «Ver reunión en línea», reuniones con «Cómo llegar», próximos eventos, cuatro accesos rápidos (Kids, Cafetería, Estacionamiento, Tu opinión), novedades y el versículo del día al final. Horarios y dirección quedan entre corchetes hasta tener los oficiales.
- **Kids claro, familias y perfiles de ejemplo** (fase 3): Kids abre en tema claro (blanco con acentos fuego y oro) y guarda su propia preferencia; Noche sigue disponible. En Inicio → Shalom Kids, la familia ve **Mis hijos** con su grupo, **Registrar entrada** (queda «Por confirmar» hasta que el equipo la valida en el salón) y la asistencia reciente. «Ver como» se reemplaza por una **sesión de ejemplo** con cuatro perfiles: Congregante, Voluntario, Docente y Administración, también en el inicio de sesión de Shalom.
- **Vistas de la fase 4**: Eventos con filtros (Todos, En Shalom, Sede externa, Inscrito), lugares libres y lista de espera que asciende al liberarse un lugar; Cafetería con **Pide y recoge** para clientes (la barra inferior la abre a congregantes y visitantes; el pedido llega a preparación como «Paga al recoger»); aviso destacado a todo el ancho en Avisos; «Más» agrupado (Mi cuenta, Visita, Servir) con tarjeta de perfil y «Cerrar sesión»; Mi perfil con comunicación, privacidad y accesibilidad; estacionamiento para voluntarios con botones grandes de entrada y salida; y Tu opinión en tres pasos.
- **Eventos → Inscripción familiar**: seleccionar integrantes verificados, editar o cancelar la selección y respetar cupos sin duplicados. Solo registra perfiles ficticios en este navegador.
- **Voluntario / Administración → Mi agenda docente**: próximos servicios ilustrativos, preparación de clase y acceso a asistencia con grupo preseleccionado. Los avisos de ausencia y su retiro son simulaciones en memoria, sin notificar a coordinación ni asignar suplentes.

La agenda también se abre desde la vista de maestro en Shalom Kids. Los materiales de clase y la asistencia operativa siguen sin integración con los sistemas reales. Prueba de cupos, duplicados y cancelaciones: `npm run test:family`.
