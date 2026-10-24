# Shalom App · Prototipo v0.5

Prototipo interactivo de la plataforma **Iglesia Cristiana Shalom**. Este repositorio es **público** y contiene solamente ejemplos, sin bases de datos productivas.

## Abrir en Safari

- **Aplicación completa:** https://danielherrodri.github.io/Shalom-app-demo/
- **Cafetería Shalom (nuevo):** https://danielherrodri.github.io/Shalom-app-demo/cafeteria.html

Si GitHub Pages no actualiza enseguida, revisa *Settings → Pages* y recarga en Safari.

## Cafetería v0.5

Tres pantallas interactivas: **Caja rápida → Preparación (Bebidas/Alimentos) → Seguimiento y recibo**. Desde la app principal entra a «Cafetería» y pulsa «Abrir cafetería interactiva». Productos, modificaciones, precios y órdenes son ficticios. La pantalla del cliente muestra artículos específicos y el detalle del total; la preparación funciona por estaciones, sin doble captura.

**La demo no envía correos, no se integra con Mercado Pago, no cobra, no autentica usuarios y no sincroniza información entre distintos dispositivos.** Los datos simulados se guardan en el mismo navegador con localStorage, y las pestañas abiertas de ese navegador se pueden actualizar entre sí. No introducir datos reales.


## Microinteracciones v0.5

Animaciones cortas y sobrias en la portada, navegación, anuncios, carrito y estados de preparación. Se respetan los ajustes de **reducir movimiento** del dispositivo. No hay animaciones constantes ni videos automáticos; la actualización operativa de cocina no dispara transiciones innecesarias.

- [Especificación de movimiento y pruebas](./docs/microinteracciones-v05.md)

### Documentación

- [Propuesta funcional y arquitectura MVP v0.4](./docs/cafeteria-diseno-mvp-v04.md)
- [Levantamiento y requisitos iniciales](./docs/cafeteria-requisitos-arquitectura.md)

## Resto de Shalom App

Se conservan los módulos simulados de congregación, voluntariado y administración: inicio con anuncios multimedia, acceso de demostración, estacionamiento, familias, Kids, eventos, donativos y proyectos. El sistema real Shalom Kids (Google Sheets/Apps Script) no fue modificado.

Identidad: Inter, temas Noche/Crema, acento cobre. Los contenidos y montos de esta demo no deben utilizarse para decisiones reales.

Para producción hacen falta backend central, base de datos PostgreSQL, permisos, integración y comprobación de cobros, servicio de email, seguridad y respaldo.
