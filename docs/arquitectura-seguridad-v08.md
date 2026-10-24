# ADR-001 · Arquitectura, datos y seguridad de Shalom

Estado: propuesta para revisión. Fecha: 23 de octubre de 2026.
Responsables de aceptación: propietario del proyecto y responsables de operación, Kids y finanzas según alcance.

Este documento incorpora los requisitos conversados; no implementa un backend ni acredita seguridad del prototipo. No configura protecciones de GitHub ni modifica el sistema Kids vigente. Ningún sistema puede garantizar ausencia de brechas: el objetivo es reducir riesgos, detectar incidentes y limitar su impacto mediante controles verificables.

## Contexto y decisión propuesta

Una web y una futura aplicación móvil compartirán API y reglas de negocio. React + TypeScript + Tailwind y componentes shadcn/ui personalizados para la web; Django + Django REST Framework para API; PostgreSQL para datos relacionales. Versiones soportadas y parches se elegirán al implementar. Un solo backend modular inicialmente; procesos separados para trabajos en segundo plano, siguiendo [colas y releases](pipelines-releases-v07.md).

Flujo web: navegador → HTTPS → protección de entrada/CDN/WAF → React y API bajo el mismo origen → Django → PostgreSQL y almacenamiento privado. Los workers consumen referencias opacas de trabajos; no reciben copias innecesarias de datos personales. PostgreSQL, llaves y almacenamiento privado no se exponen directamente al navegador.

Se consideran: Django con vistas renderizadas (menos piezas, pero cambia el enfoque React propuesto); React + API Django (selección provisional, dos capas que mantener y probar); servicios independientes por módulo (complejidad operativa innecesaria al iniciar). La API permite otros clientes; no significa que las pantallas web se reutilicen sin cambios en móvil ni resuelve sincronización sin conexión.

## Tablas y campos propios de Shalom

El modelo será fijo y versionado mediante migraciones; no habrá creación arbitraria de campos desde la interfaz. Separar cuenta de acceso y persona: un niño o integrante puede existir sin cuenta y una cuenta no obtiene acceso a una familia por compartir apellido o correo.

| Entidad propuesta | Campos y relaciones iniciales, por validar |
| --- | --- |
| Cuenta | ID, identidad externa única o credenciales gestionadas, estado, verificación, fechas; sin rol editable por el cliente |
| Persona | ID, nombre, datos de contacto mínimos, estado; vínculo opcional con cuenta |
| Familia y pertenencia | Familia, persona, relación y vigencia; definir hogares múltiples sin asumir un tutor único |
| Autorización de tutor/recogida | Menor, adulto, alcance, vigencia, revocación y quién verificó; pertenecer a familia no concede recogida automáticamente |
| Ministerio, grupo e inscripción | Persona, grupo, ciclo y vigencia; separación de ámbitos de acceso |
| Asignación de rol | Cuenta, rol, ámbito (grupo/ministerio), vigencia y otorgante; evitar un booleano administrador que abra todo |
| Sesión y asistencia | Grupo/evento, fecha, persona, entrada/salida y responsables; registro de correcciones auditable |
| Consentimiento | Persona/representante verificado, finalidad, versión, decisión, fecha y revocación; evidencia separada y protegida |
| Aportación y recibo | Importe decimal, moneda, fecha, referencia y vínculo opcional con aportante; sin datos completos de tarjeta ni CVV |
| Trabajo, outbox y auditoría | Estado, referencia, idempotencia, actor, evento y fecha; sin contraseñas, tokens o cuerpos sensibles en logs |

Para cada campo se definirá necesidad, tipo, longitud, nulabilidad, lectores, retención, cifrado y posibilidades de búsqueda. No recolectar domicilio, nacimiento completo, salud o notas pastorales sin necesidad acordada. Fotos/adjuntos en objetos privados; guardar referencia y metadatos, no URLs públicas permanentes. Fechas de eventos con zona horaria explícita y persistencia temporal coherente; importes con decimal, no punto flotante.

Restricciones de base y transacciones reforzarán las reglas: asistencia única por sesión/persona, importes válidos según tipo de movimiento y relaciones existentes. Verificar permisos y transición de entrada/salida dentro de transacciones para evitar carreras. Desactivar no equivale a conservar indefinidamente: definir borrado, retención y tratamiento de respaldos por entidad.

## Consultas e índices

Diseñar a partir de búsqueda, filtro, orden y volumen esperados; no indexar todas las columnas. Candidatos, no migraciones aprobadas:

| Consulta/regla | Candidato |
| --- | --- |
| Historial individual por fecha | Compuesto persona_id, fecha; incluir desempate estable si lo exige paginación |
| Una asistencia por sesión/persona | Restricción única sesión_id, persona_id; revisar consultas inversas antes de añadir otro índice |
| Tutores autorizados de un menor | menor_id y estado/vigencia según consulta; conservar revocaciones fuera de resultados activos |
| Sesiones de un grupo por fecha | grupo_id, fecha |
| Trabajos pendientes listos | Índice parcial para estados pendientes/reintentables sobre próxima ejecución y desempate; no usar la hora actual como predicado del índice |
| Búsqueda por nombre parcial | Evaluar búsqueda normalizada/trigramas solo si compatible con la política de cifrado y necesidad real |

Claves primarias y restricciones únicas ya generan índices en PostgreSQL; revisar índices de relaciones que genere Django antes de duplicarlos. El orden de columnas y los operadores determinan utilidad. Una tabla pequeña o consulta poco selectiva puede beneficiarse de recorrido secuencial. Los índices cuestan espacio y escrituras. Verificar planes con EXPLAIN y, en pruebas controladas, EXPLAIN ANALYZE, que ejecuta la consulta. Medir latencia, consultas por petición y paginación con datos sintéticos representativos, evitando consultas repetidas por cada fila.

No descifrar toda la tabla para filtrar. El cifrado de aplicación limita búsqueda y ordenamiento; cualquier índice auxiliar de búsqueda exacta mediante HMAC requiere revisión, llave separada y aceptación de filtración de patrones de igualdad. No llamar anonimización al hash de correos. No prometer búsquedas parciales de campos cifrados sin diseño específico.

## Autenticación y sesiones

Propuesta: proveedor de identidad administrado con OpenID Connect, sujeto a selección y costos. Django vincula la identidad verificada a una cuenta local y aplica sus permisos. Alternativa: autenticación Django mantenida, con Argon2id para contraseñas y solución mantenida para MFA/recuperación; aumenta responsabilidad operativa. No implementar criptografía ni un protocolo de acceso propio.

Web bajo el mismo origen: sesión de servidor, identificador en cookie Secure, HttpOnly, SameSite adecuado y alcance mínimo. Rotar sesión al autenticar, caducidad por inactividad y absoluta, cierre de sesiones y revocación tras pérdida de acceso. No guardar tokens de sesión en localStorage. Si se usa identidad externa: flujo Authorization Code, PKCE, state/nonce según protocolo, URIs exactas y validación de emisor, audiencia y firmas. No vincular cuentas automáticamente solo por coincidencia de correo.

MFA obligatorio para administración, coordinación con acceso sensible y finanzas; recuperación verificada y auditada sin atajos que lo anulen. Reautenticación para cambiar identidad/MFA, conceder privilegios y exportaciones sensibles. Invitaciones y recuperación con tokens breves, de un uso y verificadores almacenados; mensajes que no revelen si una cuenta existe. Límites por cuenta y origen contra intentos automatizados sin bloqueos permanentes explotables contra terceros.

Futuro móvil: OIDC Authorization Code + PKCE en navegador del sistema y almacén seguro del dispositivo; tokens de alcance mínimo y corta duración, renovación rotada/revocable según proveedor. Misma autorización de negocio que web, aunque cambie el mecanismo de sesión. Una aplicación distribuida no puede guardar un secreto de cliente confidencial.

## Autorización: quién puede hacer qué y sobre cuáles registros

Denegar por defecto, endpoints públicos enumerados expresamente. Validar rol + ámbito + relación vigente en cada operación. Familia: solo registros autorizados; docente: grupos asignados; coordinación: alcance asignado; finanzas: permiso independiente. El acceso técnico excepcional requiere motivo y auditoría.

Aplicar restricciones a listados, búsqueda, conteos, detalles, creación, modificación, archivos y exportaciones. DRF no aplica automáticamente permisos de objeto a cada fila de un listado ni resuelve por sí solo la autorización al crear. Filtrar querysets y validar relaciones/campos en servidor. No confiar en family_id, rol, usuario o importe calculado enviados por la interfaz. UUID opacos reducen exposición, pero no sustituyen autorización. Volver a comprobar al ejecutar trabajos y entregar archivos.

## Entradas e inyecciones

| Riesgo | Control propuesto |
| --- | --- |
| Inyección SQL | ORM y consultas parametrizadas; nunca concatenar texto del usuario en SQL. Filtros/columnas de orden permitidos explícitamente |
| XSS: código ejecutado al mostrar contenido | Texto plano por defecto, escape según contexto; en React evitar HTML crudo. Si se necesita texto enriquecido, sanitizador mantenido con lista permitida y validación de URLs |
| CSRF: un sitio ajeno provoca acciones con la sesión del usuario | Middleware/token CSRF en operaciones autenticadas con cookies, comprobación de origen y métodos GET sin cambios de estado; proteger también login |
| Asignación de campos privilegiados | Serializadores con campos explícitos, campos de actor/rol/propietario calculados en servidor; rechazar cambios no autorizados |
| Inyección en comandos, plantillas o archivos | No ejecutar entradas con eval/shell ni compilar plantillas del usuario; nombres internos de archivo y rutas controladas |
| Enlaces remotos maliciosos/SSRF | No descargar URLs arbitrarias; si se requiere, destinos permitidos, bloqueo de red interna y revisión de redirecciones |
| Archivos peligrosos | Límites de tamaño/cantidad, tipo real y extensión permitida, imágenes reprocesadas, revisión antimalware según alcance, almacenamiento privado sin ejecución |
| Fórmulas en exportaciones | Neutralización de fórmulas de hoja de cálculo, columnas permitidas y formatos validados en servidor |

Validar en API tipo, tamaño máximo, formato, rango, enumeraciones y coherencia entre campos; la validación en React es ayuda de uso. Aceptar nombres con acentos y apóstrofos: prohibir comillas o buscar palabras como SELECT no es una defensa contra SQL. No confundir validación, parametrización y escape: se necesitan según el contexto de uso. Limitar tamaño/profundidad de solicitudes y complejidad de filtros. Usar CSP y cabeceras de seguridad como capas adicionales, no sustitutos de estas defensas.

“SRPG” no se identifica como término confirmado; por el contexto se interpreta provisionalmente como CSRF. Django tiene protección propia contra CSRF, equivalente en propósito a la disponible en Laravel. XSS e inyección SQL son amenazas distintas. Con DRF revisar especialmente login y endpoints anónimos: SessionAuthentication no garantiza protección CSRF de login por sí sola. No desactivar CSRF para facilitar la integración React. CORS limita lecturas desde otros orígenes en navegadores; no autentica clientes ni bloquea scripts externos al navegador.

## Cifrado y secretos

Aplicar la [matriz de cifrado](cifrado-datos-v07.md): HTTPS, almacenamiento/respaldos cifrados y cifrado de aplicación selectivo para datos de mayor riesgo. Llaves en KMS y secretos en gestor dedicado, separados por entorno y con acceso mínimo. Revisar rotación, recuperación y cifrado autenticado mediante bibliotecas mantenidas. El cifrado no impide el abuso de una sesión autorizada o servidor comprometido.

No recopilar datos reales en el prototipo público. No incluir llaves en React ni secretos en variables que la compilación expone al navegador. Datos privados sin caché persistente del cliente por defecto. QR de recogida opaco, temporal y revocable; nunca concede acceso o acredita por sí solo identidad del adulto.

## Bots, consola y clientes no autorizados

Requisito operativo: impedir uso anónimo de funciones privadas y reducir automatización abusiva. No es técnicamente garantizable que toda petición venga de un clic en la interfaz: un usuario con sesión puede reproducir peticiones desde consola o herramientas externas. Tokens CSRF, Origin, Referer, User-Agent, una llave en JavaScript, CORS o desactivar clic derecho no prueban uso humano ni autenticidad de la pantalla. No intentar bloquear DevTools como barrera de seguridad.

Capas propuestas:

- CDN/WAF con mitigación de bots y tráfico volumétrico; origen protegido para que no pueda eludirse por su dirección directa. Límites de conexión, carga y tiempos de ejecución.
- Límites compartidos y atómicos entre instancias por cuenta, origen confiablemente obtenido del proxy y operación; cuotas más estrictas en login, recuperación, códigos, búsqueda masiva y exportaciones. No confiar solo en IP: familias pueden compartir conexión.
- Detectar enumeración, velocidad anormal y fallos repetidos; respuestas limitadas, paginación con máximos, concurrencia y presupuesto por trabajo. No devolver toda la base para filtrar en React.
- Desafío anti-bot adaptativo en flujos de riesgo, validado en servidor con caducidad, contexto y protección de reutilización; alternativa accesible. No añadir CAPTCHA a cada registro de asistencia. MFA/reautenticación y autorización explícita para acciones críticas.
- Idempotencia y estado de negocio comprobado en servidor para impedir operaciones duplicadas o saltos de pasos, incluso si se repite una petición válida. Alertas, suspensión revisable y auditoría de abuso; excepciones de integraciones con identidad y permisos propios.

El throttling integrado de DRF sirve para políticas de uso, pero su documentación advierte que no constituye protección suficiente contra fuerza bruta o denegación de servicio. No depender solo de él. robots.txt es indicación para rastreadores cooperativos, no control de acceso.

Producción: DEBUG=False, sin herramientas de depuración, endpoints de prueba ni interfaz navegable de pruebas de DRF; documentación interactiva privada o desactivada según política. API autorizada sigue funcionando para la app y futuro móvil. Desarrollo/staging usan cuentas/datos sintéticos y orígenes separados; ninguna cabecera o parámetro del cliente puede activar modo desarrollo ni saltarse controles en producción. Las pruebas de seguridad se ejecutan en entorno autorizado con controles equivalentes.

## Git, secretos e información hardcodeada

Requisito incorporado; controles aún no instalados ni configurados por este documento. No toda constante es un secreto: colores, límites de interfaz y ejemplos sintéticos pueden estar en código; contraseñas, llaves privadas, tokens, credenciales de base, códigos reales y datos de personas no.

1. Antes del commit: escáner mantenido como Gitleaks, sujeto a selección, sobre cambios preparados; detector de llaves privadas, tokens y patrones propios. Reporte con valores redactados. Los hooks locales son ayuda y se pueden omitir; no son la barrera definitiva.
2. En CI: escaneo obligatorio de cambios y análisis inicial del historial completo; análisis de código para credenciales hardcodeadas/configuraciones inseguras y revisión de dependencias. Incluir archivos de configuración, pruebas, documentación, plantillas, artefactos compilados y registros que se vayan a publicar. No ejecutar código de contribuciones no confiables con secretos de producción.
3. Revisión de datos: impedir ingreso de .env reales, dumps, respaldos, exportaciones, archivos de alumnos, fotos privadas, hojas y logs. .gitignore reduce accidentes, pero no protege archivos ya rastreados ni garantiza detección de información personal. Datos de prueba sintéticos y revisión humana de contexto; excepciones documentadas y acotadas, sin exclusiones globales para silenciar hallazgos.
4. Entornos: .env.example solo con nombres y valores ficticios; configuración variable en entorno/gestor de secretos. Credenciales de CI temporales y permisos mínimos; preferir identidad federada para despliegue cuando esté disponible. Revisar también secretos incrustados en el paquete del frontend.
5. Repositorio: PR y revisión obligatoria, comprobaciones requeridas, proteger rama principal y evitar bypass ordinario. Activar detección de secretos y protección de push donde estén disponibles según proveedor/plan; verificar realmente su activación. No asumir que un archivo de workflow protege por sí solo una rama.
6. Incidente: revocar/rotar primero una credencial expuesta, revisar accesos y alcance; después retirar de código/historial con coordinación y revisar forks, artefactos y logs. Borrar el último archivo no vuelve segura la credencial. No pegar secretos detectados en comentarios, incidencias o evidencia de pruebas.

La detección automática no descubre todos los datos personales ni todas las credenciales; combinar patrones, análisis, mínimos privilegios y revisión. Un PR puede modificar el propio control de seguridad: proteger sus archivos de configuración y exigir revisión correspondiente. Verificar herramientas y acciones concretas en documentación oficial antes de instalarlas y fijar versiones/revisiones revisadas.

## Operación y criterios previos al piloto

Separar desarrollo, staging y producción, cuentas de servicio y bases; producción sin acceso público a base/KMS. Dependencias soportadas, actualizaciones de seguridad, escaneo de vulnerabilidades y artefactos inmutables. Registrar cambios privilegiados y acceso sensible con acceso restringido a auditoría, conservación definida y protección ante alteraciones; no cuerpos completos ni secretos. Alertas de denegaciones anormales, exportaciones masivas y escalamiento de privilegios. Procedimiento de revocación, contención, recuperación y comunicación con responsables asignados.

Pruebas exigibles al construir, todavía no ejecutadas:

- Familia A no puede listar, contar, consultar, modificar ni descargar datos de B; docente no accede fuera de grupo y finanzas requiere permiso propio. Incluir intentos desde consola/cliente externo: mismos controles que UI.
- Login y mutaciones sin CSRF correcto se rechazan; sesión expirada/revocada y recuperación reutilizada fallan. Verificar MFA y recuperación, también ante robo de contraseña.
- Entradas SQL/XSS se tratan como datos y no se ejecutan; HTML/URLs/archivos no permitidos se rechazan. Intentos de cambiar actor, rol o relaciones no escalan privilegios.
- Repetición/concurrencia no duplica entrada/salida ni envíos; tareas verifican permisos vigentes. Límites resisten varias instancias y no se eluden accediendo al origen.
- Un secreto sintético de prueba controlado hace fallar escáner/CI, sin imprimirlo; comprobar bloqueo de integración y excepciones revisadas. Nunca usar credenciales reales para probar.
- Restaurar respaldo y llaves, revocar acceso y simular incidente con datos sintéticos. Revisar que logs, cachés, frontend y errores no revelen información.
- Evaluación independiente de seguridad antes de menores/finanzas reales, sin sustituir pruebas de desarrollo. Definir umbrales de rendimiento y límites antiabuso con medición y uso dominical realista.

## Siguientes decisiones

Complemento: [UX, accesibilidad, duración de sesiones, respaldos y respuesta a incidentes](ux-operacion-v08.md). Sus tiempos son objetivos propuestos pendientes de prueba, no configuración actual.

Inventario definitivo de campos y matriz rol/acción/ámbito; proveedor de identidad y recuperación; alojamiento/KMS/WAF; retenciones y búsquedas permitidas; volumen y concurrencia; diseño de endpoints y primer flujo vertical Kids. Implementar controles y evidencias antes del piloto, manteniendo el sistema vigente como fuente hasta corte conciliado y reversible.

## Fuentes oficiales consultadas

- [Django: seguridad](https://docs.djangoproject.com/en/5.2/topics/security/) y [CSRF](https://docs.djangoproject.com/en/5.2/ref/csrf/).
- [DRF: autenticación](https://www.django-rest-framework.org/api-guide/authentication/), [permisos y limitaciones por objeto](https://www.django-rest-framework.org/api-guide/permissions/), [throttling y sus límites](https://www.django-rest-framework.org/api-guide/throttling/).
- [OWASP: autenticación](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [bots y automatización](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html).
- [PostgreSQL: índices](https://www.postgresql.org/docs/current/indexes.html) e [índices multicolumna](https://www.postgresql.org/docs/18/indexes-multicolumn.html).

Los controles y el modelo de Shalom son propuestas del proyecto, no afirmaciones de configuración automática de las herramientas citadas. Las referencias a Django 5.2 explican mecanismos; no fijan la versión productiva.
