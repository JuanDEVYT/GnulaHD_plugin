// Textos de la pantalla declarativa para GnulaHD, en español e inglés.
const WORDS = {
  tabHome: ["Inicio", "Home"],
  tabMovies: ["Películas", "Movies"],
  tabSeries: ["Series", "Series"],
  tabAnime: ["Anime", "Anime"],
  brWatch: ["Ver", "Watch"],
  brInfo: ["Más información", "More info"],
  brRecent: ["Continuar viendo", "Continue watching"],
  brSearch: ["Buscar", "Search"],
  brSearchHint: ["Buscar en GnulaHD", "Search GnulaHD"],
  brSearchTitle: ["Buscar", "Search"],
  brSearchedBefore: ["Buscado recientemente", "Recently searched"],
  brNoResults: ["No encontramos nada con esas palabras.", "Nothing matched those words."],
  brSearchFailed: ["No se pudo buscar. Revisa tu conexión e inténtalo de nuevo.", "The search failed. Check your connection and try again."],
  brFailed: ["No se pudo cargar esta sección. Revisa tu conexión e inténtalo de nuevo.", "This section could not be loaded. Check your connection and try again."],
  brRetry: ["Reintentar", "Retry"],
  brEmpty: ["Aún no hay nada aquí.", "Nothing here yet."],
  brBack: ["Atrás", "Back"],
  brClose: ["Cerrar", "Close"],
  brSettings: ["Configuración", "Settings"],
};

export const both = (key) => ({ es: WORDS[key][0], en: WORDS[key][1] });

export const KEYS = Object.keys(WORDS);
