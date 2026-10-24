# Protección de datos del usuario · revisión inicial v0.7

23 de octubre de 2026. Propuesta para producción basada en los módulos del prototipo y el inventario funcional previo de solo lectura. No es una auditoría criptográfica del sistema vigente ni una implementación. La demo solo admite datos ficticios: no se le añade un cifrado aparente que permita introducir información real.

## Decisión propuesta

Cifrar conexiones y almacenamiento productivo, incluidos respaldos y archivos temporales. Añadir cifrado de aplicación a los conjuntos más sensibles con llaves separadas y permisos mínimos. Evitar recopilar datos innecesarios. El vínculo de una persona con una iglesia, sus aportaciones y la presencia de menores merecen especial protección por su contexto, incluso sin una nota explícita sobre creencias. Esta es una clasificación de riesgo del proyecto, no una conclusión legal.

La persona usuaria no debería administrar llaves ni recordar otra contraseña de cifrado para las funciones ordinarias. El servidor necesita leer una parte de los datos para operar asistencia, permisos y exportaciones. Por eso se propone cifrado administrado en servidor. Cifrado de extremo a extremo controlado solo por el usuario sería una decisión distinta: cambia recuperación, búsqueda, soporte y procesamiento en segundo plano, y requiere diseño específico.

## Matriz inicial por datos

| Datos o función | Protección propuesta | Minimización y acceso |
| --- | --- | --- |
| Nombre, correo, teléfono y domicilio, si se requiere | Cifrado en reposo; priorizar cifrado de campo para contacto/domicilio | Guardar solo lo necesario; correo visible solo a funciones autorizadas; no convertir correo en identificador público |
| Menores: identidad, nacimiento o edad, foto y relación con tutor | Cifrado de campos y objetos; llaves y permisos acotados al servicio Kids | Preferir rango de edad cuando baste; fotos privadas y variantes mínimas; sin reconocimiento facial |
| Asistencia, entrada/salida, persona autorizada para recoger y horarios | Conjunto cifrado y acceso por grupo/servicio; auditoría de consulta/cambio | Evitar ubicaciones o horarios en notificaciones; definir conservación; impedir listados públicos |
| Gafete, QR y código de entrega | Identificador opaco; secreto verificable almacenado con hash/HMAC según diseño | No poner nombre, teléfono o permiso de recogida legible en QR; caducidad y revocación; código por sí solo no acredita identidad del adulto |
| Aportaciones, recibos, referencia de transferencia e identidad del aportante | Registros y adjuntos cifrados; finanzas con permiso separado | Otros administradores no heredan acceso; no almacenar tarjeta completa ni CVV; proveedor de pago maneja tarjeta |
| Consentimientos y autorizaciones de imagen | Evidencia cifrada con acceso restringido y auditoría protegida frente a alteraciones | Separar finalidad, versión, vigencia y representante verificado; no confundir cifrado con consentimiento válido |
| Peticiones de apoyo, salud, alergias o notas pastorales, si se incorporan | Protección de campo y acceso especialmente restringido | No recopilar en el MVP sin finalidad, responsable y necesidad definidos; no incluir en exportaciones generales |
| Solicitudes de exportación, archivos generados y respaldos | Objetos cifrados, retención breve acordada, autorización al generar y al entregar | Cola con referencias opacas; correo de aviso sin datos sensibles; vínculo breve y autenticado en lugar de adjunto con menores/finanzas |
| Preferencias y pertenencia a ministerios | Almacenamiento cifrado y autorización por persona/finalidad | No publicar listas de suscripción ni revelar membresía por errores o búsquedas |
| Avisos públicos, menú, precios y plantillas genéricas | HTTPS e integridad; pueden ser públicos deliberadamente | Confirmar que su contenido es publicable; los datos personales insertados en una plantilla heredan su clasificación |

Todos los registros productivos se benefician del cifrado del almacenamiento. “Cifrado de campo” agrega una separación para que acceso a una copia de la base no implique acceso a las llaves. No sustituye control de roles, verificación de tutores, autorización por registro ni auditoría.

## Contraseñas, códigos y sesiones

Contraseñas: preferir un proveedor de identidad administrado. Si se administran propias, usar hash adaptativo con sal, como Argon2id, mediante biblioteca mantenida; nunca cifrado reversible ni texto plano. Parámetros se fijan con la guía vigente y medición de capacidad. [OWASP: almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Tokens aleatorios de recuperación o exportación: almacenar su verificador, limitar finalidad, plazo y uso, y no registrarlos en logs. Los códigos cortos requieren controles adicionales: un hash simple no impide enumerar todas las combinaciones tras una filtración. Evaluar HMAC con llave separada, límite de intentos, bloqueo progresivo y caducidad. Las sesiones necesitan un diseño propio de revocación y rotación; propuesta web: cookie Secure/HttpOnly/SameSite apropiada y defensas CSRF. No guardar credenciales ni tokens de sesión en localStorage.

## Del lado del navegador

No persistir información real de menores, aportaciones, consentimientos o contactos en localStorage/sessionStorage/IndexedDB como comportamiento por defecto. El prototipo anterior sí guarda ejemplos ficticios en localStorage; esto deberá sustituirse antes de admitir datos reales. Mantener únicamente preferencias inocuas, como tema, si se decide conservarlas. Cachés y service workers deben excluir respuestas privadas y borrarse según política.

Cifrar con una llave incluida en el mismo JavaScript no proporciona una barrera útil contra quien tenga la página o ejecute código en su origen. Tampoco protege lo que una sesión autorizada ya puede mostrar. Si se necesita trabajo sin conexión, diseñar por separado identidad del dispositivo, almacenamiento cifrado, desbloqueo, recuperación y limpieza; decidir primero si el riesgo permite guardar esa información. [OWASP: seguridad del almacenamiento en navegador](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).

## Llaves y operación

Usar servicios administrados de llaves y secretos, separados de los datos, con permisos de descifrado por servicio y entorno. No incluir llaves en Git, hojas, frontend, correos ni logs. Para cifrado de aplicación, usar una biblioteca revisada y cifrado autenticado, por ejemplo AES-GCM, con nonce único por llave. Guardar versión de llave y metadatos necesarios; autenticar contexto para impedir intercambio de ciphertext entre registros. No inventar algoritmos. [OWASP: almacenamiento criptográfico](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html).

Probar rotación, revocación de permisos, pérdida/recuperación de llaves y restauración de respaldos con información sintética. Conservar acceso a versiones antiguas solo mientras lo requiera la retención. El cifrado por sí solo no detecta toda alteración de la evidencia de consentimiento: hacen falta controles de auditoría y separación de funciones. Logs, métricas y trazas usarán identificadores internos, sin fotos, contactos, tokens ni cuerpos de exportaciones. No asumir que hash de nombre/correo equivale a anonimización.

HTTPS debe proteger todo el recorrido y las conexiones entre servicios. El correo ordinario no ofrece por sí mismo cifrado de extremo a extremo; por eso se propone que el correo avise y el acceso al archivo requiera identidad verificada. El usuario autorizado puede conservar una copia después de acceder: revocar el vínculo no retira copias ya obtenidas. [OWASP: transporte seguro](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html).

## Antes de admitir usuarios reales

1. Inventario de campos: necesidad, finalidad, propietario, lectores, retención y ubicación; incluir proveedores, colas, logs, respaldos y dispositivos compartidos.
2. Modelo de amenazas y límites de roles: familia, docente, coordinación y finanzas. Probar que una familia no puede leer a otra ni un administrador general acceder a finanzas sin permiso.
3. Elegir identidad, proveedor de correo, almacenamiento y KMS; definir recuperación de cuenta, llaves y evidencia de consentimiento.
4. Probar acceso indebido, robo de copia de base sin llaves, rotación, enlaces vencidos/reutilizados, revocación antes de generar/entregar y restauración. Ninguna prueba con datos reales del sistema actual.
5. Migración compatible por lotes, conciliación y rollback, siguiendo [arquitectura y releases](pipelines-releases-v07.md). Revisar cifrado y permisos con especialista antes del corte.

Pendientes por acordar con operación: necesidad real de domicilio/fecha completa de nacimiento, datos que finanzas debe conservar, duración de asistencia/fotos, exportaciones permitidas y necesidad de modo sin conexión. No se inspeccionaron llaves ni configuración de cifrado del sistema vigente.
