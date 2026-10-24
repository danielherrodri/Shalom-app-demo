# Tu opinión en Shalom · implementación del prototipo

Entrada común en app principal, cafetería, comunicaciones y paneles Kids. El contexto de servicio se precarga. Incluye eventos/álbumes, bienvenida, estacionamiento, cafetería, Kids, talleres, asesoramiento, acompañamiento, aportaciones y otros ministerios. No existe todavía un módulo de álbumes al que enlazar una opinión por ID.

Formulario: valoración opcional, categoría, aspecto del servicio, referencia ficticia opcional, comentario y solicitud de contacto por canal autorizado de cuenta. Requiere valoración o comentario; Kids requiere declaración de tutor de ejemplo. Sin adjuntos, nombres de menores ni contacto libre. Asociación al perfil ficticio explícita, sin prometer anonimato.

Seguimiento en memoria con UUID, fecha de México, responsable, secuencia Recibido → En revisión → En atención → Resuelto → Cerrado, respuestas separadas de notas internas, historial y reapertura por el remitente. Vista del equipo filtrada por servicio simulado. Contadores y satisfacción con denominador explícito; sin rankings de personas. No hay envíos, API, persistencia ni permisos reales. Recargar borra las opiniones; no usar datos reales.

Las situaciones delicadas abren una orientación sin capturar datos; canal restringido aún no configurado, no es recepción ni atención inmediata.

Antes de producción: backend autenticado, permisos por servicio y registro, verificar vínculo tutor/actividad en servidor, cifrado del texto según política existente, retención y borrado aprobados, límites de abuso y solicitudes idempotentes. Autor solo ve sus casos/respuestas e historial público; notas y responsables con acceso institucional adecuado. Servicio pastoral y protección con permisos específicos, nunca heredados de un rol general. No registrar texto en logs ni notificaciones. El canal de protección requiere responsables y acceso independiente. Integrar evento/sesión/pedido por ID validado en servidor; no confiar en referencia libre ni rol del navegador. Programar avisos solo con canal autorizado. Métricas de tiempos y temas agregados quedan pendientes hasta contar con datos reales autorizados.
