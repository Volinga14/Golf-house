# Prueba de campo: La Hinojosa
Ruta publicada: https://volinga14.github.io/Golf-house/hinojosa/

Página independiente en `public/hinojosa/`. El build de Pages copia automáticamente esta carpeta. No utiliza las cuentas ni altera la app principal. Datos personales en localStorage con clave exclusiva; sin chat, cuentas ni sincronización multiusuario en esta prueba.

## Uso en el campo
1. Abrir con conexión y configurar nombre, fecha, barras y HJ confirmado en recepción.
2. Preparar sin conexión desde Preparar; esperar 18/18 láminas y comprobar modo avión.
3. Usar +/− y putts; Guardar confirma el hoyo y avanza. Los borradores y notas persisten al cerrar.
4. Exportar CSV o copia JSON completa al terminar; Compartir envía un resumen solo cuando el jugador lo elige.
5. Una nueva vuelta conserva hasta 20 anteriores en el JSON exportado.

## Datos y procedencia
Fuentes consultadas el 28/10/2026:
- club: https://olivar.golf/sobre-el-campo-18-hoyos
- book: https://olivar.golf/pdf/Campo%20de%20Golf%20Olivar%20de%20la%20Hinojosa%20Campo%20de%20las%20Naciones%20Recorrido%20Largo%20by%20PerfectPixel%20Publicidad.pdf
- slope: https://olivar.golf/pdf/Slope%20Campo%20de%20Golf%20Olivar%20de%20la%20Hinojosa%20Campo%20de%20las%20Naciones%20by%20PerfectPixel%20Publicidad.pdf
- guide: https://studylib.es/doc/6203941/golf-olivar-de-la-hinojosa
- card: https://www.golfify.io/courses/golf-olivar-de-la-hinojosa-18-hole
- federation: https://fedgolfmadrid.com/club/CM81
- nine: https://fedgolfmadrid.com/noticia/como-superar-el-hoyo-mas-dificil-de-golf-olivar-de-la-hinojosa/15615
- ratings: https://rfegolf.es/ArtculosDocumento/OTRAS%20PUBLICACIONES/Otras%20publicaciones%202018/2018%20Gu%C3%ADa%20Oficial%20de%20Campos%20de%20Golf.pdf

Las 18 láminas se enlazan y muestran desde el sitio oficial con atribución; no se copian al repositorio. La lámina 12 utiliza /2016/04/; las otras /2016/02/. Preparación offline voluntaria guarda imágenes en la caché de ese dispositivo y comprueba su decodificación. El servidor puede limitar las descargas: la interfaz informa del número de láminas recuperadas.

Consejos breves derivados de una guía histórica de 2011, salvo el hoyo 9 basado en explicación federativa; no se atribuyen como observaciones actuales. Greenes: consultar lámina oficial y, en campo, bandera y relieve reales. No se incluyen coordenadas inventadas, alturas topográficas ni distancias GPS.

Hay tarjetas contradictorias publicadas. Amarillas: referencia 5.963 m; azules: 5.327 m; rojas: 5.122 m (Golfify, totales coincidentes con guía RFEG 2018). Negras: ficha federativa 6.084 m. Par 72 e índices de dificultad comunes. Las estimaciones HJ muestran valoración y categoría histórica y requieren confirmación expresa. HJ puede introducirse manualmente; sin HJ no se muestran puntos netos. Stableford al 100% del HJ, sin handicap allowance adicional.

## Validación
`npm test` incluye integridad de datos, reparto de golpes para HJ −10 a 72, Stableford, rayas, datos incompletos, reapertura y flujo de 18 hoyos con un DOM simulado. Comprueba sintaxis del frontend y worker. Esta comprobación no sustituye una prueba real en Safari/Android de instalación, imágenes y modo avión. No hay entorno de navegador disponible en la sesión de implementación.


## Actualización 1.1.0: imágenes y greenes
Visor de pantalla completa con ajuste inicial de toda la lámina, botones +/−, arrastre, rueda, doble toque/clic, zoom mediante dos punteros, teclado y salida con Escape. El foco y la posición de la página se recuperan al cerrar. Ver green abre la misma lámina centrada en el sector dibujado; Ver completa vuelve al encuadre inicial.

Cada hoyo incluye fondo de referencia del esquema del libro oficial (18–28 m), una observación breve documentada y un consejo propio separado. No son distancias a bandera ni datos de velocidad o estado actual. En 9/18 se aclara que la cota corresponde al sector dibujado del green compartido. La tendencia del putt del 9 procede del artículo federativo; no se inventan caídas detalladas para los demás.

Caché y URLs de recursos actualizadas a 1.1.0 para evitar mezclar interfaz anterior y visor nuevo; almacenamiento de vueltas conservado. Nuevas pruebas de geometría del visor en tamaños de pantalla móvil y horizontal, zoom de dos punteros, desplazamiento y presencia de datos de green en los 18 hoyos.

## Actualización 1.2.0: mapa de planificación
El botón Mapa de distancias abre un planificador en pantalla completa con una ortofoto georreferenciada PNOA del IGN, incluida localmente (aproximadamente 1 MB). No depende de teselas remotas para funcionar una vez guardada la PWA.

En esta versión, no hay referencias verificadas de los 18 tees y centros de green. El usuario sitúa ambos puntos sobre la ortofoto la primera vez y puede arrastrarlos. Las referencias y rutas se guardan por hoyo y barras, con la clave independiente clubhouse-hinojosa-plans-v1. No se asignan coordenadas automáticas inventadas. El GPS opcional permite colocar el tee si el usuario está físicamente en él; nunca se solicita sin pulsar su botón ni se envía a servidor.

Rutas A/B de 2 o 3 tramos, puntos arrastrables, colocación con toque, deslizador de alcance 20–400 m, etiquetas de cada tramo, total de ruta, distancia directa y anillos geodésicos de 100/150/200/250 m desde tee. Distancias horizontales mediante Haversine (radio medio terrestre 6371008,8 m), sin viento/desnivel ni predicción de vuelo/rodada; dependen de la calidad de las referencias manuales. Exportación JSON de los planes.

Ortofoto descargada el 29/10/2026 desde el servicio oficial WMS PNOA MA, capa OI.OrthoimageCoverage, CRS EPSG:3857. Bounds WGS84: latitud 40.4599–40.4721, longitud −3.6132 a −3.5938. Solicitud de imagen de 3840 píxeles de ancho, con altura ajustada a la extensión proyectada. Distribución reducida proporcionalmente a 2560 píxeles (misma extensión, sin deformar la escala). Fecha de consulta distinta de fecha de vuelo: no se presenta como imagen en directo.

Datos de imagen bajo CC BY 4.0, atribución visible IGN / Comunidad de Madrid. Fuente y solicitud exacta: public/hinojosa/map-data.js. Licencia IGN: https://www.ign.es/resources/licencia/Condiciones_licenciaUso_IGN.pdf. Leaflet 1.9.4 se incluye con su licencia BSD en vendor/LEAFLET-LICENSE.txt. No se reutilizan vectores privados de otras apps ni referencias incompletas encontradas durante la investigación.

El worker 1.2.0 precarga el planificador, Leaflet y la ortofoto; conserva las láminas oficiales descargadas al actualizar desde la versión anterior. Las pruebas cubren distancias conocidas, inversión distancia/rumbo, suma de tramos, persistencia separada por hoyo/barras y activos offline. QA en navegador: selección de referencias, arrastre, deslizador, A/B y reapertura. Prueba táctil y precisión GPS pendientes en móvil físico.

## Actualización 1.3.0: prueba de relieve del hoyo 1
El planificador se retira de la interfaz, sus scripts y su precarga. Sus archivos y cálculos quedan archivados para permitir recuperarlo; no se borran datos locales de vueltas, notas o planes. Se añade un único acceso en el hoyo 1 y un enlace directo `#hoyo-1-relieve`.

Visor de pantalla completa con ortofoto cenital, perspectiva 3D texturizada del terreno, giro e inclinación por arrastre, zoom por pinza/rueda/botones, desplazamiento en 2D, recentrado y teclado. Altura a escala real ×1 y exageraciones explícitas ×3/×6. Coloreado de altitud y curvas interpoladas cada 2 m. Render Canvas sin dependencia de WebGL para dispositivos sin aceleración gráfica; durante la interacción se reduce la densidad dibujada. Se conserva la malla de origen en el archivo JSON. No representa árboles en volumen ni caídas de putt.

Sector del hoyo 1 localizado a partir de las pistas de tenis y el recorrido/fotografía oficial. Incluye terreno contiguo, sin asignar tees ni bandera GPS no verificados. Recorte en la ortofoto original de 2560×2116: píxeles [550,170,1150,630]. Se amplía la textura para el visor sin afirmar más detalle fotográfico. La extensión EPSG:3857 y las dimensiones horizontales corregidas por latitud figuran en `terrain-assets/hole1-elevation.json`.

Elevación: servicio oficial Terrain RGB IDEE, basado en MDT05 (5 m), tesela z15/x16055/y12349 de 512×512. Fuente: https://xyz-mdt.idee.es/1.0.0/raster-dem/15/16055/12349.png. Decodificación oficial: −10000 + (R×65536 + G×256 + B)×0,1 m. Muestreo georreferenciado en malla 78×60; valores entre 642,3 y 661,1 m, sin inventar elevaciones. Referencia técnica: https://blog-idee.blogspot.com/2024/03/nuevo-servicio-xyz-del-modelo-digital.html. Datos consultados el 29/10/2026. IGN/CNIG; ortofoto IGN/Comunidad de Madrid; obra derivada CC BY 4.0.

Worker 1.3.0 precarga ambas fuentes locales y el nuevo visor, preservando láminas oficiales ya descargadas. Pruebas: integridad de elevaciones, dimensiones en metros, índices de malla, matrices de cámara, activos sin conexión, retirada de la interfaz del planificador y regresión del flujo de 18 hoyos y notas. QA visual en navegador de 2D/3D, altitudes, curvas, giro y zoom; prueba táctil en móvil físico pendiente.
