# Shalom App · Microinteracciones v0.5

**Estado:** prototipo visual interactivo; no es un sistema de producción.  
**Fecha:** 23 de octubre de 2026.

## Alcance publicado

La versión v0.5 añade movimiento funcional y accesible a la página principal, la navegación y Cafetería Shalom, sin introducir dependencias JavaScript ni efectos continuos.

### Aplicación general (`index.html`)

1. **Entrada al inicio:** aparición escalonada breve de encabezado, bloque principal, anuncios multimedia y tarjetas.
2. **Navegación:** transición de 380 ms al cambiar de sección; no se repite al cambiar valores de formularios o al actualizar estado.
3. **Anuncios:** elevación óptica mediante borde y ampliación de imagen de hasta 2.5 % **solo en dispositivos con hover**. Los videos **no se reproducen automáticamente**.
4. **Modales:** entrada de 240 ms y velo de 170 ms.
5. **Botones:** respuesta táctil breve, sin bloquear la acción.
6. **Confirmaciones:** animación corta en el mensaje flotante; incluye las confirmaciones del flujo simulado de asistencia de Kids, sin añadir gestos a un sistema real.

### Cafetería (`cafeteria.html`)

1. **Cambio de Caja → Preparación → Seguimiento:** transición de 320 ms solo cuando cambia la pantalla.
2. **Carrito:** el total y la última línea registrada responden en 200–250 ms al agregar o modificar productos; no reinicia toda la animación del menú.
3. **KDS:** una comanda nueva aparece con transición de 320 ms; el efecto sucede una vez, no cada 45 segundos con la actualización de tiempos.
4. **Estado por estación:** un breve realce de la etiqueta tras pulsar *Iniciar preparación* o *Marcar listo*, tanto en bebidas como en alimentos.
5. **Recibo y modificaciones:** modales de 220 ms, respetando el contenido específico del pedido.
6. **Interfaz accesible:** las palabras de los estados («Pendiente», «Preparando», «Listo») se mantienen, sin depender exclusivamente del color.

## Accesibilidad y desempeño

- Se respeta `@media (prefers-reduced-motion: reduce)`: sin animaciones ni cambios de escala, conservando funciones y controles.
- No se usaron videos de fondo, `setInterval` para animaciones, librerías pesadas ni transformaciones del logotipo.
- CSS basado en `opacity` y `transform` para evitar cambios de maquetación.
- No se anima cada actualización periódica del KDS.
- Valores y duraciones son propuestos, no datos de investigación con usuarios.

## Verificación

La navegación, la captura de capuchino y alimento con modificadores, confirmación simulada de pago, envío a cocina, avance por estación, seguimiento y cierre de pedido pasaron en resoluciones de **390×844, 810×1000 y 1366×950**. También se verificó el modo de movimiento reducido en esas resoluciones, sin errores JavaScript ni desbordamientos horizontales.

## Fuera de alcance

- Los correos, cobros, autenticación, sincronización entre tablets y notificaciones externas siguen **sin implementarse**.
- Los pedidos se guardan **localmente** en el navegador. No introducir datos reales de personas, menores ni tarjetas.
- Shalom Kids existente (Google Sheets y Apps Script) no fue modificado.
- La integración de Mercado Pago depende de verificar el modelo del equipo y las API disponibles.
- No se garantiza reducción en tiempos de preparación sin un piloto en la cafetería.

## Abrir

- [Shalom App](../index.html)
- [Cafetería Shalom](../cafeteria.html)

Paleta oficial: Noche #1a1a1a, Crema #faf7f2, cobre #c8956c; tipografía Inter y tarjetas con bordes sin sombra, conforme a la guía de estilos de Iglesia Shalom.
