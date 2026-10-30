# Infraestructura de staging (Fase Infraestructura)

**Fecha:** 30 de octubre de 2026 · **Estado:** scripts, imagen y flujo listos; ningún recurso creado. Los ejecuta una persona propietaria del proyecto de Google Cloud de la iglesia.

Staging usa solo datos ficticios. El sistema vigente (Apps Script y Sheets) sigue siendo la fuente de verdad: staging no lee ni escribe en él.

## Cómo queda

```
Navegador ──► Firebase Hosting (sitio de staging, CDN)
                 ├─ /api/**  ──► Cloud Run «shalom-api» (us-central1) ──► Cloud SQL PostgreSQL 17 (socket /cloudsql)
                 └─ resto    ──► frontend/dist (index.html para las rutas de la app)
Cloud Scheduler ──(token OIDC de shalom-scheduler)──► URL run.app /internal/email/drain/ y /internal/daily/
GitHub Actions ──(Workload Identity Federation, entorno «staging»)──► Artifact Registry, Cloud Run Job de migración, Cloud Run, Hosting
Secret Manager (réplica solo en la región): llave de Django, llave de campos, contraseña de PostgreSQL y clave SMTP
```

## Región: Querétaro no sirve con Firebase Hosting

Consultado el 30 de octubre de 2026 en la documentación oficial (`cloud.google.com` ahora redirige a `docs.cloud.google.com`).

| Servicio | `northamerica-south1` (Querétaro) | Fuente |
|---|---|---|
| Cloud Run | Disponible, precio de nivel 1. Sin asignación de dominios propia | [Cloud Run locations](https://docs.cloud.google.com/run/docs/locations) |
| Redirección de Firebase Hosting a Cloud Run | **No disponible.** En Norteamérica solo están northamerica-northeast1 y northeast2, us-central1, us-east1, us-east4, us-east5, us-south1 y us-west1 a us-west4 | [Hosting y Cloud Run](https://firebase.google.com/docs/hosting/cloud-run), [configuración completa](https://firebase.google.com/docs/hosting/full-config) |
| Cloud SQL para PostgreSQL | Disponible | [Cloud SQL locations](https://docs.cloud.google.com/sql/docs/postgres/locations) |
| Cloud Scheduler | **No disponible** | [Scheduler locations](https://docs.cloud.google.com/scheduler/docs/locations) |
| Secret Manager (regional) | Disponible | [Secret Manager locations](https://docs.cloud.google.com/secret-manager/docs/locations) |
| Artifact Registry | Disponible | [Repository locations](https://docs.cloud.google.com/artifact-registry/docs/repositories/repo-locations) |
| Firebase App Hosting | No disponible (solo us-central1, us-east4, us-east5, asia-east1, asia-southeast1 y europe-west4) | [App Hosting](https://firebase.google.com/docs/app-hosting/about-app-hosting) |

**Conclusión:** con Firebase Hosting delante, Cloud Run no puede estar en Querétaro. Se usa la alternativa ya prevista en la [arquitectura](arquitectura-produccion-v01.md), sección 3: **todo en `us-central1`**. API, base, Scheduler, secretos e imágenes quedan en la misma región. Además, `us-central1` es una de las regiones que Firebase recomienda para colocar Hosting y Cloud Run juntos.

**Para producción** hay dos caminos, y la decisión es de la iglesia, porque afecta el aviso de privacidad:
1. **Igual que staging, en `us-central1`.** Los datos quedan en EE. UU. y el aviso lo declara como remisión a un encargado.
2. **Datos en Querétaro.** Cloud Run y Cloud SQL en `northamerica-south1`, detrás de un balanceador de aplicaciones externo global con NEG sin servidor, en lugar de Firebase Hosting.
   - Cuesta aproximadamente USD 18 al mes más por el balanceador.
   - Permite cerrar la URL `run.app` (ingreso «internal-and-cloud-load-balancing») y agregar Cloud Armor, lo que resuelve el riesgo de la sección «Límite por origen».
   - Scheduler seguiría en otra región, porque llamar desde fuera de la región está permitido.
   - **Sin verificar:** la [documentación de NEG sin servidor](https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts) no enumera regiones. Hay que probarlo antes de decidir.

## Cambios de código que exige Firebase Hosting

- **Cookies.** Hosting borra todas las cookies salvo `__session` antes de llamar a Cloud Run ([fuente](https://firebase.google.com/docs/hosting/manage-cache)). Por eso:
  - la sesión se llama `__session`;
  - el token CSRF vive dentro de la sesión (`CSRF_USE_SESSIONS`);
  - el frontend ya lo leía de `auth/csrf/`, así que no cambia.
  - `tests/hosting-staging.cjs` imita ese borrado y comprueba el inicio de sesión.
- **Caché.** Hosting no guarda en la CDN respuestas dinámicas salvo que lleven `Cache-Control: public`. La API responde `no-store` en `/api/` y `/internal/`.
- **HTTPS.** Cloud Run termina TLS y envía `X-Forwarded-Proto`. Django lo lee mediante `SECURE_PROXY_SSL_HEADER`; sin eso, cada petición parecería http.

## Antes de empezar (lo hace la iglesia)

1. Un proyecto de Google Cloud solo para staging, con facturación, **alerta de presupuesto** (Facturación → Presupuestos y alertas) y dos personas propietarias.
2. `gcloud` con sesión de una persona propietaria (`gcloud auth login`), Python 3 y Node 22 (para `npx firebase-tools`).
3. Si la organización aplica «Domain restricted sharing», hay que permitir `allUsers` como invocador en este proyecto. Firebase Hosting llama a Cloud Run sin credenciales.
4. Una cuenta SMTP de Brevo a nombre de la iglesia, con su contrato de encargado.
5. En GitHub: Settings → Environments → **staging**, con *Required reviewers* y la rama `main` como única permitida.

## Pasos

Copia `infra/staging/config.example.sh` a `infra/staging/config.sh`, que Git ignora, y pon los identificadores reales. Ese archivo no lleva secretos.

Cada script **solo muestra** los comandos. Para ejecutarlos, repítelo con `APLICAR=1`. Los scripts son idempotentes: si un recurso ya existe, no lo vuelven a crear.

```bash
bash infra/staging/01-proyecto.sh             # revisar lo que haría
APLICAR=1 bash infra/staging/01-proyecto.sh   # ejecutarlo
```

| Script | Qué hace |
|---|---|
| `01-proyecto.sh` | Activa las APIs, crea el repositorio de imágenes y tres cuentas de servicio con permisos mínimos: `shalom-api` (solo `cloudsql.client` y lectura de sus 4 secretos), `shalom-scheduler` (sin roles; solo firma tokens) y `shalom-deploy` (despliegue de Run y Hosting, escritura en el repositorio y actuar solo como `shalom-api`) |
| `02-base-datos.sh` | Cloud SQL PostgreSQL 17, `db-f1-micro`, zonal, respaldos diarios, protección contra borrado. IP pública sin redes autorizadas y certificado de cliente obligatorio: solo entran los conectores de Cloud SQL |
| `03-secretos.sh` | Crea los 4 secretos con réplica solo en la región y genera la llave de Django, la llave de campos y la contraseña de PostgreSQL. También crea el usuario de la base y **pide por teclado** la clave SMTP. Ningún valor se muestra ni se guarda en archivos. Si un secreto ya tiene versión, no lo toca |
| `04-cloud-run.sh` | Crea el servicio y el Job de migración con su configuración y la imagen pública de ejemplo de Google. El primer despliegue del flujo pone la imagen real. Repetir el script ajusta la configuración sin cambiar la imagen |
| `05-scheduler.sh` | `shalom-email-drain` cada 5 minutos y `shalom-daily` a las 3:17, con token OIDC de `shalom-scheduler` cuya audiencia es la URL `run.app` |
| `06-github.sh` | Workload Identity Federation: solo este repositorio (por identificador numérico) y solo el entorno `staging` pueden actuar como `shalom-deploy`. Al final imprime las 5 variables que hay que dar de alta en el entorno `staging` de GitHub; no son secretos |
| `07-hosting.sh` | Agrega Firebase al proyecto y crea el sitio de Hosting. El subdominio de pruebas se agrega en la consola de Firebase y lo crea quien administra el DNS |

Después, en GitHub → Actions → **Deploy staging** → *Run workflow* sobre `main`. A partir de entonces, cada push a `main` que pase «Security and backend» despliega solo, con la aprobación del entorno:
1. construye la imagen y la sube;
2. ejecuta las migraciones en el Job **antes** de cambiar el servicio;
3. despliega el servicio, conservando sus variables y secretos;
4. publica el frontend.

### Datos iniciales de staging (ficticios)

Hay que publicar textos de consentimiento de prueba y dar Administración a la primera cuenta. Se hace desde tu computadora con [Cloud SQL Auth Proxy](https://docs.cloud.google.com/sql/docs/postgres/sql-proxy) por socket:

```bash
cloud-sql-proxy --unix-socket /tmp/cloudsql "$PROJECT_ID:us-central1:shalom-staging" &
export SHALOM_ENV=production PGHOST="/tmp/cloudsql/$PROJECT_ID:us-central1:shalom-staging" PGDATABASE=shalom PGUSER=shalom_app \
  DJANGO_ALLOWED_HOSTS=localhost SHALOM_PUBLIC_APP_URL=https://staging.example.invalid
# Llaves desechables: estos dos comandos no firman ni cifran nada. No uses este entorno para otros comandos.
export DJANGO_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')" \
  SHALOM_FIELD_KEY="$(python3 -c 'import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())')"
PGPASSWORD="$(gcloud secrets versions access latest --secret shalom-pgpassword --project "$PROJECT_ID")" \
  python backend/manage.py publish_consent_text aviso staging-1 texto-ficticio.txt
```

La primera cuenta se crea entrando por enlace en la app de staging. Su nombre de cuenta aparece en `/api/v1/auth/me/` (campo `username`), y luego `python backend/manage.py bootstrap_admin <username>` le da Administración. Para la segunda persona: se asigna Administración en la app y se confirma con el mismo comando y su `username`. Cierra el proxy y la terminal al terminar.

## Cola de correo

- Cada correo se intenta **en la misma petición**, al confirmarse la transacción. No se deja para después de responder, porque Cloud Run casi detiene la CPU de una instancia en cuanto responde.
- **Enlaces de acceso:** sin reintento y sin cuerpo guardado. Si fallan, la persona pide otro.
- **Invitaciones:**
  - El cuerpo se guarda cifrado con `SHALOM_FIELD_KEY` mientras está pendiente.
  - Se reintenta a los 5, 10, 20 y 40 minutos, hasta 5 intentos en total.
  - El cuerpo se borra al enviarse, al agotar los intentos o a las 24 h como máximo.
  - Revocar la invitación cancela el envío pendiente.
- **Ejecuciones simultáneas:** `drain` reserva cada correo con `SELECT … FOR UPDATE SKIP LOCKED` y un plazo de 2 minutos, así que dos ejecuciones nunca envían el mismo. Si una instancia muere a la mitad, la siguiente ejecución lo retoma.
- **Endpoint interno:** `core/internal.py` acepta solo `POST` con un token firmado por Google. Comprueba la firma con las llaves públicas de Google (que refresca cada hora), el emisor, la audiencia, la cuenta `SHALOM_SCHEDULER_SERVICE_ACCOUNT` y `email_verified`. Sin esa variable, responde 403 siempre. No usa cookies ni CSRF.

## Verificar en staging

1. **Proxies.** Con `TRUSTED_PROXY_COUNT` vacío, el límite por origen usa `REMOTE_ADDR`, que detrás de Hosting es un nodo de la CDN.
   - Para fijarlo, revisa con una petición ficticia cuántas entradas trae `X-Forwarded-For` por Hosting y cuántas directo a `run.app`. Por ejemplo, con un despliegue temporal que registre solo el número de entradas, nunca las direcciones.
   - Fuentes no oficiales indican que Hosting pasa la IP del cliente en `Fastly-Client-IP`; la documentación de Firebase no lo describe.
   - Después, pon el valor en `config.sh` y repite `04-cloud-run.sh`.
2. **Host.** Django solo acepta el host `run.app`. Si Hosting enviara otro, Django respondería 400 a todo `/api/`. En ese caso hay que agregar a `DJANGO_ALLOWED_HOSTS` el host que llegue.
3. **Correo.** Envía una invitación ficticia con la clave SMTP inválida a propósito. Comprueba en la base que queda pendiente con `attempts=1` y, al corregir la clave, que la siguiente ejecución la envía y borra el cuerpo.
4. **Scheduler.** En la consola, «Forzar ejecución» de cada tarea debe responder 200. Una llamada con `curl` sin token debe responder 403.

## Límite por origen y la URL run.app

Con Hosting delante, Cloud Run debe aceptar tráfico de internet (ingreso «All»). Firebase Hosting no cuenta como origen interno ni como balanceador ([fuente](https://docs.cloud.google.com/run/docs/securing/ingress)). Quien llame directo a `run.app` puede poner cualquier valor a la izquierda de `X-Forwarded-For` y eludir el límite por origen. Lo que sigue protegiendo:
- el límite por correo (3 enlaces cada 15 minutos);
- las respuestas iguales exista o no la cuenta;
- que los enlaces solo llegan al buzón de la persona.

La solución completa es el balanceador de la opción 2 de producción.

## Registros

En producción, Django escribe un JSON por línea con `severity`, `logger`, `message` y una lista cerrada de campos (`email_id`, `kind`, `attempt`, `status_code`). De las excepciones solo registra el tipo y las líneas de código, no el mensaje, que podría incluir un correo. Gunicorn no lleva registro de accesos, porque Cloud Run ya registra cada petición. Los rechazos por host desconocido no se registran, porque los escáneres los generan sin parar.

## Rotación y regreso

- **Rotar un secreto:** agrega una versión nueva con `printf '%s' "$valor" | gcloud secrets versions add NOMBRE --data-file -` y despliega una revisión nueva. La llave de campos no se puede rotar así, porque descifra los TOTP guardados; hace falta un procedimiento propio, todavía pendiente.
- **Regresar a la revisión anterior:** `gcloud run services update-traffic shalom-api --to-revisions REVISION_ANTERIOR=100 --region us-central1`. Por eso las migraciones deben ser compatibles con la versión anterior del código.

## Costo aproximado de staging

| Servicio | Costo |
|---|---|
| Cloud SQL `db-f1-micro` con 10 GB | Unos USD 10–15 al mes |
| Cloud Run con escala a cero, Hosting, 2 tareas de Scheduler (hay 3 gratis), 4 secretos y el registro de imágenes | Pocos dólares o dentro de la cuota gratuita |

Ver la sección 7 de la [arquitectura](arquitectura-produccion-v01.md).
