# GnulaHD — Plugin para Kino (v8.0.0)

Plugin oficial de GnulaHD para la aplicación [Kino](https://kino.app). Ofrece catálogo completo de películas, series y anime en alta definición con opciones de audio en Español Latino, Castellano y Subtitulado, filtros por géneros, integración con `kino.meta` (TMDB) y una interfaz declarativa optimizada tanto para móviles como para TV (D-pad y mando).

## Características

- **Catálogo Completo**: Películas, series de televisión y anime actualizados directamente desde GnulaHD.
- **Hero Slider con Backdrops 1080p y Logos**: Portada con los títulos destacados oficiales extraídos con arte panorámico en alta definición y logos transparentes de TMDB.
- **Integración con `kino.meta`**: Enriquecimiento automático de sinopsis oficial, reparto, directores y trailers en español.
- **Filtros por Géneros**: Acceso directo a categorías de Terror, Acción, Comedia, Ciencia Ficción, Suspenso y Animación.
- **Icono Oficial e Identidad Visual**: Isotipo oficial del dragón "G" en `#FF7A18` y banner original de GnulaHD.
- **Múltiples Audios**: Soporte para audio Latino, Castellano y Subtitulado, con selector de preferencia de idioma predeterminado en Ajustes.
- **Reproducción Directa en HD**: Resolución automática de streams HLS (m3u8 hasta 1080p) a través de Vidara y Savefiles como alternativa.
- **Interfaz Nativa Declarativa (`screen`)**:
  - Carrusel destacado (*Hero Card*) con controles de reproducción e información.
  - Rieles temáticos horizontales (*Title Rails*) para Películas, Series, Anime y géneros top.
  - Historial integrado de *Continuar viendo*.
  - Buscador integrado y pantalla de ajustes nativa.
  - Totalmente navegable con D-Pad en Android TV y control remoto.
- **Integración Nativa con Kino**: Compatible con el buscador global, vista de catálogo estándar, cola de reproducción y selector de episodios por temporadas.

## Requisitos

- Kino versión **0.9.74 o superior** (para interfaz declarativa completa `screen` vía apiVersion 14/19).
- Compatible con versiones anteriores de Kino como catálogo estándar.

## Instalación en Kino

1. Abre **Kino**.
2. Ve a **Ajustes** → **Plugins** → **Añadir plugin**.
3. Ingresa la dirección del repositorio:
   ```text
   JuanDEVYT/GnulaHD_plugin
   ```
4. Acepta la instalación y ¡listo! Podrás abrir **GnulaHD** desde el menú principal o la sección de Ajustes.

## Desarrollo y Pruebas

Para compilar y validar el plugin localmente:

```bash
# Instalar dependencias
npm install

# Compilar plugin.js empaquetado
npm run build

# Validar contra el SDK de Kino
npm run validate

# Ejecutar suite de pruebas con datos reales
npm test
```

## Estructura del Proyecto

- `kino-plugin.json`: Manifiesto del plugin, capabilities, temas y configuración.
- `src/plugin.js`: Entry point con las funciones requeridas por Kino (`search`, `home`, `browse`, `episodes`, `resolve`, `screen`, `screenEvent`, `categories`, `section`).
- `src/gnula.js`: Scraper y resolutor de servidores (extracción de tokens GNPV, unpack XOR, resolvers para Vidara y Savefiles).
- `src/browse/`: Mini-app nativa declarativa con interfaz gráfica rica adaptada a la estética y paleta de GnulaHD.
- `logo.png`: Logotipo oficial optimizado para la barra superior.
- `test/`: Pruebas automatizadas con Node test runner y datos en vivo.

## Licencia

MIT
