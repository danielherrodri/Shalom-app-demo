# Notificaciones por perfil · demostración

Congregante: confirmaciones de sus acciones; eventos y avisos generales optativos.
Voluntario: actividad y turnos asignados; novedades optativas.
Administración: actividad administrativa y devoluciones pendientes de revisión.
Cliente de cafetería: registro, pedido listo, cancelación y entrega de su pedido.
Caja: nuevas comandas, preparación, entrega y revisión de devoluciones.
Preparación: nuevas comandas y aviso para detener pedidos cancelados, sin datos de pago ni motivos.

La bandeja tiene conteo, lectura individual y lectura total independientes por perfil. Las preferencias optativas empiezan desactivadas. Los avisos de operación permanecen disponibles. Los ejemplos se generan con un botón explícito. Todo vive en memoria de cada página: no hay persistencia, sincronización entre páginas ni envíos. El selector de perfiles es solo una demostración pública.

La versión actual genera avisos al registrar, avanzar, cancelar y entregar pedidos en cafetería; la app principal registra la actividad del perfil que realiza la acción. Turnos y novedades tienen ejemplos manuales, sin programador automático.

Para producción: destinatarios definidos por usuario, pedido propio, asignación de estación/turno y permisos validados en servidor; no basta un filtro de navegador. Guardar notificaciones y lectura por usuario, deduplicar eventos con identificador estable y separar preferencias por canal. Usar cola y reintentos para correo/push; no enviar detalles de menores, motivos internos ni información financiera en previsualizaciones. Las cancelaciones no prueban devolución: el estado de reembolso requiere confirmación validada desde Mercado Pago. No hay conexión a Mercado Pago en este prototipo.
