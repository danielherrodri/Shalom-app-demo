# Registro de decisiones

## 2026-10-23 · v0.7 · Exportación asíncrona

Estado: aceptado para prototipo; arquitectura productiva provisional.

Las exportaciones de información dejan de descargarse desde la app. Se solicitan en cola con filtros completos y entrega futura por correo verificado. Esta demo conserva solo metadatos en memoria y no genera archivos ni envía mensajes. Las plantillas HTML/TXT son entregables de diseño y mantienen su descarga. Los CSV directos descritos en v0.6 quedan supersedidos.

La simulación adopta lotes de 3 trabajos, una exportación, bloques de 100 filas y reparto alta/alta/media/baja. Cuota pausa globalmente el proveedor; máximo 3 intentos, caducidad, conciliación ante incertidumbre y revisión única de muertos. No se afirma procesamiento exactamente una vez: la propuesta exige idempotencia y conciliación.

Producción: API autorizada + outbox + colas separadas + workers + DLQ de aplicación, pendiente de validar proveedor y capacidad. Releases con CI, staging, gradualidad, rollback y payloads compatibles. Ver pipelines-releases-v07.md.

## 2026-10-23 · Piloto Kids

El sistema vigente sigue siendo fuente de verdad hasta un corte aprobado, conciliado y reversible. Sin doble escritura. La auditoría real es solo lectura; el inventario privado y sus pendientes no se publican con el prototipo. No se copiaron alumnos, docentes, correos, fotos ni códigos al repositorio.

## 2026-10-23 · Datos del usuario y cifrado

Estado: propuesta inicial. Cifrado administrado en servidor para datos personales, con protección de campo prioritaria en Kids, contactos y finanzas, llaves separadas y acceso mínimo. Contraseñas con hash adaptativo; códigos y tokens con verificador y límites propios. No persistir datos reales en almacenamiento del navegador por defecto. Cifrado extremo a extremo o modo sin conexión requiere una decisión separada. Ver [matriz de datos](cifrado-datos-v07.md). No se implementa criptografía ni se cambia el sistema vigente en el prototipo.
