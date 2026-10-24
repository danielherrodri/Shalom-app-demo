# Auditoría visual y accesibilidad · Shalom v0.5 → v0.6

23 de octubre de 2026. Base pública: e9aa3e4, README v0.5. Guía aportada: octubre 2026, 12 páginas; se leyó completa y se contrastó visualmente la página de tokens. Logo y variantes suministrados por el usuario. El PDF fuente se mantiene fuera del repositorio público.

## Opinión del sistema de diseño

La identidad sobria funciona para una iglesia que busca cercanía y claridad. Tres colores de marca son suficientes. El problema principal no es falta de color: es que demasiados elementos reciben la misma superficie, radio, peso y protagonismo. Los carteles de ejemplo ocupaban más espacio que el mensaje; los listados carecían de búsqueda y las preferencias no tenían un lugar propio. Añadir acentos arbitrarios haría más difícil distinguir Kids y los estados de operación.

La mejora conserva la familia visual y usa jerarquía, espacio, superficies y fotografía de referencia en un lugar explícito. La guía define colores y composición; no resuelve por sí sola permisos, navegación, formularios, errores, consentimientos, compatibilidad email o accesibilidad de interacción. Esas reglas ahora se documentan como componentes y flujos, sin declarar conformidad global.

## Alcance y evidencia

Se inspeccionaron inicio y cafetería en navegador y el código de las vistas existentes antes de diseñar el nuevo módulo. La comparación final usa la base Git inmutable v0.5: 15 vistas × 2 temas × 2 anchos (390 y 1366) = 60 revisiones automatizadas, más capturas de muestra de inicio, avisos, perfil y personas. El nuevo estado repite esas 60 combinaciones. Los detalles de contraste, nombres y estructura se comprobaron con axe; las capturas sustentan jerarquía y espaciado en las vistas representativas. Esto no equivale a una sesión con lectores de pantalla o usuarios.

Vistas examinadas: inicio, estacionamiento, familia, Kids demo, eventos, aportaciones, cafetería desde la app, proyectos, avisos, perfil, voluntarios, administración, personas, configuración y acceso. La cafetería independiente se revisó visualmente y mediante un recorrido de caja → preparación → seguimiento → recibo. Kids real queda fuera.

## Hallazgos y cambios

| Hallazgo v0.5 | Impacto | Acción v0.6 |
| --- | --- | --- |
| Pesos visuales muy similares; carteles ficticios repetidos dominan anuncios. | Moderado: difícil priorizar lectura. | Portada con resúmenes de texto y acceso al centro; fijado como primer nivel, metadatos claros, imagen/video diferenciados. |
| Sin centro de preferencias/privacidad; Avisos no aparece en toda navegación móvil por rol. | Alto: flujo incompleto. | Centro independiente con navegación móvil persistente y enlaces desde inicio, perfil y pies de página. |
| Tablas/listas sin búsqueda, filtros ni paginación. | Moderado: poca escalabilidad. | Herramientas reutilizables y CSV filtrado; controles propios en comunicaciones y galería. |
| Botón Crema usaba cobre oscuro y texto blanco. Pasa contraste pero no sigue la combinación de botón de la guía. | Consistencia, no fallo AA de esa pareja. | Cobre-500 con Noche en texto, cobre-700 reservado al texto de color. |
| Controles de cantidad en cafetería de unos 26 × 25 px y varios botones pequeños. | Dificultad táctil. | Controles de 44 px y foco visible para enlaces. 44 px es una meta de diseño, no se presenta como requisito AA de WCAG 2.1. |
| Falta de salto al contenido y estado de navegación explícito. | Teclado/lectura. | Enlace de salto y aria-current. El nuevo módulo usa landmarks, labels y diálogo nativo. |
| Modales anteriores no contenían el foco ni lo restauraban de forma completa. | Teclado. | Auxiliar acotado para app/cafetería; fondo inerte, Tab dentro del diálogo, Escape y restitución del disparador. |
| Aviso interno de Kids demo heredaba texto claro sobre superficie clara en tema Noche. | Grave para contraste en ese bloque. | Color local a esa tarjeta en el prototipo. Dos instancias del mismo fallo en la matriz base; cero en la matriz nueva. |
| Títulos internos v0.3/v0.4 aunque README declaraba v0.5. | Confusión de revisión. | App identificada v0.6; cafetería conserva versión operativa v0.5. Base documentada por SHA. |
| Adjuntos de correo con fuente Georgia y naranja brillante con texto blanco. | Inconsistencia de marca y posible contraste insuficiente. | Plantillas nuevas con Inter/Arial, fuego-700 y on-fuego; sin envoltura de exportación ni scripts. |

## Contrastes y estados

La guía distingue cobre de relleno y cobre de texto. Valores aproximados calculados con luminancia sRGB:

- #c8956c / #1a1a1a: ~6.6:1. Adecuado para botón y etiquetas en Noche.
- #c8956c / #faf7f2: ~2.5:1. No se usa como texto pequeño en Crema.
- #82552f / #faf7f2: supera 4.5:1. Texto de acento claro.
- #fff0e7 / #b84810: supera 4.5:1. Botón temático Kids.

Los nuevos formularios distinguen error con texto y borde, no únicamente color. La confirmación indica alcance de demo en lenguaje claro. Los tonos semánticos no se introducen como nuevos colores de marca. Sin sombras nuevas, sin videos automáticos, sin ciclos de animación; movimiento reducido elimina entradas y transiciones.

## Fotografía y aspectos pendientes

La guía pide fotos reales de la iglesia. No se aportaron fotos de la comunidad autorizadas. Se incluye una foto de café con licencia como **referencia claramente rotulada**, no como evidencia de un evento o de instalaciones de Shalom. No hay fotos de menores; para producción faltan autorización y control de finalidad, vigencia, audiencia y distribución de imágenes.

Quedan pendientes la prueba con personas mayores/familias/coordinación, zoom real de navegador y tecnologías de asistencia (NVDA/VoiceOver), Safari/iOS, tamaños de texto del sistema y clientes reales de correo. El reflujo se prueba por viewport; una matriz de navegadores no se sustituye con un escaneo automático. No hay certificación WCAG ni cumplimiento legal o seguridad productiva implícitos.

### Ajuste de logo al cambiar de tema

La cabecera común mantenía un bloque Noche con logo blanco en ambos temas. Aunque conservaba contraste, no acompañaba el tema Crema y podía percibirse como una variante incorrecta. El acceso y los perfiles ahora muestran el logo negro sobre fondo Crema y el blanco sobre Noche; Comunicaciones sigue la misma regla. Las piezas con cabecera local oscura, como los correos, mantienen el blanco sobre ese fondo.
