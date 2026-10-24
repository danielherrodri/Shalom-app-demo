# Shalom · Prototipo interactivo v0.3

Interfaz integral de Iglesia Cristiana Shalom. **Demo pública**, sin datos reales, pagos, autenticación segura ni integración con Shalom Kids.

## Abrir en navegador

https://danielherrodri.github.io/Shalom-app-demo/

Si GitHub Pages todavía muestra una página vacía, revisar **Settings → Pages → Deploy from a branch → main → /(root)** y esperar a que termine la publicación.

## Cambios de la versión 0.3

- **Inicio de sesión de demostración** con roles ficticios: congregante, voluntario y administrador. No se solicitan contraseñas reales. Se puede continuar como visitante.
- Las vistas personales llevan a iniciar una sesión **simulada**. No es un sistema de autorización seguro.
- **Anuncios en el inicio:** formato visual 16:9 para imágenes y videos, con texto breve, llamados a la acción y adaptación móvil.
- **Publicación de anuncios de prueba** desde administración: texto, URL HTTPS de imagen, YouTube o MP4. Los datos quedan almacenados exclusivamente en el navegador en el que se crearon.
- Los videos se reproducen solamente cuando el visitante hace clic, sin reproducirse automáticamente.
- Se conservan los módulos de estacionamiento, familia, Shalom Kids, eventos, aportaciones, cafetería, proyectos y comunicaciones de prueba.
- Tema institucional Noche/Crema, tipografía Inter y colores exactos de la Guía de estilos octubre 2026.

## Límites importantes

Este prototipo se sirve como un archivo HTML estático (GitHub Pages). **GitHub Pages no puede autenticar usuarios ni alojar una base de datos de producción por sí solo.** No se comparten los anuncios agregados con otros dispositivos o visitantes. No publicar fotografías privadas, videos de menores sin autorización, CURP, cuentas bancarias, nombres reales o contraseñas.

Para un sistema productivo se necesitarán autenticación real con backend y sesiones seguras, autorizaciones por rol en servidor, gestión de archivos multimedia, almacenamiento, revisiones editoriales, consentimiento para imágenes de menores y sincronización con las demás funciones.

El sistema existente de Google Sheets / Apps Script de Shalom Kids no fue modificado.

## Repositorio

El punto de entrada es `index.html`, que incluye el código necesario para recorrer el prototipo.
