# Shalom · aplicación del manual visual 2026

**Estado:** paletas complementarias aprobadas para el prototipo público el 27 de octubre de 2026 (`palette2026` en `assets/design-tokens.json`). No sustituyen la guía oficial: el cobre de Iglesia y el fuego/oro de Kids siguen siendo los acentos principales.

**Fuente de diseño:** `Manual_Identidad_Visual_Shalom_2026.pdf` (octubre de 2026, 20 páginas; la página 14 «Reglas para celular» es nueva). Para trabajar con producción, solicitar aprobación y conservar una versión maestra de la guía.

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

Las cinco páginas comparten tokens. Kids usa fuego como color primario; las acciones rápidas de su prototipo se diferencian de manera semántica, manteniendo el diseño Noche/Crema de toda la demo. El proyecto operativo `shalom-kids-clasp` aplica las mismas reglas en su propia rama; esta demo no introduce datos personales.

## Reglas para celular y componentes (págs. 12–14)

`assets/shalom-celular-2026.css` se carga al final en las cinco áreas y `tests/manual-celular.cjs` lo vigila.

| Regla | Aplicación en la demo |
| --- | --- |
| Escala celular (hasta 599 px) | H1 32/800, H2 24/700, H3 18/700, etiqueta 13/600, cuerpo 16/400, notas 14/400; nada por debajo de 12 px |
| Escala web (desde 600 px) | H1 48/800, H2 40/700, H3 20/700 |
| Diseño | Una columna hasta 599 px, dos desde 600 px; margen lateral, separación y relleno de 16 px |
| Radios | 24 en tarjetas, 16 en campos y avisos, píldora en botones; ningún otro valor (los círculos de íconos usan 50 %) |
| Sombras | Ninguna, tampoco en barras fijas, modal ni aviso flotante: se separan con un borde de 1 px |
| Navegación | Barra inferior de máximo 5 destinos con ícono y texto; activo en cobre, subrayado y con `aria-current`. «Iniciar sesión» solo en el encabezado |
| Nombres | Uno por concepto en barra, menú y título: Estacionamiento, Shalom Kids, Iniciar sesión, Cerrar sesión, Administración, Voluntariado, Mi agenda, Cafetería, Tema Noche/Crema |
| Interacción | Áreas táctiles de 44 px y 8 px entre controles; foco de 2 px en cobre-500 separado 2 px |
| Filtros | Opciones avanzadas detrás de «Filtros»; Procesamiento y Administrar ocultos sin sesión de administración |
| Estados | Deshabilitado en ink-muted sin transparencia; error en texto bajo el campo con ícono; el rojo «live» queda reservado para «En línea»; vacíos que dicen qué pasa |
| Horas | 9:00 AM y 1:00 PM |

`assets/design-tokens.json` recoge los tokens completos de Noche, Crema y Kids, las dos escalas y los radios.

## Reglas de validación

- Contraste objetivo de texto normal de al menos 4.5:1, probado con los pares texto/superficie.
- Botones y enlaces con foco visible y nombres/etiquetas: el color no comunica por sí solo.
- Revisar cada pantalla en un teléfono de 360 px con el texto ampliado y en los temas Noche y Crema (prueba final de la pág. 14), además de 320, 390 y 430 px y pantallas grandes.
- Mantener «Áreas de Shalom» compacto en móviles y navegación inferior estable.
- Al aprobar institucionalmente la paleta ampliada, actualizar la guía oficial antes de presentarla como norma.
