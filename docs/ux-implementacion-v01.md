# Primera fase UX/UI unificada · Shalom

Actualización: 24 de octubre de 2026. Alcance: prototipo público v0.7 y **base de desarrollo** React v0.8, no el sistema Shalom Kids operativo.

## Objetivo

Reducir diferencias de navegación y legibilidad sin reescribir los cuatro prototipos, sin presentar controles de demostración como operaciones reales y sin convertir los roles simulados en autorización.

## Implementado

- Estilos compartidos en `assets/ux-unificado.css`, importados **después** de los estilos de Inicio, Cafetería, Comunicaciones y mockups Kids. Se emplea `data-shalom-space` en cada documento para limitar reglas entre módulos.
- Textos operativos y etiquetas aumentados, controles frecuentes de al menos 48 px como objetivo de diseño, navegación móvil con letras más legibles. Se conservan los 44 px ya aplicados a los controles de cantidad de Cafetería (ahora ampliados a 48 px).
- Cafetería muestra solo Caja, Preparación y Seguimiento en su navegación operativa; el contenido histórico de Propuesta permanece en el código como referencia, sin formar parte de las tareas diarias. Acceso a Inicio Shalom desde la cabecera móvil.
- Comunicaciones presenta Avisos, Preferencias y Privacidad en el menú móvil; los controles técnicos siguen en la zona de demostración de escritorio, no en el menú comunitario.
- Los mockups Kids muestran acceso a Inicio Shalom.
- La base React incorpora `ui/AppShell.tsx` y `ui/Primitives.tsx`. Presenta una portada contextual, una única navegación con variantes responsive, botones/etiquetas comunes, enlaces de salto al contenido y estados anunciables; no incorpora otras rutas hasta que existan autorización e integraciones reales.
- La vista Kids de la base React abre al ingresar, selecciona automáticamente un grupo asignado cuando solo hay uno y una sesión cuando solo hay una abierta en él, además de añadir búsqueda local sobre miembros ya autorizados. La API Django sigue siendo responsable de permisos y de registrar cada entrada.

## No modificado

No se alteraron API, sesiones, autenticación, modelo de datos, registros reales, pagos, envíos, consentimientos, registros de menores ni despliegues. En especial, **el prototipo React no reemplaza ni se sincroniza con Shalom Kids real**. Los archivos estáticos del prototipo público continúan como aplicaciones separadas; este cambio es una primera armonización, no una consolidación técnica final.

## Verificación

```bash
node tests/ux-guardrails.cjs
npm ci --prefix frontend
npm run build --prefix frontend
```

El CI comprueba el build TypeScript/React y las reglas de integración básica. Antes de integrar o desplegar, ejecutar también los flujos Playwright existentes (`npm test`, `npm run test:additional`, `npm run test:processing`, `npm run test:logos`) y el control de seguridad descrito en `docs/desarrollo-seguro.md`.

**Pendiente de prueba manual:** navegación completa en iOS Safari y Android, lector de pantalla, zoom al 200–400 %, teclado, reflujo en 320–390 px, mensajes largos, usuarios mayores y voluntarios. Un escaneo automático sin violaciones no equivale a conformidad WCAG 2.2 AA.

## Siguiente fase

1. Definir rutas y componentes compartidos por rol, con permisos comprobados **siempre en servidor**, y trasladar progresivamente vistas estáticas a React.
2. Validar con usuarios la portada contextual de congregante, voluntario, operación y administración; no añadir rutas sin un flujo funcional.
3. Probar los recorridos críticos: asistencia Kids, comanda de cafetería, consulta de avisos; para entregas de menores mantener verificación explícita de adulto.
4. Publicar una vista de cliente real de cafetería solo cuando exista sincronización entre dispositivos; el modal actual no lo es.
