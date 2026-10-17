# Verificación de entrega — Clubhouse 1.0

## Ejecutado

- Análisis de sintaxis de servidor y JavaScript de la PWA.
- 9 pruebas automatizadas de Node, todas correctas: reglas WHS/Stableford, reparto de golpes para hándicaps −10 a 70, hoyo pendiente frente a X, ranking por año/mes con mejor vuelta y empates, validación de datos de campo, flujos multiusuario, protección de destinos push y concurrencia de 30 cuentas.
- Flujo real contra la API con SQLite temporal: alta del administrador y jugadores, invitaciones, verificación de índice, comienzo de vuelta, 18 hoyos, envío, rechazo, corrección y validación. Lectura del ranking desde otra sesión.
- Recepción real de un evento SSE tras anotar un hoyo en una sesión diferente.
- Reintento idempotente, rechazo de revisión antigua, bloqueo de tarjetas cerradas, bloqueo de modificación ajena y de autovalidación.
- Chat por vuelta desde otra cuenta, reacciones, permisos de borrado, subida/lectura protegida de imagen, respuesta parcial para reproducción y rechazo de un archivo falso.
- Protección de origen, desactivación de cuentas, exportación sin contraseñas, rotación de invitación y reapertura de base SQLite tras reiniciar.
- 30 cuentas en la misma liga: 29 altas concurrentes además del administrador, lectura compartida del estado, rechazo de la plaza 31 y registro concurrente del primer hoyo de 29 jugadores.
- Pruebas del DOM en un entorno JavaScript sin motor visual: pantallas principales, selector de campos, creación de vuelta, control de golpes, guardado y avance, bola levantada, envío al chat de partida, seguimiento de jugador, editor de 18 hoyos y ranking mensual.
- Simulación de caída y recuperación de red en el frontend contra el backend real: dos hoyos quedan pendientes sin llegar al servidor, se envían en orden una sola vez al reconectar, y un conflicto con otro dispositivo requiere decisión antes de reaplicar, conservando el otro resultado.
- Generación de una demo autónoma sin dependencias remotas y revisión de la integridad del ZIP.

## Pendiente en la instalación elegida

No se ha ejecutado una sesión de navegador visual ni una prueba en móviles reales en este entorno. Las comprobaciones del DOM no verifican píxeles, cámara, instalación ni comportamiento del sistema operativo. El diseño tiene estilos adaptativos para móvil y escritorio, pero necesita una pasada visual en vuestros dispositivos.

Tampoco se han probado el alta de un dominio, los certificados HTTPS de Caddy, la entrega push con la PWA cerrada, la reproducción de todos los códecs de vídeo ni una caída de red móvil real. La integración Web Push utiliza la librería oficial de su proyecto, pero requiere las claves y suscripciones de vuestra instalación.

Prueba recomendada antes de lanzar:

1. Administrador y marcador en dos móviles y redes distintas.
2. Abrir una vuelta con un campo oficial, anotar un hoyo y verlo desde el otro móvil.
3. Desconectar datos, anotar dos hoyos, cerrar/reabrir la app, recuperar conexión y comprobar que se envían una vez.
4. Abrir la misma tarjeta en dos dispositivos, provocar un conflicto y comprobar las dos opciones de resolución.
5. Compartir una foto y un clip corto; reproducirlos desde el otro móvil.
6. Completar 18 hoyos, devolver para corregir y validar; comprobar puntos mensual y general.
7. Activar avisos, seguir al jugador, cerrar la PWA y recibir un hoyo mediante Web Push.
8. Crear una copia y comprobar una restauración de prueba en otra carpeta.
