# Iteración SPARK · jerarquía y experiencia móvil

**Fecha:** 24 de octubre de 2026 · **Punto de partida:** evaluación provisional 16/25.
**Alcance:** demo pública estática `Shalom-app-demo`. No cambia la plataforma operativa Shalom Kids ni permisos reales.

## Decisiones implementadas

1. **Accesos de tu perfil (Inicio):** el menú local inferior y la barra lateral conservan tareas del perfil; los enlaces entre sitios ahora aparecen como «Más áreas». En Inicio se omiten «Inicio» y «Avisos» de ese menú secundario porque ambos ya están disponibles en la navegación local. En otros módulos se omite el enlace al área activa.
2. **Inicio contextual:** primera acción destacada y dos accesos frecuentes según cuatro contextos de prueba: sin sesión, congregante, voluntariado, administración. El resto de funcionalidades permanece en «Explora otras funciones» y navegación local.
3. **Lectura y tactilidad:** cuerpo de 16 px en textos de contenido, notas de al menos 14 px en las tarjetas y controles de 44/48 px. «Ampliar texto» es visible sin abrir «Más áreas» y sigue siendo persistente.
4. **Kids móvil:** navegación interna con rejilla adaptable, sin desplazamiento lateral a 320–390 px; vistas y acciones existentes intactas.
5. **Semántica visual:** fuego indica pendientes/incidencias Kids; coral se reserva para comunidad/acompañamiento. Color nunca es la única señal de estado.
6. **Inscripción familiar:** tras guardar aparece un resumen con evento, lista de inscritos y número de integrantes, además de «Corregir selección». El cálculo de cupos y la validación de relaciones siguen en `shalom-family-model.js`.
7. **Herramientas de demo:** «Centro de procesamiento demo» queda disponible en la vista administrativa simulada, no en el pie público.

## Criterios de aceptación y pruebas

- [ ] Recorrer Inicio → Avisos → Cafetería → Kids → Tu opinión, sin quedar atrapado ni encontrar dos enlaces equivalentes en el mismo menú.
- [ ] Comprobar Inicio sin sesión y en perfiles persona, voluntario y admin: primer CTA útil, dos tareas secundarias distintas y el resto de módulos disponibles.
- [ ] Comprobar pantalla de 320, 360, 390 y 430 px; texto ampliado y zoom de navegador a 200/400%; sin desbordamientos ni objetivos táctiles minúsculos.
- [ ] Comprobar navegación con teclado, foco visible, lector de pantalla, modo Crema/Noche y `prefers-reduced-motion`.
- [ ] Inscribir 1, 2 y 0 integrantes verificados; verificar resumen y usar «Corregir selección». Probar cupos insuficientes y relaciones sin verificar.
- [ ] Confirmar que los datos, reservas, pagos y envíos siguen siendo **ficticios y locales**.

Los scripts de validación relevantes son `node tests/site-navigation.cjs`, `node tests/ux-guardrails.cjs`, `node tests/family-registration.cjs` y `node tests/visual-identity.cjs`. El workflow de GitHub comprueba estos guardarraíles, pero **no sustituye pruebas en Safari iOS y Android reales**.

### Próxima iteración

Pruebas de tareas breves con un congregante, un docente y una persona de administración. Medir si localizan la primera tarea y comprenden la confirmación sin ayuda. No presentar 21/25 como puntuación validada sin observaciones.
