# Reglas de desarrollo de Shalom

Estas reglas aplican a toda contribución y a los asistentes que modifiquen este repositorio.

- Usar exclusivamente registros ficticios en desarrollo, pruebas, capturas, ejemplos y demostraciones. No copiar bases de producción ni datos de miembros, menores, tutores, donaciones o consejería.
- Nunca incluir contraseñas, tokens, claves privadas, cadenas de conexión con credenciales ni archivos de servicio en código, commits, incidencias, conversaciones o documentación. Leer secretos desde variables de entorno; en producción, usar el gestor de secretos que se seleccione.
- `.env.example` solo puede contener nombres de variables y valores vacíos o ficticios inequívocos. No poner secretos en variables `VITE_*`: se publican en el navegador. Ninguna credencial de servidor debe llegar al frontend.
- No registrar cuerpos de peticiones, cookies, cabeceras de autorización, tokens de recuperación ni datos personales. Los errores públicos deben ser genéricos; los registros técnicos deben minimizar y redactar información.
- Validar entradas y permisos en el servidor para cada operación y registro. Usar consultas parametrizadas/ORM, escape de salida y protección CSRF cuando corresponda. No confiar en identificadores ni roles enviados por el navegador.
- No agregar respaldos, volcados SQL, bases locales, exportaciones reales, claves o archivos de credenciales. Las migraciones de Django sí forman parte del repositorio; no deben contener registros reales ni secretos.
- Antes de entregar cambios, ejecutar los controles descritos en `docs/desarrollo-seguro.md`. Si falta el escáner o falla un control, resolverlo; no usar `--no-verify`, desactivar reglas ni añadir exclusiones para hacer pasar un secreto.
- Las excepciones requieren justificación documentada y revisión humana; nunca autorizan publicar secretos activos ni datos reales.
- Ante una filtración, revocar o rotar primero la credencial, preservar evidencia sin copiar el secreto y seguir el procedimiento de incidentes. Borrar el último archivo o commit no elimina copias ni historial.
- No afirmar que el sistema es seguro por pasar el escáner. Revisar autorización, minimización de datos, dependencias y configuración, además del código.
