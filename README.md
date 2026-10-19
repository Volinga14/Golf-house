## Interfaz v3 — octubre de 2026

Nueva base de experiencia inspirada en los patrones de Golf GameBook: superficies blancas, verde para acciones principales, navegación compacta y puntuación centrada en un hoyo.

- Inicio: amigos en el campo, actividad filtrable y acceso directo a jugar o retomar la vuelta.
- Mi liga: clasificación mensual y de temporada, con detalle por jugador.
- Jugar: preparación guiada, historial y tarjeta de un hoyo. Selector de los 18 hoyos y tarjeta completa desplegables.
- Club: se conservan el chat general, conversaciones por partida y adjuntos.
- Bienvenida: pantalla de app breve, perfil y entrada a la liga de ejemplo. «Ver bienvenida» permite recorrerla de nuevo sin borrar las tarjetas.

GitHub Pages sigue siendo una **demo local**. El rediseño no activa cuentas compartidas ni notificaciones push entre dispositivos: siguen requiriendo desplegar el servidor incluido.

Validación: nueve pruebas del servidor/cálculo; recorrido DOM desde la primera apertura; vuelta completa, envío al marcador y validación; generación de Pages y demo autónoma. Referencia visual consultada: https://www.golfgamebook.com/ (tarjeta, clasificación y seguimiento de amigos). No se reutilizan su marca ni sus recursos gráficos.

---

# Clubhouse ⛳

**[Abrir la demo publicada](https://volinga14.github.io/Golf-house/)** · Vista previa local; no comparte cuentas ni resultados entre dispositivos.

Una liga privada para 30 amigos y 12 jornadas. Interfaz pensada para el móvil: **Inicio · Jugar · Liga · Club**.

## Probar desde cero

Abre la vista previa de GitHub Pages. Primero aparece la bienvenida; pulsa **Probar el recorrido** para configurar un perfil local, conocer las reglas básicas y entrar al club. Después: **Empezar una vuelta → campo y barras → marcador → confirmación → anotar hoyos**.

La demo indica siempre que son datos ficticios. Todo queda en ese navegador; no registra cuentas ni comparte resultados entre dispositivos. **Desde el inicio** repite la bienvenida sin borrar las vueltas de prueba. Perfil → Reiniciar demo permite borrar los datos de prueba.

Para abrir sin servidor, genera `DEMO.html` con `npm run build:demo` y haz doble clic. La instalación como PWA requiere HTTPS o localhost.

## GitHub Pages: publicación de la vista previa

1. Crea un repositorio nuevo, `Golf-house`. Sube este proyecto a la rama `main`.
2. En **Settings → Pages → Source**, selecciona **GitHub Actions**.
3. En **Actions → Preview on GitHub Pages → Run workflow**, ejecuta la publicación (o vuelve a subir un cambio a main).
4. Abre la URL que devuelve el despliegue. Las rutas son relativas: funciona también bajo `/Golf-house/`.

El workflow verifica el backend y el cálculo de puntos, genera `site/` y publica únicamente el frontend. No sube claves, base de datos ni cuentas reales. Si no deseas publicar el código, mantén el repositorio privado y comprueba que tu plan permite Pages privado. La privacidad del repositorio y la de la web son opciones diferentes.

## Liga real: frontend y backend

GitHub Pages sirve HTML/CSS/JS y **no ejecuta el servidor**. Para usarla los 30 desde distintos móviles, despliega el backend junto al frontend en un servidor Node 24 con disco persistente y HTTPS. Así se mantienen las cookies seguras en el mismo origen y no hace falta exponer credenciales en el frontend.

```bash
# Node.js 24 o posterior
cp .env.example .env
npm start
```

Abre `http://localhost:3000`. Pulsa **Entrar en mi liga**. La primera cuenta administradora requiere la clave de configuración de la consola. Añade los campos con sus tarjetas oficiales verificadas e invita a los jugadores con el código privado. Sin campos oficiales verificados no se pueden empezar vueltas reales.

`npm install` es opcional para activar Web Push mediante `web-push`; el resto del servidor usa módulos nativos de Node. No hay pasos de instalación necesarios para ejecutar los tests ni para generar la demo.

```bash
npm test                 # Stableford, permisos, concurrencia, SSE, medios, persistencia
npm run build:pages      # vista previa estática en site/
npm run build:demo       # demo autónoma DEMO.html
npm run push:keys        # claves para avisos push; requiere npm install
npm run backup          # copia consistente de base de datos y medios
```

### Estructura

| Ruta | Función |
| --- | --- |
| `public/` | Frontend responsive: vistas, onboarding, PWA y cálculo compartido |
| `public/app.js` | Navegación, bienvenida, wizard de vuelta y registro de golpes |
| `public/styles.css` | Componentes base |
| `public/refresh.css` | Diseño limpio de la versión 2 |
| `public/demo.js` | Datos ficticios y API local aislada de la liga real |
| `public/config.js` | Modo servidor; build-pages genera su versión de demo |
| `server.mjs`, `src/` | Backend HTTP, sesiones privadas, SSE, SQLite y archivos |
| `tests/` | Verificación del scoring y del servidor real |
| `tools/` | Build de demo/Pages, backup y administración |
| `.github/workflows/pages.yml` | Verificación y despliegue del frontend en Pages |
| `compose.yaml`, `Dockerfile`, `Caddyfile` | Alternativa Docker con HTTPS y almacenamiento persistente |

Se conserva la misma API del proyecto anterior. Para futuras iteraciones se puede extraer el frontend a un framework sin cambiar el motor Stableford ni el modelo de liga.

## Qué cambió en la versión 2

- Bienvenida antes de entrar en la demo; perfil y explicación de la liga en dos pantallas cortas.
- Un botón principal para jugar, menos texto y menos indicadores en el inicio.
- Cuatro destinos principales; campos, calendario, administración y perfiles son secundarios.
- Preparación de la vuelta guiada en tres pasos con búsqueda de campo.
- Controles de golpes grandes, siguiente hoyo explícito y tabla completa plegable.
- Fondo claro, verde como color de acción, espaciado amplio y componentes de móvil.
- Manifest, assets y service worker compatibles con la subruta del repositorio.
- Identidad propia; Golf GameBook se usa como referencia de claridad, sin reutilizar sus logos o activos.

## Reglas iniciales

Stableford neto de 18 hoyos. HCP campo = índice × slope / 113 + (valor de campo − par). El porcentaje de juego se aplica antes de redondear. Mejor vuelta validada de cada mes; la general suma las jornadas configuradas (12 por defecto). Empates con posición compartida. Ningún jugador puede validar su propia vuelta.

## Límites de esta entrega

- La vista previa en Pages es local; las rondas live y los mensajes allí son de prueba.
- El modo servidor conserva cuentas reales, actualización por SSE, fotos, clips y golpes pendientes sin cobertura. Hay que alojarlo para compartirlos entre móviles.
- No se incluye GPS ni base mundial de campos. Las distancias son las de la tarjeta del campo, no medidas GPS.
- Los clips se suben como archivos; no hay retransmisión continua de vídeo.
- Web Push exige claves, HTTPS y pruebas en móviles reales. Cámara, instalación y restricciones de iOS/Android pendientes de validar físicamente.
- Este proyecto permite una liga social; no actualiza el hándicap oficial federativo.

Consulta `docs/RECORRIDO.md` para revisar la experiencia y `docs/ARQUITECTURA.md` para la base técnica del servidor.
