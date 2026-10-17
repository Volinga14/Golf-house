# Arquitectura y decisiones de alcance

Frontend sin framework ni CDN: HTML, CSS y JavaScript. El cálculo de golf se comparte como módulo puro entre navegador y servidor. La demo usa un adaptador separado; el backend real nunca carga sus cuentas ni resultados.

Backend de una instancia con Node.js 24+, HTTP estándar y SQLite nativo. Sesiones mediante cookies HttpOnly y SameSite=Strict; Secure al usar PUBLIC_URL HTTPS. Contraseñas con scrypt y sal aleatoria. Clave de primera apertura y códigos de invitación generados aleatoriamente. Se comprueba la autorización de cada operación, no solo la visibilidad de los botones.

SQLite contiene cuentas, sesiones, campos, tarjetas, chats, metadatos multimedia, operaciones idempotentes, suscripciones push y actividad. Modo WAL y backup mediante API SQLite. Los adjuntos se almacenan en DATA_DIR/uploads y se sirven con sesión válida, MIME restringido y sin nombres de archivo proporcionados por el cliente. No se usa almacenamiento efímero como base de datos de producción.

Live con Server-Sent Events: cada cambio se confirma primero en SQLite y luego avisa al grupo conectado. La app recarga los datos desde el servidor y se recupera al reconectar o volver al primer plano. Los eventos pasados se conservan para actividad; no se intenta simular un directo cuando no hay red.

Cola local de golpes con identificador único y revisión esperada. El servidor calcula/valida las condiciones, no confía en totales enviados por el cliente. Los totales se derivan de los golpes y la instantánea de campo/hándicap. Un reintento de la misma operación devuelve su resultado anterior. Un conflicto de edición requiere decisión del usuario.

Service worker: cachea solo la interfaz y recursos estáticos. No cachea API ni multimedia privada. La última liga y los golpes pendientes se conservan localmente por cuenta/dispositivo. El logout borra el último estado real y bloquea la salida si quedan golpes sin sincronizar.

Web Push es opcional y usa web-push 3.6.7, claves VAPID de la instalación y suscripciones por usuario/dispositivo. Se restringen los destinos a proveedores de navegadores para evitar publicar peticiones arbitrarias desde el servidor. Los avisos no son un canal garantizado y no sustituyen la lectura del estado compartido.

Se presupone una liga privada, un administrador y 30 miembros conocidos. No incluye multiliga, pagos, emparejamientos automáticos, verificación federativa, GPS, retransmisión de vídeo, antivirus, transcodificación ni replicación horizontal. Los nombres y elementos visuales son originales, sin activos ni identidad de GameBook.

El frontend puede separarse del backend en el futuro, pero esta versión se sirve desde un mismo origen para simplificar cookies, SSE, adjuntos y PWA. El despliegue incluido añade Caddy para HTTPS y un volumen persistente. Ni los datos de demo ni contraseñas/claves reales deben incorporarse a un repositorio.
