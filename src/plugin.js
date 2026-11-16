// Plugin principal de GnulaHD para Kino (v8.0.1)
import { makeBrowse } from "./browse/index.js";
import {
  BASE_URL,
  fetchHtml,
  fetchJson,
  cleanId,
  parseCards,
  parseHeroSlides,
  gnrdUnpack,
  resolveVidara,
  resolveSavefiles
} from "./gnula.js";

let browseApp = null;
function getBrowseApp() {
  if (!browseApp) {
    browseApp = makeBrowse({
      kino: typeof kino !== "undefined" ? kino : null,
      loadTab: async (tab) => {
        if (tab === "inicio") {
          const rows = await home();
          return { rows };
        }
        if (tab === "peliculas") {
          const res = await browse("peliculas", "1");
          return {
            rows: [
              { id: "peliculas", title: "Películas en HD", ref: "peliculas", items: res.items }
            ]
          };
        }
        if (tab === "series") {
          const res = await browse("series", "1");
          return {
            rows: [
              { id: "series", title: "Series de TV", ref: "series", items: res.items }
            ]
          };
        }
        if (tab === "anime") {
          const res = await browse("anime", "1");
          return {
            rows: [
              { id: "anime", title: "Anime en HD", ref: "anime", items: res.items }
            ]
          };
        }
        return { rows: [] };
      },
      searchTitles: async (q) => {
        const res = await search({ q });
        return Array.isArray(res) ? res : res.items || [];
      }
    });
  }
  return browseApp;
}

export async function search(query) {
  const q = typeof query === "string" ? query : (query && query.q) || "";
  const queryType = typeof query === "object" && query ? query.type : null;
  const cleanQ = q.trim();
  if (!cleanQ) return { items: [] };

  const jsonUrl = `${BASE_URL}/wp-json/gnrd/v1/search?q=${encodeURIComponent(cleanQ)}`;
  const htmlUrl = `${BASE_URL}/?s=${encodeURIComponent(cleanQ)}`;

  const [jsonRes, htmlRes] = await Promise.allSettled([
    fetchJson(jsonUrl),
    fetchHtml(htmlUrl)
  ]);

  const typeMap = new Map();
  const jsonResults =
    jsonRes.status === "fulfilled" && jsonRes.value && Array.isArray(jsonRes.value.results)
      ? jsonRes.value.results
      : [];

  for (const r of jsonResults) {
    if (r.url && r.type) {
      typeMap.set(r.url, r.type);
      const m = r.url.match(/\/ver\/([^\/]+)/);
      if (m) typeMap.set(m[1], r.type);
    }
  }

  const defaultKind = queryType === "series" ? "series" : "movie";
  let items = [];

  if (htmlRes.status === "fulfilled" && htmlRes.value) {
    items = parseCards(htmlRes.value, defaultKind, typeMap);
  }

  if (items.length === 0 && jsonResults.length > 0) {
    items = jsonResults.map((r) => {
      const slugMatch = r.url.match(/\/ver\/([^\/]+)/);
      const rawSlug = slugMatch ? slugMatch[1] : r.url.replace(/^https?:\/\/[^\/]+\//, "");
      const isSeries = /serie|anime/i.test(r.type || "") || queryType === "series";
      return {
        id: cleanId(rawSlug),
        ref: r.url,
        title: r.title,
        kind: isSeries ? "series" : "movie",
        poster: r.img || "",
        backdrop: "",
        year: r.year ? String(r.year) : undefined,
        badges: r.type ? [r.type] : []
      };
    });
  } else if (items.length > 0 && jsonResults.length > 0) {
    const existingRefs = new Set(items.map((i) => i.ref));
    for (const r of jsonResults) {
      if (!existingRefs.has(r.url)) {
        const slugMatch = r.url.match(/\/ver\/([^\/]+)/);
        const rawSlug = slugMatch ? slugMatch[1] : r.url.replace(/^https?:\/\/[^\/]+\//, "");
        const isSeries = /serie|anime/i.test(r.type || "") || queryType === "series";
        items.push({
          id: cleanId(rawSlug),
          ref: r.url,
          title: r.title,
          kind: isSeries ? "series" : "movie",
          poster: r.img || "",
          backdrop: "",
          year: r.year ? String(r.year) : undefined,
          badges: r.type ? [r.type] : []
        });
      }
    }
  }

  return { items };
}

export async function home() {
  const homeHtml = await fetchHtml(BASE_URL + "/");
  const heroSlides = parseHeroSlides(homeHtml);

  const [moviesHtml, seriesHtml, animeHtml, terrorHtml, accionHtml] = await Promise.all([
    fetchHtml(`${BASE_URL}/ver/peliculas/`),
    fetchHtml(`${BASE_URL}/ver/series/`),
    fetchHtml(`${BASE_URL}/ver/anime/`),
    fetchHtml(`${BASE_URL}/genres/terror/`),
    fetchHtml(`${BASE_URL}/genres/accion/`)
  ]);

  const movieItems = parseCards(moviesHtml, "movie");
  const seriesItems = parseCards(seriesHtml, "series");
  const animeItems = parseCards(animeHtml, "series");
  const terrorItems = parseCards(terrorHtml, "movie");
  const accionItems = parseCards(accionHtml, "movie");

  const rows = [];
  if (heroSlides && heroSlides.length > 0) {
    rows.push({
      id: "featured",
      title: "Destacados GnulaHD",
      ref: "destacados",
      items: heroSlides
    });
  }
  rows.push({
    id: "movies",
    title: "Películas Recientes",
    ref: "peliculas",
    items: movieItems
  });
  rows.push({
    id: "series",
    title: "Series Recientes",
    ref: "series",
    items: seriesItems
  });
  rows.push({
    id: "anime",
    title: "Anime Reciente",
    ref: "anime",
    items: animeItems
  });
  if (terrorItems.length > 0) {
    rows.push({
      id: "terror",
      title: "Terror · Top Semanal",
      ref: "genres/terror",
      items: terrorItems
    });
  }
  if (accionItems.length > 0) {
    rows.push({
      id: "accion",
      title: "Acción · Top Semanal",
      ref: "genres/accion",
      items: accionItems
    });
  }
  return rows;
}

export async function browse(ref, cursor) {
  const page = parseInt(cursor || "1", 10);
  let url = "";
  let defaultKind = "movie";

  if (ref === "peliculas") {
    url = `${BASE_URL}/ver/peliculas/?page=${page}`;
    defaultKind = "movie";
  } else if (ref === "series") {
    url = `${BASE_URL}/ver/series/?page=${page}`;
    defaultKind = "series";
  } else if (ref === "anime") {
    url = `${BASE_URL}/ver/anime/?page=${page}`;
    defaultKind = "series";
  } else if (ref.startsWith("genres/") || ref.startsWith("generos/")) {
    const slug = ref.replace(/^(genres|generos)\//, "").replace(/\/$/, "");
    url = `${BASE_URL}/genres/${slug}/?page=${page}`;
    defaultKind = "movie";
  } else if (ref.startsWith("http")) {
    url = ref.includes("?") ? `${ref}&page=${page}` : `${ref}?page=${page}`;
  } else {
    url = `${BASE_URL}/genres/${ref}/?page=${page}`;
  }

  const html = await fetchHtml(url);
  const items = parseCards(html, defaultKind);
  const hasNext = html.includes(`page=${page + 1}`) || items.length >= 40;
  return {
    items,
    next: hasNext ? String(page + 1) : null
  };
}

export async function episodes(ref) {
  const html = await fetchHtml(ref);
  const seriesTitle = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").replace(/<[^>]+>/g, "").trim() || "GnulaHD Series";

  const cardRegex = /<a[^>]*class="[^"]*gnrd-epc[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  const episodes = [];
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const innerHtml = match[1];

    const hrefMatch = fullTag.match(/href="([^"]+)"/);
    const sMatch = fullTag.match(/data-s="([^"]+)"/);
    const eMatch = fullTag.match(/data-e="([^"]+)"/);
    const idMatch = fullTag.match(/data-id="([^"]+)"/);
    const tMatch = fullTag.match(/data-t="([^"]+)"/);

    if (!hrefMatch) continue;

    const href = hrefMatch[1];
    const sNum = sMatch ? parseInt(sMatch[1], 10) : 1;
    const eNum = eMatch ? parseInt(eMatch[1], 10) : 1;
    const pid = idMatch ? idMatch[1] : "";
    const tok = tMatch ? tMatch[1] : "";

    const titleMatch = innerHtml.match(/class="[^"]*gnrd-epc-title[^"]*"[^>]*>([\s\S]*?)<\//i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : `Episodio ${eNum}`;

    const imgMatch = innerHtml.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i);
    const still = imgMatch ? imgMatch[1] : "";

    const epRef = pid && tok ? `${href}?id=${pid}&t=${tok}` : href;

    episodes.push({
      season: sNum,
      number: eNum,
      ref: epRef,
      title,
      still
    });
  }

  episodes.sort((a, b) => a.season - b.season || a.number - b.number);

  return {
    series: { title: seriesTitle },
    episodes
  };
}

export async function resolve(ref) {
  let pid = null;
  let tok = null;

  try {
    const u = new URL(ref);
    pid = u.searchParams.get("id");
    tok = u.searchParams.get("t");
  } catch (_) {}

  if (!pid || !tok) {
    const html = await fetchHtml(ref);
    const pidMatch = html.match(/_gnrdPid\s*=\s*(\d+)/);
    const tokMatch = html.match(/_gnrdTok\s*=\s*"([^"]+)"/);
    if (pidMatch) pid = pidMatch[1];
    if (tokMatch) tok = tokMatch[1];
  }

  if (!pid || !tok) {
    throw typeof kino !== "undefined" && kino.error
      ? kino.error("unavailable", "No se encontró el reproductor para este contenido")
      : new Error("No se encontró el reproductor de GnulaHD");
  }

  const apiUrl = `${BASE_URL}/wp-json/gnrd/v1/player?id=${pid}&t=${encodeURIComponent(tok)}`;
  const res = await kino.fetch(apiUrl, { headers: { Referer: ref } });
  const data = await res.json();

  if (!data || !data.p) {
    throw typeof kino !== "undefined" && kino.error
      ? kino.error("unavailable", "Respuesta inválida del reproductor de GnulaHD")
      : new Error("Respuesta vacía del reproductor");
  }

  const unpacked = gnrdUnpack(data.p);
  if (!unpacked || !Array.isArray(unpacked.langs)) {
    throw typeof kino !== "undefined" && kino.error
      ? kino.error("unavailable", "No se pudieron descifrar los servidores")
      : new Error("No se pudieron descifrar los servidores");
  }

  const preferred = (typeof kino !== "undefined" && kino.config && kino.config.get("preferredLang")) || "latino";
  const sortedLangs = [...unpacked.langs].sort((a, b) => {
    const aLabel = (a.label || "").toLowerCase();
    const bLabel = (b.label || "").toLowerCase();
    if (preferred === "latino" && aLabel.includes("lat")) return -1;
    if (preferred === "latino" && bLabel.includes("lat")) return 1;
    if (preferred === "castellano" && (aLabel.includes("cast") || aLabel.includes("esp"))) return -1;
    if (preferred === "castellano" && (bLabel.includes("cast") || bLabel.includes("esp"))) return 1;
    if (preferred === "subtitulado" && aLabel.includes("sub")) return -1;
    if (preferred === "subtitulado" && bLabel.includes("sub")) return 1;
    return 0;
  });

  const alternatives = [];
  let directStream = null;

  for (const l of sortedLangs) {
    if (!Array.isArray(l.servers)) continue;
    for (const s of l.servers) {
      const src = s.src || "";
      if (!src) continue;
      if (src.includes("vidara")) {
        const streamObj = await resolveVidara(src);
        if (streamObj && !directStream) {
          directStream = streamObj;
        } else if (streamObj) {
          alternatives.push({
            name: `${s.title || "Vidara"} (${l.label || "Video"})`,
            url: streamObj.url,
            mime: streamObj.mime
          });
        }
      } else if (src.includes("savefiles")) {
        const streamObj = await resolveSavefiles(src);
        if (streamObj && !directStream) {
          directStream = streamObj;
        } else if (streamObj) {
          alternatives.push({
            name: `${s.title || "Savefiles"} (${l.label || "Video"})`,
            url: streamObj.url,
            mime: streamObj.mime
          });
        }
      }
    }
  }

  if (directStream) {
    return {
      ...directStream,
      alternatives: alternatives.length > 0 ? alternatives : undefined
    };
  }

  throw typeof kino !== "undefined" && kino.error
    ? kino.error("unavailable", "No hay servidores disponibles para reproducir")
    : new Error("No hay servidores de video reproducibles disponibles");
}

export async function categories() {
  return [
    { id: "peliculas", ref: "peliculas", title: "Películas", titleEn: "Movies", icon: "movie" },
    { id: "series", ref: "series", title: "Series", titleEn: "Series", icon: "tv" },
    { id: "anime", ref: "anime", title: "Anime", titleEn: "Anime", icon: "animation" },
    { id: "terror", ref: "genres/terror", title: "Terror", titleEn: "Horror", icon: "psychology" },
    { id: "accion", ref: "genres/accion", title: "Acción", titleEn: "Action", icon: "flash_on" },
    { id: "comedia", ref: "genres/comedia", title: "Comedia", titleEn: "Comedy", icon: "sentiment_very_satisfied" },
    { id: "ciencia-ficcion", ref: "genres/ciencia-ficcion", title: "Ciencia Ficción", titleEn: "Sci-Fi", icon: "rocket" },
    { id: "suspenso", ref: "genres/suspenso", title: "Suspenso", titleEn: "Thriller", icon: "visibility" },
    { id: "animacion", ref: "genres/animacion", title: "Animación", titleEn: "Animation", icon: "brush" }
  ];
}

export async function section(ctx) {
  const tab = ctx && typeof ctx === "object" ? ctx.tab : undefined;
  const tabs = [
    { id: "inicio", label: "Inicio", labelEn: "Home" },
    { id: "peliculas", label: "Películas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" },
    { id: "anime", label: "Anime", labelEn: "Anime" }
  ];
  const chosen = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;
  const page = await getBrowseApp().loadTab(chosen);
  return {
    tabs,
    tab: chosen,
    rows: page ? page.rows : []
  };
}

export async function screen(ctx) {
  const app = getBrowseApp();
  return app.view(ctx);
}

export async function screenEvent(ev) {
  const app = getBrowseApp();
  return app.event(ev);
}
