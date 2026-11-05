// Plugin GnulaHD para Kino
import {
  BASE_URL,
  parseCards,
  fetchHtml,
  getPlayerPayload,
  resolveVidara,
  resolveSavefiles,
} from "./gnula.js";
import { makeBrowse } from "./browse/index.js";

function getLangPreference() {
  try {
    if (typeof kino !== "undefined" && kino.config && typeof kino.config.get === "function") {
      return kino.config.get("preferredLang") || "latino";
    }
  } catch (_) {}
  return "latino";
}

// ── Search ───────────────────────────────────────────────────────────────────

export async function search(query) {
  const q = typeof query === "string" ? query.trim() : (query && typeof query.q === "string" ? query.q.trim() : "");
  if (!q) {
    return { items: [] };
  }

  const url = `${BASE_URL}/?s=${encodeURIComponent(q)}`;
  try {
    const html = await fetchHtml(url);
    const items = parseCards(html);
    return { items };
  } catch (err) {
    if (typeof kino !== "undefined" && kino.log) {
      kino.log("search error: " + (err && err.message));
    }
    return { items: [] };
  }
}

// ── Home ─────────────────────────────────────────────────────────────────────

export async function home() {
  const categories = [
    { id: "movies", title: "Películas Recientes", path: "/ver/peliculas/", ref: "peliculas", kind: "movie" },
    { id: "series", title: "Series Recientes", path: "/ver/series/", ref: "series", kind: "series" },
    { id: "anime", title: "Anime Reciente", path: "/ver/anime/", ref: "anime", kind: "series" },
  ];

  const rows = await Promise.all(
    categories.map(async (cat) => {
      try {
        const html = await fetchHtml(`${BASE_URL}${cat.path}`);
        const items = parseCards(html, cat.kind);
        return {
          id: cat.id,
          title: cat.title,
          ref: cat.ref,
          items: items.slice(0, 30),
        };
      } catch (err) {
        if (typeof kino !== "undefined" && kino.log) {
          kino.log(`home category ${cat.id} error: ` + (err && err.message));
        }
        return {
          id: cat.id,
          title: cat.title,
          ref: cat.ref,
          items: [],
        };
      }
    })
  );

  return rows.filter((r) => r.items.length > 0);
}

// ── Browse ───────────────────────────────────────────────────────────────────

export async function browse(ref, cursor) {
  const page = Math.max(1, parseInt(cursor || "1", 10));
  let path = "/ver/peliculas/";
  let defaultKind = "movie";

  const lowerRef = String(ref || "").toLowerCase();
  if (lowerRef === "series" || lowerRef.includes("/series/")) {
    path = "/ver/series/";
    defaultKind = "series";
  } else if (lowerRef === "anime" || lowerRef.includes("/anime/")) {
    path = "/ver/anime/";
    defaultKind = "series";
  } else if (lowerRef === "peliculas" || lowerRef.includes("/peliculas/")) {
    path = "/ver/peliculas/";
    defaultKind = "movie";
  }

  const url = `${BASE_URL}${path}?page=${page}`;
  const html = await fetchHtml(url);
  const items = parseCards(html, defaultKind);

  const hasNextPage =
    html.includes(`page=${page + 1}`) ||
    html.includes(`page/${page + 1}`) ||
    items.length >= 40;

  return {
    items,
    next: hasNextPage ? String(page + 1) : undefined,
  };
}

// ── Episodes ─────────────────────────────────────────────────────────────────

export async function episodes(ref) {
  const pageUrl = String(ref || "");
  const html = await fetchHtml(pageUrl);

  const titleMatch = html.match(/<h1[^>]*class="[^"]*gnrd-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                     html.match(/<title>([^<]+)<\/title>/i);
  const seriesTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s*\|\s*GnulaHD.*$/i, "").trim() : "Serie";

  const epMatches = [...html.matchAll(/<a class="gnrd-epc" href="([^"]+)"[^>]*data-id="([^"]+)"[^>]*data-t="([^"]+)"[^>]*data-s="([^"]+)"[^>]*data-e="([^"]+)"/g)];

  const epList = [];

  for (const m of epMatches) {
    const epHref = m[1];
    const dataId = m[2];
    const dataTok = m[3];
    const season = parseInt(m[4], 10);
    const number = parseInt(m[5], 10);

    const epRef = `${epHref}?id=${dataId}&t=${dataTok}`;

    epList.push({
      season: Number.isNaN(season) ? 1 : season,
      number: Number.isNaN(number) ? 1 : number,
      ref: epRef,
      title: `Episodio ${number}`,
    });
  }

  epList.sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    return a.number - b.number;
  });

  return {
    series: {
      title: seriesTitle,
    },
    episodes: epList,
  };
}

// ── Resolve ──────────────────────────────────────────────────────────────────

export async function resolve(ref) {
  const pageUrl = String(ref || "");
  const payload = await getPlayerPayload(pageUrl);

  if (!payload || !payload.langs || payload.langs.length === 0) {
    if (typeof kino !== "undefined" && kino.error) {
      throw kino.error("unavailable", "No se encontraron reproductores disponibles para este contenido.");
    }
    throw new Error("No player payload available");
  }

  const pref = getLangPreference();
  const sortedLangs = [...payload.langs].sort((a, b) => {
    const la = (a.label || "").toLowerCase();
    const lb = (b.label || "").toLowerCase();
    if (la.includes(pref) && !lb.includes(pref)) return -1;
    if (!la.includes(pref) && lb.includes(pref)) return 1;
    return 0;
  });

  const allServers = [];
  for (const lang of sortedLangs) {
    if (Array.isArray(lang.servers)) {
      for (const srv of lang.servers) {
        allServers.push({
          ...srv,
          langLabel: lang.label,
        });
      }
    }
  }

  const alternatives = [];

  for (const srv of allServers) {
    const src = srv.src || "";
    try {
      let resolved = null;
      if (src.includes("vidara.") || src.includes("vidaraa.") || src.includes("gobsao8u.")) {
        resolved = await resolveVidara(src);
      } else if (src.includes("savefiles.")) {
        resolved = await resolveSavefiles(src);
      }

      if (resolved && resolved.url) {
        try {
          browseScreen().notePlayed(pageUrl);
        } catch (_) {}

        return {
          url: resolved.url,
          mime: resolved.mime || "application/x-mpegURL",
          headers: resolved.headers || {},
          alternatives: alternatives.slice(0, 5),
        };
      }

      if (src) {
        alternatives.push({
          label: `${srv.langLabel} - ${srv.title}`,
          url: src,
        });
      }
    } catch (err) {
      if (typeof kino !== "undefined" && kino.log) {
        kino.log(`Resolver ${srv.title} failed: ` + (err && err.message));
      }
    }
  }

  if (alternatives.length > 0) {
    return {
      url: alternatives[0].url,
      label: alternatives[0].label,
      alternatives: alternatives.slice(1),
    };
  }

  if (typeof kino !== "undefined" && kino.error) {
    throw kino.error("unavailable", "Los servidores de video no están disponibles actualmente.");
  }
  throw new Error("No stream found");
}

// ── Section ──────────────────────────────────────────────────────────────────

async function loadTabPage(tab) {
  if (tab === "inicio") {
    const rows = await home();
    return { rows };
  }
  if (tab === "peliculas") {
    const res = await browse("peliculas", "1");
    return { rows: [{ id: "peliculas", title: "Películas en HD", ref: "peliculas", items: res.items }] };
  }
  if (tab === "series") {
    const res = await browse("series", "1");
    return { rows: [{ id: "series", title: "Series de TV", ref: "series", items: res.items }] };
  }
  if (tab === "anime") {
    const res = await browse("anime", "1");
    return { rows: [{ id: "anime", title: "Anime en HD", ref: "anime", items: res.items }] };
  }
  return { rows: [] };
}

export async function section(ctx) {
  const tab = ctx && typeof ctx === "object" ? ctx.tab : undefined;
  const tabs = [
    { id: "inicio", label: "Inicio", labelEn: "Home" },
    { id: "peliculas", label: "Películas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" },
    { id: "anime", label: "Anime", labelEn: "Anime" },
  ];
  const chosen = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;
  const page = await loadTabPage(chosen);
  return {
    tabs,
    tab: chosen,
    rows: page.rows,
  };
}

export async function categories() {
  return [
    { id: "peliculas", ref: "peliculas", title: "Películas", titleEn: "Movies", icon: "movie" },
    { id: "series", ref: "series", title: "Series", titleEn: "Series", icon: "tv" },
    { id: "anime", ref: "anime", title: "Anime", titleEn: "Anime", icon: "animation" },
  ];
}

// ── Screen capability ────────────────────────────────────────────────────────

let browseInstance = null;

function browseScreen() {
  if (browseInstance) return browseInstance;

  browseInstance = makeBrowse({
    kino: typeof kino !== "undefined" ? kino : {},
    loadTab: async (tab) => loadTabPage(tab),
    searchTitles: async (q) => {
      const res = await search(q);
      return res.items || [];
    },
  });

  return browseInstance;
}

export async function screen(ctx) {
  await null;
  return browseScreen().view(ctx && typeof ctx === "object" ? ctx : {});
}

export async function screenEvent(ev) {
  await null;
  return browseScreen().event(ev && typeof ev === "object" ? ev : {});
}
