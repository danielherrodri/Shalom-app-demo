# Arquitectura de producción de Shalom Kids · propuesta v0.1

**Fecha:** 28 de octubre de 2026 · **Estado:** propuesta para decidir. Responde al resumen preparado con ChatGPT el 27 oct 2026, que proponía Firebase Hosting, Cloud Firestore, Firebase Authentication y Cloud Run o Cloud Functions. Complementa el [ADR-001](arquitectura-seguridad-v08.md) y el [plan de la versión 1](plan-v1-kids.md).

## Recomendación en una línea

**Mantener Django + PostgreSQL (lo que ya está construido) y alojarlo en Google Cloud sin servidores permanentes propios:** Firebase Hosting para la interfaz en `kids.ic-shalom.org`, Cloud Run para la API, Cloud SQL para PostgreSQL, Secret Manager para las credenciales y Cloud Scheduler para correos y tareas diarias. Correo transaccional con Brevo (plan gratuito) y Mercado Pago Checkout Pro verificado por el servidor. **No usar Firestore.**

Costo realista: **unos $220–300 MXN al mes**, sobre todo por la base de datos. El objetivo de $0–200 solo se alcanza con Firestore o con una base gratuita fuera de Google; ver la sección 7.

## 1. Qué existe, qué está confirmado y qué falta validar

| Tema | Ya existe | Confirmado | Propuesta por validar |
|---|---|---|---|
| Interfaz | Demo con todas las vistas de Kids (Recepción con QR y gafete temporal, Mi grupo hoy, Mis hijos, Recogida, Libros Kids, Rol de clases, Maestros, Lecciones, Seguimiento, Avisos, Configuración…) y un armazón React en `frontend/` | Se conservan los mockups; no se rediseña | Pasar las vistas a React fase por fase |
| Backend | Django 5.2 + DRF + PostgreSQL. API de asistencia por grupo con permisos por registro. **Fase 1 fusionada:** perfiles que asigna administración, confirmación de una segunda persona, invitaciones y registro de correos. Fase 2 (acceso) a medias en `feat/fase2-acceso` | ADR-001: Django/PostgreSQL | Hosting |
| Base operativa | El sistema vigente (Sheets y QR) es la fuente de verdad del piloto | **No usar Sheets ni Excel** en el sistema nuevo | Migración conciliada |
| Asistencia | Modelo de entrada idempotente y auditada | QR de entrada y salida; gafetes; validar quién recoge | Salida con código del adulto autorizado |
| Correo | Plantillas de diseño y registro de envíos | Avisos de entrada y salida a tutores, recordatorio a docentes 2 días antes, confirmación de libros | Proveedor (Brevo) y DNS del dominio |
| Pagos | Vista demo de Libros Kids; cafetería con cobro manual | Mercado Pago Checkout Pro con la cuenta de la iglesia; entrega presencial | Credenciales y webhook |
| Dominio | — | `ic-shalom.org` es de la iglesia | `kids.ic-shalom.org`; falta saber quién administra el DNS |
| Legal | Triaje, evaluación de impacto de cuentas, investigación LFPDPPP 2025 y borradores | Revisión por abogado antes de publicar | Evaluación de impacto de Kids (datos de salud de menores) |

## 2. ¿Firestore o PostgreSQL?

El atractivo de Firestore es el costo ($0 en la cuota gratuita). Para Kids pesa más lo demás:

| Criterio | PostgreSQL (recomendado) | Firestore |
|---|---|---|
| Forma de los datos | Familias ↔ tutores ↔ niños ↔ grupos ↔ asistencias ↔ pedidos: relacional | Documentos; las relaciones se duplican a mano |
| Reglas que no se pueden romper | Restricciones únicas y transacciones: una entrada por niño y clase, un pago aplicado una sola vez, inventario que no queda negativo | Sin restricciones únicas; hay que simularlas con documentos llave |
| Seguridad de menores | Permisos en el servidor, probados con pruebas automatizadas (ya existen) | Si el navegador lee directo, un error en las reglas expone datos de menores; las reglas no expresan bien «docente de este grupo hoy» ni ocultan un campo (alergias) dentro del mismo documento |
| Reportes | SQL directo | Consultas limitadas; exportar a BigQuery |
| Trabajo ya hecho | Se aprovecha: modelos, 38 pruebas, CI | Reescribir backend y pruebas |
| Costo | ~$170–250 MXN/mes (Cloud SQL más pequeño) | ~$0 |

**Conclusión:** la diferencia es de unos $200 MXN al mes contra reescribir lo hecho y aumentar el riesgo para datos de menores. Recomiendo PostgreSQL.

## 3. Servicios de Google Cloud

| Servicio | Para qué | Por qué este |
|---|---|---|
| **Firebase Hosting** | Interfaz React en `kids.ic-shalom.org` con HTTPS | Gratis a este volumen, CDN y certificado automático. Redirige `/api/**` a Cloud Run: **mismo origen**, cookies de sesión simples y sin CORS |
| **Cloud Run** | API Django en contenedor | Escala a cero; la cuota gratuita cubre el tráfico de una iglesia. Sin servidor que parchar |
| **Cloud SQL (PostgreSQL)** | Base de datos | Respaldos automáticos, parches y cifrado administrados. Instancia más pequeña (`db-f1-micro`) |
| **Secret Manager** | Llave de Django, llave de cifrado de campos, SMTP o API de correo, token y secreto de webhook de Mercado Pago | Ninguna credencial en el repositorio ni en el navegador |
| **Cloud Scheduler** | Vaciar la cola de correo cada minuto; tarea diaria (recordatorios a docentes, conciliación de pagos, limpieza) | 3 tareas gratis por cuenta de facturación; evita agregar Pub/Sub o Cloud Tasks |
| **Cloud Storage** | Solo si se guardan fotos de docentes o PDF de gafetes | Los gafetes pueden generarse al momento sin guardarse |
| **Artifact Registry** | Imagen del contenedor | Lo exige Cloud Run; costo mínimo |

**Descartados:** Firestore (sección 2); Firebase Authentication (sección 6); Cloud Functions (Cloud Run ya ejecuta la API completa, y una sola pieza es más fácil de operar); Pub/Sub y Cloud Tasks (Scheduler basta); GKE y máquinas virtuales (requieren mantenimiento).

**Región:** la documentación de Cloud SQL lista Querétaro (`northamerica-south1`), lo que mantendría los datos en México y simplificaría el aviso de privacidad. **Falta verificar** que Cloud Run y las redirecciones de Firebase Hosting funcionen ahí. Si no, usar `us-central1` para ambos (misma región entre API y base) y declararlo en el aviso como remisión a un encargado.

**Arranque en frío:** con escala a cero, la primera petición del domingo tarda unos segundos. Si molesta en Recepción, se fija una instancia mínima solo el domingo de 8:00 a 14:00 (costo marginal).

## 4. Correo transaccional

- **Volumen estimado:** 40 niños × 2 avisos (entrada y salida) × 1–2 tutores = **80–160 correos el domingo**, más recordatorios y confirmaciones: unos 700–1,000 al mes.
- **Proveedor recomendado: Brevo, plan gratuito (300 correos al día).** Cubre el pico del domingo con margen. Si crece, el plan Starter cuesta alrededor de USD 9 al mes. Alternativas: Postmark (mejor entregabilidad, alrededor de USD 15) o Amazon SES (el más barato a gran escala, pero es otra nube que configurar). **Verificar** en brevo.com las condiciones vigentes y el contrato de encargado: es una empresa europea, así que es una remisión internacional que va en el aviso.
- **Cola independiente:** cada correo se guarda primero en la tabla de salida, dentro de la misma transacción que la asistencia. Cloud Scheduler llama cada minuto a un endpoint interno autenticado que envía los pendientes, con reintentos y un máximo de intentos. **Si el correo falla, la asistencia ya quedó registrada.** Retraso esperado: menos de 1 minuto.
- Ajuste necesario al código de la Fase 1: hoy envía al confirmar la transacción. Pasará a la cola, porque Cloud Run no garantiza CPU después de responder.
- **Contenido mínimo:** «[Nombre] registró su entrada a las 10:02 en Semillas». Sin alergias, notas ni datos de otras personas. Los enlaces de acceso no se guardan.
- **DNS:** SPF, DKIM y DMARC en `ic-shalom.org` para que no caigan en spam. Requiere a quien administra el DNS.

## 5. Mercado Pago (Checkout Pro)

1. El tutor elige el libro. El **servidor** crea el pedido (`pendiente`) con el precio de la base de datos, nunca con el que mande el navegador, y aparta el inventario por 30 minutos.
2. El servidor crea la preferencia de Checkout Pro con `external_reference` = id del pedido y `notification_url` = webhook de Shalom, y redirige al tutor.
3. **Webhook:** se valida la firma `x-signature` (HMAC con el secreto del panel de Mercado Pago, más `x-request-id` y `data.id`); si no coincide, responde 401. Si es válida, **el servidor consulta el pago en la API de Mercado Pago** y comprueba referencia, monto, moneda MXN y estado. Es idempotente por id de pago.
4. **Volver del checkout solo muestra «Estamos confirmando tu pago».** Nunca marca el pago como aprobado.
5. Aprobado → folio y correo de confirmación por la cola. La entrega la registra administración o coordinación (quién entregó y a qué adulto), en un estado separado del pago.
6. **Estados:** `pendiente → aprobado → entregado`; `pendiente → rechazado | cancelado | vencido` (libera el inventario); `aprobado → reembolsado` (sin entregar: libera el inventario; ya entregado: decisión de administración).
7. **Conciliación diaria:** consulta en Mercado Pago los pedidos pendientes de más de 30 minutos. Cubre webhooks perdidos y reembolsos hechos desde el panel.
8. El token de acceso y el secreto del webhook viven en Secret Manager. Checkout Pro solo redirige, así que el navegador no necesita ninguna llave. Shalom no ve ni guarda datos de tarjeta.
9. Pruebas con las credenciales y usuarios de prueba de Mercado Pago; nunca con cobros reales.

## 6. Datos, permisos y autenticación

**Autenticación:** se mantiene lo definido en [cuentas](cuentas-google-v01.md): Google o enlace por correo, sin contraseña, y verificación en dos pasos propia para administración, coordinación Kids y finanzas. Ya está a medias en la Fase 2.
- *Alternativa:* Firebase Authentication resuelve Google y enlace por correo, pero la verificación TOTP exige actualizar a Identity Platform, las identidades quedarían en dos sistemas y los correos de acceso saldrían con plantillas limitadas de Firebase. Ganaría poco.
- **Recepción** usa un dispositivo compartido con sesión corta (5 minutos de inactividad, ya implementado).

**Entidades principales:**
- **Cuentas:** usuario, identidad de correo, perfil, asignación de perfiles, invitación, textos y registros de consentimiento, dispositivo de verificación en dos pasos, bitácora. Existen o están en la Fase 2.
- **Kids:**
  - Familia y tutor (persona con cuenta, relación con el niño y constancia de acreditación sin copia del documento).
  - Niño, con la fecha de nacimiento necesaria para el grupo por edad.
  - Nota de salud **cifrada** y separada del registro del niño.
  - Persona autorizada para recoger (con vigencia) y consentimiento de imagen.
  - Grupo o clase, asignación de docente, sesión y reserva.
  - **Asistencia** con entrada y salida: hora, quién registró y, en la salida, qué adulto autorizado recogió y cómo se verificó.
  - Gafete: QR **opaco** (código aleatorio sin datos personales, del que solo se guarda su verificador; revocable; temporal o permanente). Incidencia.
- **Libros:** libro, precio por ciclo, movimientos de inventario, pedido con folio, pago (id de Mercado Pago único) y entrega.
- **Notificaciones:** cola de correo (registro sin cuerpo cuando lleva enlaces) y preferencias del tutor.

**Reglas clave:**
- Escanear el QR del niño **no basta para la salida**: se valida al adulto con su código de recogida o con la lista de autorizados, y queda registrado quién entregó.
- Docente: solo los niños de su grupo, el día de su clase; ve las alergias de esos niños, no las notas de otros.
- Tutor: solo sus hijos.
- Coordinación Kids: todo Kids, con verificación en dos pasos.
- Administración: perfiles, catálogo, pedidos y reportes, con verificación en dos pasos.
- Ningún permiso viene del navegador: todo se valida en el servidor y queda en la bitácora.

## 7. Presupuesto mensual estimado

Supuestos: tipo de cambio de ~19–20 MXN por USD; unos 40 niños; precios de 2026 de fuentes secundarias. **Verificar en la calculadora de Google Cloud antes de decidir.**

| Concepto | MXN al mes |
|---|---|
| Cloud SQL `db-f1-micro` (≈ USD 8–10) + 10 GB SSD + respaldos | 200–260 |
| Cloud Run, Firebase Hosting, Scheduler, Secret Manager, Artifact Registry | 0–30 (dentro de cuotas gratuitas) |
| Correo: Brevo gratuito | 0 (≈ 180 si se pasa a Starter) |
| Dominio | ya contratado |
| **Total** | **≈ 220–300** |

No incluye comisiones de Mercado Pago, impuestos, desarrollo ni soporte.

**Si $200 es un tope estricto:** PostgreSQL gratuito de un tercero (por ejemplo, Neon) dejaría el total cerca de $0–50, a cambio de límites de tamaño, región en EE. UU., otro contrato de encargado y menos garantías. Una máquina virtual gratuita con PostgreSQL instalado a mano **no se recomienda**: respaldos y parches quedan a cargo de la iglesia.

## 8. Plan incremental sobre los mockups

Se extiende el [plan v1](plan-v1-kids.md). Cada fase es un PR con pruebas y datos ficticios:

1. ✅ **Administración de perfiles e invitaciones.**
2. **Acceso:** enlace por correo, consentimientos y verificación en dos pasos (en curso); Google cuando haya credenciales.
3. **Infraestructura:** Dockerfile, despliegue a Cloud Run y Cloud SQL de *staging*, Secret Manager, cola de correo con Scheduler, Firebase Hosting en un subdominio de pruebas y CI que despliega a staging.
4. **Datos de Kids** (tras la evaluación de impacto y el abogado): familias, tutores, niños, salud cifrada, autorizados e imagen.
5. **Operación de Kids:** reservas, Recepción con QR y gafetes, salida validada, Mi grupo hoy, Mis hijos, avisos de entrada y salida por correo, Seguimiento.
6. **Libros y pagos:** catálogo, inventario, Checkout Pro, webhook, conciliación, folio y entrega.
7. **Coordinación:** rol de clases con recordatorio 2 días antes, Maestros, Lecciones, reportes y Configuración.
8. **Piloto y corte:** un grupo en paralelo al sistema vigente, migración conciliada desde Sheets (la ejecuta la iglesia con un script validado, nunca a través del repositorio) y corte con plan de regreso.

La interfaz React avanza junto con cada fase, reutilizando el diseño de la demo.

## 9. Lo que se necesita de la iglesia

1. **Decidir:** PostgreSQL en Cloud SQL (~$220–300) o tope estricto de $200 (sección 7).
2. **DNS de `ic-shalom.org`:** quién lo administra, para crear `kids` (y después `app`) y los registros SPF, DKIM y DMARC del correo, sin tocar el sitio actual.
3. **Cuenta de Google Cloud** de la iglesia con facturación y alerta de presupuesto, y dos personas con acceso de propietario.
4. **Mercado Pago:** acceso al panel para crear la aplicación, las credenciales de prueba y el webhook. Las credenciales se cargan directo en Secret Manager, nunca por chat ni por correo.
5. **Brevo:** cuenta a nombre de la iglesia y su contrato de encargado.
6. **Abogado:** la evaluación de impacto de Kids y los textos (avisos de entrada y salida, datos de salud, imagen y pagos).

## Fuentes consultadas (28 oct 2026, verificar antes de decidir)

- Precio de Cloud SQL `db-f1-micro`: [Bytebase](https://www.bytebase.com/dbcost/cloudsql/instance/db-f1-micro/), [Usage.ai](https://www.usage.ai/blogs/gcp/cloud-sql/pricing/).
- Disponibilidad regional de Cloud SQL (Querétaro): [Google Cloud](https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview?hl=es-419).
- Notificaciones y firma `x-signature` de Mercado Pago: [Mercado Pago México](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/payment-notifications).
- Plan gratuito de Brevo (300 correos al día): [TechRadar](https://www.techradar.com/pro/software-services/brevo-review), [Dreamlit](https://dreamlit.ai/blog/brevo-review).
