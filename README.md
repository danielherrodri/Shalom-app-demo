# Shalom App · Prototipo público v0.7

Inter, Noche, Crema y cobre. **Solo ejemplos ficticios. Sin backend, autenticación, correos, cobros o consentimientos reales.** El sistema real Shalom Kids no se modifica.

## Explorar

- [Mockups actualizados: Kids, cocina, equipo y aportaciones](https://danielherrodri.github.io/Shalom-app-demo/design/kids-paneles.html#inicio)

- [App principal](https://danielherrodri.github.io/Shalom-app-demo/)
- [Avisos y comunicaciones](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#avisos)
- [Preferencias](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#preferencias)
- [Privacidad](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#privacidad)
- [Administración simulada](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#admin)
- [Ocho plantillas de correo](https://danielherrodri.github.io/Shalom-app-demo/comunicaciones.html#correos)
- [Cafetería v0.5](https://danielherrodri.github.io/Shalom-app-demo/cafeteria.html)

## Mejoras UX/UI en revisión

La primera fase de armonización visual y base React compartida se encuentra en una rama de revisión. Documentación: [primera fase UX/UI](docs/ux-implementacion-v01.md). No supone integración con Shalom Kids operativo.

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
