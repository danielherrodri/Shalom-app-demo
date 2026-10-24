# Desarrollo seguro y prevención de filtraciones

## Preparación local (PowerShell)

Desde la raíz del repositorio:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install pre-commit==4.7.0
.\.venv\Scripts\python.exe scripts/install_gitleaks.py
.\.venv\Scripts\python.exe -m pre_commit install
```

El hook necesita Python disponible en PATH. Se instala en cada clon; no se distribuye automáticamente con Git. Si falta Gitleaks, la validación falla en vez de omitirse.

## Controles antes de entregar

```powershell
.\.venv\Scripts\python.exe scripts/test_security_gate.py
.\.venv\Scripts\python.exe scripts/security_gate.py
.\.venv\Scripts\python.exe scripts/security_gate.py --history
.\.venv\Scripts\python.exe -m pre_commit run --all-files
```

El hook examina el contenido preparado para el commit. La revisión completa examina archivos versionados y nuevos no ignorados; el historial se revisa por separado. Los hallazgos del escáner se muestran redactados. No adjuntar su salida sin revisarla.

Se bloquean archivos de entorno, claves, credenciales comunes, bases locales y respaldos, incluso si se agregan forzosamente a Git. `.env.example` pasa el filtro de nombre pero también se analiza en busca de secretos. `.gitignore` reduce errores accidentales y no reemplaza estos controles.

Los datos personales dentro de un CSV, imagen, PDF o texto común no se pueden detectar de forma fiable con este escáner. Está prohibido incorporarlos; la revisión humana debe comprobar archivos, capturas y ejemplos. Usar datos sintéticos sin relación con personas reales. Revisar también los artefactos y registros generados por CI antes de publicarlos.

## Revisión de cambios

- Confirmar ausencia de secretos y datos reales en código, ejemplos, capturas y registros.
- Revisar permisos por registro, validaciones del servidor y respuestas con los mínimos campos necesarios.
- Mantener secretos fuera del navegador y separar configuración de desarrollo y producción.
- Revisar cambios de dependencias, conservar archivos de bloqueo y corregir vulnerabilidades aplicables antes de publicar.
- No introducir registros sensibles en migraciones, fixtures ni mensajes de error.

## CI y protección de ramas

El flujo `Security and backend` revisa archivos, historial, pruebas del control y dependencias Python, además de pruebas de la API. No recibe secretos de producción y tiene permisos de lectura del repositorio.

Antes de habilitar producción hay que publicar y verificar el flujo en GitHub, exigir su resultado para fusionar, impedir pushes directos a la rama protegida y exigir revisión de otra persona. Activar también las funciones de detección y bloqueo de secretos que permita el plan del repositorio. Estos ajustes remotos no quedan activados por crear archivos locales. El hook local se puede eludir; la protección del servidor debe ser obligatoria.

## Si se detecta una filtración

1. Detener la publicación y revocar/rotar inmediatamente las credenciales afectadas.
2. Identificar accesos, copias y datos expuestos; preservar evidencia con acceso restringido, sin reproducir el secreto.
3. Retirar el material y coordinar limpieza del historial y copias cuando proceda. Esto no sustituye la rotación.
4. Seguir el procedimiento de incidentes de `ux-operacion-v08.md`, incluida la evaluación de obligaciones legales y notificaciones según los datos afectados.
5. Corregir la causa, añadir una comprobación y documentar responsables y resolución sin datos sensibles.
