# Arquitectura de información · Shalom App

**Fecha:** 24 de octubre de 2026 · **Alcance:** demostración pública de GitHub Pages. La plataforma real Shalom Kids y la base Django/React siguen proyectos distintos.

## Experiencia compartida

Toda pantalla pública usa la misma barra **Áreas de Shalom**, con cinco destinos inequívocos:

| Área visible | Ruta pública | Uso |
|---|---|---|
| **Inicio** | `index.html` | Bienvenida, servicios generales y exploración contextual por perfil de demostración |
| **Shalom Kids** | `design/kids-paneles.html#inicio` | Vistas de ejemplo para docentes, coordinación y otros equipos; **no** incluye registros reales |
| **Cafetería** | `cafeteria.html` | Caja, Preparación y Seguimiento de pedidos simulados |
| **Avisos** | `comunicaciones.html#avisos` | Comunicados, preferencias y privacidad (demo sin consentimientos reales) |
| **Tu opinión** | `feedback.html` | Valoración ficticia por servicio, con seguimiento solo en memoria |

Se retiró el vínculo global ambiguo «Explorar nuevos mockups»: enviaba a Kids incluso desde páginas ajenas. También se retiró el botón flotante duplicado de «Compartir mi experiencia»; ahora se utiliza **Tu opinión** en la barra compartida. Desde Cafetería y Kids se preselecciona el servicio adecuado por query string; el formulario sigue admitiendo cambiar de servicio. La navegación compartida y el menú local son conceptos distintos: **áreas** para moverse entre servicios, **pestañas internas** para realizar tareas.

## Reglas de interfaz

- La barra común la genera `assets/shalom-navigation.js` (configuración central de cinco rutas) y la representa `assets/shalom-navigation.css`. No duplicar rutas a mano en plantillas nuevas.
- `aria-current="page"` identifica el área actual; los enlaces se pueden usar con teclado y la barra se desplaza horizontalmente en pantallas angostas.
- El tema Noche/Crema se controla en `assets/shalom-theme.js` para **las cinco páginas**, incluido `feedback.html`. Se recuerda en `localStorage['shalom-ui-theme-v1']` solo en el mismo origen; cada dominio (GitHub Pages o ChatGPT Sites) mantiene su preferencia. No almacenar allí opiniones, consentimiento, correos ni datos reales.
- La página **Tu opinión** no conserva opiniones entre recargas y no envía mensajes. Los perfiles y accesos internos son una simulación.
- Evitar «mockups nuevos» o números de versión como títulos de navegación para usuarios. Los detalles técnicos permanecen en documentación, no en la portada.

## Arquitectura técnica (sin integración ficticia)

```text
index.html                      Inicio público
design/kids-paneles.html        Shalom Kids · vistas demo
cafeteria.html                  Cafetería · flujos de pedidos demo
comunicaciones.html             Avisos · comunicación demo
feedback.html                   Tu opinión · formulario demo
assets/shalom-navigation.js     Única definición de áreas y URLs
assets/shalom-navigation.css    Barra visual común
assets/shalom-theme.js          Preferencia Noche/Crema
assets/shalom-theme.css         Paletas de los módulos
frontend/                       Base de desarrollo React (no publicada en GitHub Pages)
backend/                        API Django, acceso y autorización independientes
```

## Verificación

`npm run test:structure` comprueba las cinco rutas, que opinión cargue tema, la ausencia del botón ambiguo, la coherencia de etiquetas y ausencia de barras duplicadas. `npm run test:theme` verifica migración, persistencia y sincronización de preferencias. El job `frontend-ux` ejecuta ambas. Se necesita adicionalmente validación manual de contrastes claros/oscuros, navegación teclado/lector de pantalla, 320–390px y recorridos reales sobre Safari iOS y Android antes de considerar conformidad con WCAG.

**Limitación:** fusionar este PR en `main` actualiza el código de GitHub Pages cuando el alojamiento publique su versión; no modifica por sí solo un sitio separado `chatgpt.site`.
