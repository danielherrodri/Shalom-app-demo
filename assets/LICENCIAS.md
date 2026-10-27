# Medios y licencias · prototipo público

- Logo blanco y negro: archivos proporcionados por el usuario para este proyecto. No se modifica su color, proporción o dibujo. No se concede licencia general de redistribución de la marca fuera del prototipo.
- Inter: fuente de Google Fonts, licencia SIL Open Font License 1.1. Texto completo en [Inter-LICENSE.txt](Inter-LICENSE.txt). Fuente original: https://github.com/rsms/inter y https://fonts.google.com/specimen/Inter. `font-source.css` registra el CSS de distribución consultado; el módulo utiliza únicamente el archivo local latin.
- `coffee-pexels-7241331.jpg`: «Cup of coffee placed on table», referencia consultada el 23 de octubre de 2026, https://www.pexels.com/photo/cup-of-coffee-placed-on-table-7241331/. Uso bajo [licencia Pexels](https://www.pexels.com/legal-pages/license). Archivo de distribución: https://images.pexels.com/photos/7241331/pexels-photo-7241331.jpeg. Sin personas ni atribución de pertenencia a la iglesia. La interfaz la identifica como referencia de demo. Reemplazar con foto real de Shalom autorizada antes de operar.
- `aviso-demo.webm`, `aviso-demo.vtt` y `video-poster.svg`: composición tipográfica local de seis segundos creada para el prototipo, sin audio, personas ni imágenes de eventos. Fuente editable del clip: `tests/create-demo-video.cjs`; no es fotografía o grabación de Shalom.
- No se publica el PDF de guía ni el HTML adjunto original. No se usan registros de Drive, maestros, alumnos, correos personales o enlaces productivos en los archivos nuevos.
# Filtro de HTML bíblico

DOMPurify 3.4.17, de Cure53 y colaboradores. Copia local para la demo en `assets/vendor/purify.es.mjs`, con licencia en `assets/vendor/DOMPurify-LICENSE.txt`; dependencia fijada en los manifiestos y archivos de bloqueo. Verificar con `node scripts/sync_bible_sanitizer.cjs --check`; actualizar mediante npm y sincronizar con ese mismo script sin `--check`.

Las imágenes y fuentes de YouVersion no se distribuyen en este repositorio. Se solicitan a sus servicios oficiales cuando exista una App Key autorizada; las imágenes requieren crédito visible y las tipografías permanecen en su CDN.

# Imágenes de prueba

`assets/prueba/*.svg`: ilustraciones geométricas locales creadas para el prototipo, sin personas ni fotos de Shalom. Cada una lleva el rótulo «IMAGEN DE PRUEBA» y acompaña textos lorem ipsum de relleno. Reemplazar con material autorizado antes de operar.
