# Shalom · aplicación del manual visual 2026

**Estado:** implementación de diseño propuesta para el prototipo público. No sustituye la guía oficial ni constituye aprobación institucional de las paletas complementarias.

**Fuente de diseño:** `Manual_Identidad_Visual_Shalom_y_Shalom_Kids_2026.pdf` (octubre de 2026, 19 páginas). Para trabajar con producción, solicitar aprobación y conservar una versión maestra de la guía.

## Identidad oficial conservada

- Iglesia: tipografía Inter; logotipo original en negro sobre Crema y blanco sobre Noche; tema Noche por defecto y Crema disponible con preferencia persistente; acciones primarias cobre, nunca colores secundarios.
- Iglesia, Noche: fondo `#1a1a1a`, superficies `#222222`, acento cobre `#c8956c`.
- Iglesia, Crema: fondo `#faf7f2`, superficie `#f2ece3`; enlaces/texto cobre `#82552f`, textos principales `#2d2d2d`.
- Kids: fuego `#b84810` (botón principal con texto blanco), fuego oscuro `#8f360c` (texto destacado) y oro `#5b430f` sobre `#fbf4e1`. No usamos el cobre y el fuego como dos acentos dominantes en una misma pieza.
- No recolorear el logotipo, no modificar proporciones, no utilizar fotografías infantiles sin autorizaciones.

## Paletas complementarias propuestas, no oficiales

Se asignan por significado, nunca como única señal de estado:

| Marca | Función | Texto | Fondo suave |
| --- | --- | --- | --- |
| Iglesia | Comunidad, familia, estacionamiento | Bosque `#24483e` | `#e4f0e7` |
| Iglesia | Avisos, recursos, proyectos | Cielo `#244f65` | `#e8f3f7` |
| Iglesia | Eventos, aportaciones, comunidad | Ciruela `#6e3d62` | `#f5e9f1` |
| Iglesia | Servicio, voluntariado, cafetería | Oliva `#5a5b28` | `#f2f0da` |
| Kids | Asistencia y reservas | Turquesa `#14635a` | `#d9f5ee` |
| Kids | Libros e información | Azul `#2e4f88` | `#e8f0ff` |
| Kids | Actividades/equipos | Violeta `#5f3c90` | `#f1e9ff` |
| Kids | Verificación/logro | Verde `#3b651c` | `#edf6df` |
| Kids | Avisos de atención/pendientes | Coral `#973d38` | `#fdece8` |

## Implementación y alcance

La hoja `assets/shalom-visual-2026.css` se carga después de los estilos actuales y **no modifica la lógica** de reservas, inscripciones, roles o asistencia. En App demo, los mosaicos tienen `data-shalom-category`, y las tarjetas de prueba de Kids tienen `data-kids-status` y `data-kids-module`. Se preservan los textos de estado visibles: «Verificado» y «Pendiente».

Las cinco páginas comparten tokens. Kids usa fuego como color primario; las acciones rápidas de su prototipo se diferencian de manera semántica, manteniendo el diseño Noche/Crema de toda la demo. No se realizan cambios al proyecto operativo `shalom-kids-clasp` ni se introducen datos personales.

## Reglas de validación

- Contraste objetivo de texto normal de al menos 4.5:1, probado con los pares texto/superficie.
- Botones y enlaces con foco visible y nombres/etiquetas: el color no comunica por sí solo.
- Revisar teléfonos de 320, 390 y 430 px y pantallas grandes, con texto normal y ampliado.
- Mantener «Áreas de Shalom» compacto en móviles y navegación inferior estable.
- Al aprobar institucionalmente la paleta ampliada, actualizar la guía oficial antes de presentarla como norma.
