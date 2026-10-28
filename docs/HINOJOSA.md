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
