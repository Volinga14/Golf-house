# Estado de entrega — 17/10/2026

## Comprobado en esta revisión

- Nueve tests nativos de Node: cálculo WHS/Stableford, asignación de golpes, ranking/empates, validación de campos, autenticación, permisos, revisiones e idempotencia, SSE, chat, multimedia, persistencia, validación de destinos push y concurrencia de 30 cuentas. Todos pasan.
- Comprobaciones DOM automatizadas: primera apertura, perfil, explicación de la liga, cuatro destinos de navegación, búsqueda de campo, preparación guiada de vuelta, anotación, bola levantada, completar 18 hoyos, envío y validación por otro jugador, tarjeta plegada, reanudar vuelta, chat de partida, seguir jugadores, editor de campos y clasificación mensual.
- La bienvenida puede repetirse sin borrar las vueltas de prueba.
- Generación de demo autónoma y build estático de Pages con rutas relativas.

## Pendiente

- Creación del repositorio remoto y activación de GitHub Pages: esta entrega contiene la configuración, pero no está publicada.
- Revisión visual en navegador real: el navegador de pruebas no está instalado en este entorno y su descarga no ha podido completarse. Las comprobaciones DOM no sustituyen una revisión visual.
- Pruebas físicas iPhone/Android de instalación PWA, cámara, vídeo, recuperación de cobertura y Web Push.
- Alojamiento del servidor real con HTTPS y disco persistente antes de usar la liga entre los 30 móviles.

La demo está separada del modo servidor. No hay usuarios ni resultados reales en el paquete.
