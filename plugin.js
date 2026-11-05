// src/gnula.js
var BASE_URL = "https://ww3.gnulahd.nu";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function gnrdUnpack(s) {
  try {
    const b = atob(s);
    const k = [103, 78, 55, 100];
    const a = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) {
      a[i] = b.charCodeAt(i) ^ k[i & 3];
    }
    return JSON.parse(new TextDecoder("utf-8").decode(a));
  } catch {
    return null;
  }
}
function cleanText(str) {
  if (!str) return "";
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function parseCards(html, defaultKind = "movie") {
  const items = [];
  const cardRegex = /<a class="gnrd-card" href="([^"]+)" title="([^"]+)">([\s\S]*?)<\/a>/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const href = match[1];
    const rawTitle = match[2];
    const inner = match[3];
    const slugMatch = href.match(/\/ver\/([^\/]+)/);
    let rawSlug = slugMatch ? slugMatch[1] : href.replace(/^https?:\/\/[^\/]+\//, "");
    try {
      rawSlug = decodeURIComponent(rawSlug);
    } catch (_) {
    }
    let id = rawSlug.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._~-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 128);
    if (!id) id = "item-" + Date.now().toString(36);
    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/i);
    const poster = imgMatch ? imgMatch[1] : void 0;
    const ratingMatch = inner.match(/class="[^"]*rating[^"]*">[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : void 0;
    const yearMatch = inner.match(/<span>(19\d{2}|20\d{2})<\/span>/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : void 0;
    const langMatches = [...inner.matchAll(/class="gnrd-lang">([^<]+)<\/span>/g)].map((m) => m[1].trim());
    const badges = langMatches.slice(0, 3);
    let kind = defaultKind;
    if (inner.includes("Serie") || href.includes("-temporada-") || href.includes("serie")) {
      kind = "series";
    } else if (inner.includes("Anime")) {
      kind = "series";
    }
    const title = cleanText(rawTitle);
    if (!title) continue;
    const item = {
      id,
      ref: href,
      title,
      kind
    };
    if (poster && /^https?:\/\//.test(poster)) item.poster = poster;
    if (rating !== void 0 && !Number.isNaN(rating)) item.rating = rating;
    if (year !== void 0 && !Number.isNaN(year)) item.year = year;
    if (badges.length > 0) item.badges = badges;
    items.push(item);
  }
  return items;
}
async function fetchHtml(url, referer = BASE_URL) {
  const res = await kino.fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": referer,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al cargar ${url}`);
  }
  return await res.text();
}
async function fetchJson(url, referer = BASE_URL) {
  const res = await kino.fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": referer,
      "Accept": "application/json,text/plain,*/*"
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al cargar JSON ${url}`);
  }
  return await res.json();
}
async function getPlayerPayload(pageUrl, html) {
  const u = new URL(pageUrl, BASE_URL);
  let pid = u.searchParams.get("id");
  let tok = u.searchParams.get("t");
  if (!pid || !tok) {
    if (!html) {
      html = await fetchHtml(pageUrl, BASE_URL);
    }
    const pidMatch = html.match(/_gnrdPid\s*=\s*(\d+)/);
    const tokMatch = html.match(/_gnrdTok\s*=\s*"([^"]+)"/);
    if (pidMatch && tokMatch) {
      pid = pidMatch[1];
      tok = tokMatch[1];
    }
  }
  if (!pid || !tok) {
    return null;
  }
  const apiUrl = `${BASE_URL}/wp-json/gnrd/v1/player?id=${pid}&t=${encodeURIComponent(tok)}`;
  const data = await fetchJson(apiUrl, pageUrl);
  if (!data || !data.p) return null;
  return gnrdUnpack(data.p);
}
async function resolveVidara(url) {
  const m = url.match(/(?:vidara\.[a-z]+|vidaraa\.[a-z]+|gobsao8u\.[a-z]+)\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const filecode = m[1];
  const hostMatch = url.match(/https?:\/\/([^\/]+)/i);
  const host = hostMatch ? hostMatch[1] : "vidara.to";
  const res = await kino.fetch(`https://${host}/api/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "Referer": `https://${host}/e/${filecode}`,
      "Origin": `https://${host}`
    },
    body: JSON.stringify({ filecode, device: "desktop", codecs: ["h264", "aac"] })
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data && data.streaming_url) {
    return {
      url: data.streaming_url,
      mime: "application/x-mpegURL",
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": `https://${host}/`
      }
    };
  }
  return null;
}
async function resolveSavefiles(url) {
  const m = url.match(/savefiles\.com\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const filecode = m[1];
  const params = new URLSearchParams({
    op: "embed",
    file_code: filecode,
    auto: "1",
    referer: BASE_URL
  });
  const res = await kino.fetch("https://savefiles.com/dl", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "Referer": `https://savefiles.com/e/${filecode}`,
      "Origin": "https://savefiles.com"
    },
    body: params.toString()
  });
  if (!res.ok) return null;
  const html = await res.text();
  const m3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
  if (m3u8Match) {
    return {
      url: m3u8Match[0],
      mime: "application/x-mpegURL",
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": `https://savefiles.com/`
      }
    };
  }
  return null;
}

// src/browse/model.js
var TAB_IDS = ["inicio", "peliculas", "series", "anime"];
var MAX_SLIDES = 6;
var MAX_RAILS = 8;
var MAX_RAIL_ITEMS = 24;
var MAX_SLIDE_TEXT = 160;
var HTTPS = /^https?:\/\//;
function cardOf(item) {
  const out = {
    id: `${item.kind || "movie"}-${item.id}`,
    ref: item.ref,
    title: item.title,
    kind: item.kind || "movie"
  };
  const poster = item.poster || item.logo;
  if (poster && HTTPS.test(poster)) out.poster = poster;
  if (item.backdrop && HTTPS.test(item.backdrop)) out.backdrop = item.backdrop;
  if (item.rating !== void 0) out.rating = item.rating;
  if (item.year !== void 0) out.year = item.year;
  if (item.badges && Array.isArray(item.badges)) out.badges = item.badges.slice(0, 3);
  return out;
}
function slidesOf(rows) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    if (!row || !Array.isArray(row.items)) continue;
    for (const item of row.items) {
      if (out.length >= MAX_SLIDES) return out;
      const img = item.backdrop || item.poster;
      if (!img || !HTTPS.test(img) || seen.has(item.id)) continue;
      seen.add(item.id);
      const text = typeof item.overview === "string" ? item.overview.trim() : item.badges ? item.badges.join(" \xB7 ") : "";
      out.push({
        id: item.id,
        ref: item.ref,
        kind: item.kind || "movie",
        title: item.title,
        image: img,
        text: text.length <= MAX_SLIDE_TEXT ? text : `${text.slice(0, MAX_SLIDE_TEXT - 1).trimEnd()}\u2026`
      });
    }
  }
  return out;
}
function railsOf(rows) {
  return rows.filter((r) => r && r.items && r.items.length > 0).slice(0, MAX_RAILS).map((r) => ({
    id: r.id,
    title: r.title,
    ...r.ref ? { ref: r.ref } : {},
    items: r.items.slice(0, MAX_RAIL_ITEMS).map(cardOf)
  }));
}
function tabOf(page) {
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const rails = railsOf(rows);
  if (rails.length === 0) return null;
  return { slides: slidesOf(rows), rails };
}
function playedKey(ref) {
  const r = String(ref || "");
  const m = /\/ver\/([^\/\?#]+)/.exec(r) || /gnulahd\.nu\/([^\/\?#]+)/.exec(r);
  return m ? m[1] : "";
}
function recentOf(keys, tabs) {
  if (!keys || keys.length === 0) return [];
  const byKey = /* @__PURE__ */ new Map();
  for (const data of tabs) {
    if (!data || !data.rails) continue;
    for (const rail2 of data.rails) {
      for (const card of rail2.items) {
        const k = playedKey(card.ref);
        if (k && !byKey.has(k)) byKey.set(k, card);
      }
    }
  }
  const out = [];
  const used = /* @__PURE__ */ new Set();
  for (const key of keys) {
    const card = byKey.get(key);
    if (card && !used.has(card.id)) {
      used.add(card.id);
      out.push(card);
    }
  }
  return out;
}

// src/browse/words.js
var WORDS = {
  tabHome: ["Inicio", "Home"],
  tabMovies: ["Pel\xEDculas", "Movies"],
  tabSeries: ["Series", "Series"],
  tabAnime: ["Anime", "Anime"],
  brWatch: ["Ver", "Watch"],
  brInfo: ["M\xE1s informaci\xF3n", "More info"],
  brRecent: ["Continuar viendo", "Continue watching"],
  brSearch: ["Buscar", "Search"],
  brSearchHint: ["Buscar en GnulaHD", "Search GnulaHD"],
  brSearchTitle: ["Buscar", "Search"],
  brSearchedBefore: ["Buscado recientemente", "Recently searched"],
  brNoResults: ["No encontramos nada con esas palabras.", "Nothing matched those words."],
  brSearchFailed: ["No se pudo buscar. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "The search failed. Check your connection and try again."],
  brFailed: ["No se pudo cargar esta secci\xF3n. Revisa tu conexi\xF3n e int\xE9ntalo de nuevo.", "This section could not be loaded. Check your connection and try again."],
  brRetry: ["Reintentar", "Retry"],
  brEmpty: ["A\xFAn no hay nada aqu\xED.", "Nothing here yet."],
  brBack: ["Atr\xE1s", "Back"],
  brClose: ["Cerrar", "Close"],
  brSettings: ["Configuraci\xF3n", "Settings"]
};
var both = (key) => ({ es: WORDS[key][0], en: WORDS[key][1] });
var KEYS = Object.keys(WORDS);

// src/browse/logo.js
var LOGO_ASPECT = "3.33:1";
var LOGO_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAACWCAYAAAAonXpvAAAEvElEQVR42u3dzU0DMRSF0bTAAokNjVLX9GcaAAIh/rnvHaSzi1DwYH+yJuPcXl7fBwCQ7WYQAEDQAQBBBwAEHQAQdAAQdABA0AEAQQcABB0ABB0AEHQAQNABAEEHAEEHAAQdABB0AEDQAUDQAQBBBwAEHQAQdAAQdABA0AEAQQcABB0ABB0AEHQAQNABAEEHAEEHAAQdABB0AEDQAUDQAQBBBwAEHQAQdAAQdB4yPt4u4wCAoAcE+467rzGOAAj6/oCPJxB4AAR9Q8jHRMIOgKBPDPnYQNgBEPTgkAs7AIJeKOTCDoCgF4u5qAMg6L+M+Qgi6gAIetiu3G4dAEEvGnNRB0DQi8Rc1AHoG/RiMRd1APoFvWjMRR2AlkEfhQk6ALWD3iDmog5A7aA3irmoA1Az6MXvmx91P33X3/us9zl7HLzP7WtBxP/nv//Ob35O+/2zf0S8btBHQ4IulIIu6IJOjaA3jvmWqAu6oAu6oAu6oMcFfecCIehCKeiCLuiC3ibos3fnuxeJE6Mu6IIu6IIu6IIeG/SAqAu6UAq6oAu6oIv5XyZp96gLuqALuqALuqCXCPrBURd0oRR0QRd0Qffc+SOTtONz6VUXdkGvfd2r/f+nBz1lHAS90KNqJ+8Idu3SBV3QBV3QBV3QSwb9sLALuqALuqALuqAL+qxFT9AFXdAFXdAFXdA3ngyX9sGcFVEXdEEXdEEXdEFvE/TNURd0QRd0QRd0QRf0Z09SQRd0QRd0QRd0QS8Q9A1RF3RBF3RBF3RBF/SZk7Rj0FMOlpn9ekF3sMyKoJ92kIugC3rZoC9acARd0AVd0AVd0AV91SQVdEEXdEEXdEEX9CKTVNAFXdAFXdAFvWXQV8Z85SRNirqgC7qgC7qgC7oduh26oAu6oAu6oAu6e+iCLuiCLuiCLuiC7lPugi7ogi7ogi7ogu459J4BSjmgRtAdLONgGUEXdCfFCZCgC7qgC7qgC7qz3AVd0AVd0AVd0AsH3betCbrxFHRBF3RBDw+670MXdOMp6IIu6IJ+UNTDQj495oIu6IIu6IIu6OWDfkDMBV3QBV3QBV3QBf3RSXpIyAVd0AVd0AVd0GODfu0O+mkx3xn0lNsfKaF0O6n2de8e9F0H3Qh64116SMiX7c4t7ILuugu6oAt6maAfGnNBF3RBF3RBF/TcNz876iEhXxZzC7ugu+6CLuiCHh30w2Mu6IIu6IIu6GQHfXbUxdzCLuiuu6ALuqAXPDlO0C3sgu66C7qgC7qox8fcwi7orrugC7qgl3guveNz5wAIul16sd05AIIu6mIOgKCLupgD0DHol/vmAAi6qIs5AIIu6mIOgKCLupgDIOiloi7mAAh6+KffhRwAQQ/erduVAyDo4VEXcwAEPTjsQg6AoAeHXcgBEPRJYb9WRFzIARD0dWG/nh1xIQdA0M8I/FfB//E1xhEAQQ8IvnEAQNABAEEHAAQdAAQdABB0AEDQAQBBBwBBBwAEHQAQdABA0AFA0AEAQQcABB0AEHQAEHQAQNABAEEHAAQdAAQdABB0AEDQAQBBBwBBBwAEHQAQdABA0AFA0AEAQQcABB0AEHQAEHQAQNABAEEHAAQdAAQdABB0AGCTT++NX/1XjkJ+AAAAAElFTkSuQmCC";

// src/browse/view.js
var TAB_KEYS = {
  inicio: "tabHome",
  peliculas: "tabMovies",
  series: "tabSeries",
  anime: "tabAnime"
};
var POLL_MS = 1500;
var SEARCH_CAP = 60;
var twin = (key, field = "text", vars) => {
  const w = both(key, vars);
  return { [field]: w.es, [field + "En"]: w.en };
};
var logo = () => ({
  type: "Image",
  key: "logo",
  url: LOGO_DATA,
  aspect: LOGO_ASPECT,
  fit: "contain",
  h: 40,
  alt: "GnulaHD",
  altEn: "GnulaHD",
  fallback: { type: "Text", text: "GnulaHD", textEn: "GnulaHD", style: "h4" }
});
var tabBar = (active) => ({
  type: "TabBar",
  key: "tabs",
  divider: false,
  value: active,
  onChanged: "tab",
  tabs: TAB_IDS.map((id) => ({ value: id, ...twin(TAB_KEYS[id], "label") }))
});
var railSkeleton = (n) => ({
  type: "Column",
  key: "skel" + n,
  gap: 8,
  children: [
    { type: "Skeleton", shape: "line" },
    { type: "Row", gap: 12, sizes: ["compact"], children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}c${i}`, flex: 1 })) },
    { type: "Row", gap: 12, sizes: ["medium", "expanded"], children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `sk${n}w${i}`, flex: 1 })) }
  ]
});
var gridSkeleton = () => ({
  type: "Column",
  key: "gridSkeleton",
  gap: 12,
  children: [
    ...[1, 2].map((r) => ({ type: "Row", gap: 12, sizes: ["compact"], key: `gc${r}`, children: [1, 2, 3].map((i) => ({ type: "Skeleton", shape: "card", key: `gc${r}-${i}`, flex: 1 })) })),
    ...[1, 2].map((r) => ({ type: "Row", gap: 12, sizes: ["medium", "expanded"], key: `gw${r}`, children: [1, 2, 3, 4, 5, 6].map((i) => ({ type: "Skeleton", shape: "card", key: `gw${r}-${i}`, flex: 1 })) }))
  ]
});
var heroSkeleton = () => ({
  type: "Skeleton",
  key: "heroSkeleton",
  shape: "block",
  height: { compact: 200, expanded: 320 }
});
var slideNode = (s) => ({
  type: "heroCard",
  key: "slide-" + s.id,
  h: { compact: 200, expanded: 240 },
  title: s.title,
  text: s.text,
  image: s.image,
  buttons: [
    {
      type: "ElevatedButton",
      key: "watch-" + s.id,
      ...twin("brWatch", "labelText"),
      icon: "play",
      onPressed: { go: { play: { ref: s.ref, kind: s.kind, id: s.id, title: s.title } } }
    },
    {
      type: "TextButton",
      key: "info-" + s.id,
      ...twin("brInfo", "labelText"),
      onPressed: { go: { title: { ref: s.ref, kind: s.kind, id: s.id, title: s.title } } }
    }
  ]
});
var hero = (slides) => slides.length === 1 ? slideNode(slides[0]) : {
  type: "PageView",
  key: "hero" + slides.length,
  autoPlayMs: 6e3,
  children: slides.map(slideNode)
};
var rail = (r, key, titleOverride, size = "medium") => ({
  type: "titleRail",
  key,
  ...titleOverride || { title: r.title },
  ...r.ref ? { ref: r.ref } : {},
  items: r.items,
  size
});
function browseView({ tab, data, recent, pending, failed, device = "phone" }) {
  const tv = device === "tv";
  const gear = {
    type: "IconButton",
    key: "settingsButton",
    icon: "settings",
    ...twin("brSettings", "labelText"),
    ...twin("brSettings", "tooltip"),
    onPressed: { event: "go", arg: "settings" }
  };
  const active = TAB_IDS.includes(tab) ? tab : TAB_IDS[0];
  const body = [];
  if (data) {
    if (data.slides.length > 0) body.push(hero(data.slides));
    else if (pending) body.push(heroSkeleton());
    if (recent && recent.length > 0) body.push(rail({ items: recent }, "recent", twin("brRecent", "title"), tv ? "small" : "medium"));
    for (const r of data.rails) {
      body.push(rail(r, "rail-" + String(r.id).replace(/[^A-Za-z0-9_-]/g, "_"), null, tv ? "small" : "medium"));
    }
    if (data.rails.length === 0) {
      body.push({ type: "Text", ...twin("brEmpty", "text"), color: "muted" });
    }
  } else if (failed) {
    body.push({
      type: "MaterialBanner",
      key: "loadFailed",
      role: "error",
      ...twin("brFailed"),
      action: { ...twin("brRetry", "label"), onTap: "retry" }
    });
  } else {
    body.push(heroSkeleton(), railSkeleton(1), railSkeleton(2), railSkeleton(3));
  }
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: {
        type: "IconButton",
        key: "close",
        icon: "close",
        ...twin("brClose", "labelText"),
        ...twin("brClose", "tooltip"),
        onPressed: { go: { close: true } }
      },
      actions: tv ? [
        {
          type: "IconButton",
          key: "searchButton",
          icon: "search",
          ...twin("brSearch", "labelText"),
          ...twin("brSearch", "tooltip"),
          onPressed: "openSearch"
        },
        gear
      ] : [gear],
      title: tv ? {
        type: "Row",
        key: "titleRow",
        gap: 24,
        crossAxisAlignment: "center",
        children: [logo(), tabBar(active)]
      } : logo()
    },
    ...tv ? {} : {
      floatingActionButton: {
        type: "FloatingActionButton",
        key: "searchFab",
        icon: "search",
        ...twin("brSearch", "tooltip"),
        onPressed: "openSearch"
      }
    },
    body: {
      type: "Column",
      key: "page",
      children: [
        ...tv ? [] : [
          {
            type: "Column",
            key: "tabsRow",
            padding: { compact: 0, expanded: 24 },
            children: [tabBar(active)]
          }
        ],
        {
          type: "SingleChildScrollView",
          key: "browse-" + active,
          flex: 1,
          children: [
            {
              type: "Column",
              padding: { compact: 12, expanded: 24 },
              gap: 16,
              children: body
            }
          ]
        }
      ]
    },
    ...pending ? { every: { ms: POLL_MS, event: "tick" } } : {}
  };
}
function settingsView() {
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: {
        type: "IconButton",
        key: "back",
        icon: "arrow_back",
        ...twin("brBack", "labelText"),
        ...twin("brBack", "tooltip"),
        onPressed: "back"
      },
      title: logo()
    },
    body: {
      type: "SingleChildScrollView",
      key: "settings-page",
      children: [
        {
          type: "Column",
          padding: { compact: 12, expanded: 24 },
          gap: 16,
          children: [{ type: "settings", key: "form" }]
        }
      ]
    }
  };
}
function searchView({ query, status, items, history = [], device = "phone" }) {
  const tv = device === "tv";
  const searchForm = () => ({
    type: "Form",
    key: "searchForm",
    onSubmitted: "search",
    gap: 8,
    children: tv ? [
      {
        type: "Row",
        key: "searchRow",
        gap: 16,
        crossAxisAlignment: "center",
        children: [
          {
            type: "TextField",
            key: "q",
            kind: "text",
            value: query,
            ...twin("brSearchHint", "labelText"),
            maxLength: 100,
            autofocus: true,
            weight: 1
          },
          {
            type: "ElevatedButton",
            key: "searchGo",
            ...twin("brSearch", "labelText"),
            icon: "search",
            submit: true
          }
        ]
      }
    ] : [
      {
        type: "TextField",
        key: "q",
        kind: "text",
        value: query,
        ...twin("brSearchHint", "labelText"),
        maxLength: 100,
        autofocus: true
      },
      {
        type: "ElevatedButton",
        key: "searchGo",
        ...twin("brSearch", "labelText"),
        icon: "search",
        submit: true
      }
    ]
  });
  const body = tv ? [] : [searchForm()];
  if (status === "fail") {
    body.push({
      type: "MaterialBanner",
      key: "searchFailed",
      role: "error",
      ...twin("brSearchFailed"),
      action: { ...twin("brRetry", "label"), onTap: "sretry" }
    });
  } else if (status === "done" && items) {
    if (items.length === 0) {
      body.push({ type: "Text", ...twin("brNoResults", "text"), color: "muted" });
    } else {
      body.push({
        type: "titleGrid",
        key: "results",
        columns: { compact: 3, expanded: 6 },
        items: items.slice(0, SEARCH_CAP)
      });
    }
  } else if (status !== "idle") {
    body.push(gridSkeleton());
  } else if (history && history.length > 0) {
    body.push({ type: "Text", ...twin("brSearchedBefore", "text"), style: "h4" });
    body.push({
      type: "titleGrid",
      key: "history",
      columns: { compact: 3, expanded: 6 },
      items: history.slice(0, SEARCH_CAP)
    });
  }
  return {
    type: "Scaffold",
    appBar: {
      type: "AppBar",
      mergeWithKinoBar: true,
      dense: true,
      divider: false,
      leading: {
        type: "IconButton",
        key: "back",
        icon: "arrow_back",
        ...twin("brBack", "labelText"),
        ...twin("brBack", "tooltip"),
        onPressed: "back"
      },
      ...tv ? { title: searchForm() } : twin("brSearchTitle", "title")
    },
    body: {
      type: "SingleChildScrollView",
      key: "search-page",
      children: [
        {
          type: "Column",
          padding: { compact: 12, expanded: 24 },
          gap: 16,
          children: body
        }
      ]
    },
    ...status === "loading" ? { every: { ms: 1e3, event: "stick" } } : {}
  };
}

// src/browse/metaCache.js
var KEY = "gnula_meta1";
var MAX = 260;
var CONCURRENCY = 3;
var HTTPS2 = /^https?:\/\//;
function makeMetaCache({ kino: kino2, clock = { now: () => Date.now() } }) {
  const usable = () => {
    try {
      return typeof kino2.meta === "function" && kino2.meta.byTitle === true;
    } catch (_) {
      return false;
    }
  };
  let book = null;
  function read() {
    if (book) return book;
    try {
      const o = JSON.parse(kino2.storage.get(KEY) || "null");
      book = o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (_) {
      book = {};
    }
    return book;
  }
  function write() {
    try {
      const ids = Object.keys(book);
      if (ids.length > MAX) {
        for (const id of ids.slice(0, ids.length - MAX)) delete book[id];
      }
      kino2.storage.set(KEY, JSON.stringify(book));
    } catch (_) {
    }
  }
  function known(id) {
    const e = read()[id];
    if (!e) return {};
    return {
      ...e.t > 0 ? { tmdb: e.t } : {},
      ...e.l && HTTPS2.test(e.l) ? { logo: e.l } : {},
      ...e.b && HTTPS2.test(e.b) && e.o ? { backdrop: e.b, overview: e.o } : {}
    };
  }
  const asked = (id) => Object.hasOwn(read(), id);
  function dress(cards) {
    return cards.map((c) => {
      const k = known(c.id);
      const withId = k.tmdb && !(c.ids && c.ids.tmdb) ? { ...c, ids: { ...c.ids || {}, tmdb: k.tmdb } } : c;
      return k.backdrop && !withId.backdrop ? { ...withId, backdrop: k.backdrop } : withId;
    });
  }
  async function fill(cards, budgetMs) {
    if (!usable()) return 0;
    const start = clock.now();
    let count = 0;
    const pending = cards.filter((c) => !asked(c.id));
    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      if (clock.now() - start >= budgetMs) break;
      const slice = pending.slice(i, i + CONCURRENCY);
      await Promise.all(
        slice.map(async (c) => {
          try {
            const res = await kino2.meta({ title: c.title, kind: c.kind, year: c.year });
            count++;
            if (!res) {
              read()[c.id] = { t: 0, l: "" };
            } else {
              read()[c.id] = {
                t: res.id || 0,
                l: res.logo || "",
                b: res.backdrop || "",
                o: res.overview || ""
              };
            }
          } catch (_) {
          }
        })
      );
    }
    if (count > 0) write();
    return count;
  }
  return { usable, known, asked, dress, fill };
}

// src/browse/index.js
var TAB_KEY = "gnula_browseTab";
var SNAP_PREFIX = "gnula_browse1:";
var SNAP_TTL_MS = 12 * 3600 * 1e3;
var SNAP_MAX = 24 * 1024;
var RECENT_KEY = "gnula_recent1";
var RECENT_MAX = 16;
var HIST_KEY = "gnula_searchHist1";
var HIST_MAX = 24;
var MAX_META_TICKS = 30;
var MAX_LOAD_TRIES = 3;
function metaAsk(c) {
  const title = String(c.title).replace(/\s*[([][^)\]]*[)\]]/g, "").replace(/\s+/g, " ").trim() || String(c.title);
  const y = /\((19|20)\d{2}\)/.exec(String(c.title));
  return { id: c.id, title, kind: c.kind, ...y ? { year: parseInt(y[0].slice(1, 5), 10) } : {} };
}
function makeBrowse({ kino: kino2, loadTab, searchTitles }) {
  const meta = makeMetaCache({ kino: kino2 });
  const slidesFrom = (rails) => {
    const out = [];
    for (const r of rails) {
      for (const c of r.items) {
        if (out.length >= 6) return out;
        const k = meta.known(c.id);
        const img = k.backdrop || c.poster;
        if (!img || out.some((s) => s.id === c.id)) continue;
        out.push({
          id: c.id,
          ref: c.ref,
          kind: c.kind,
          title: c.title,
          image: img,
          text: k.overview || (c.badges ? c.badges.join(" \xB7 ") : ""),
          ...k.logo ? { logo: k.logo } : {}
        });
      }
    }
    return out;
  };
  const uniform = (items) => items.every((i) => i.backdrop) ? items : items.map(({ backdrop, ...rest }) => rest);
  const enrich = (data) => data ? {
    slides: data.slides.length > 0 ? data.slides.map((s) => {
      const k = meta.known(s.id);
      return k.logo ? { ...s, logo: k.logo } : s;
    }) : slidesFrom(data.rails),
    rails: data.rails.map((r) => ({ ...r, items: uniform(meta.dress(r.items)) }))
  } : data;
  const metaTries = /* @__PURE__ */ new Map();
  const memo = /* @__PURE__ */ new Map();
  const log = (...a) => {
    try {
      kino2.log("[gnulahd]", ...a);
    } catch (_) {
    }
  };
  const get = (k) => {
    try {
      return kino2.storage.get(k);
    } catch (_) {
      return null;
    }
  };
  const set = (k, v, opts) => {
    try {
      kino2.storage.set(k, v, opts);
    } catch (_) {
    }
  };
  function readSnap(tab) {
    try {
      const o = JSON.parse(get(SNAP_PREFIX + tab) || "null");
      return o && Date.now() - o.at < SNAP_TTL_MS && o.data && Array.isArray(o.data.rails) ? o.data : null;
    } catch (_) {
      return null;
    }
  }
  function writeSnap(tab, data) {
    for (let max = 20; max >= 6; max -= 2) {
      try {
        const slim = {
          slides: data.slides.slice(0, 5),
          rails: data.rails.map((r) => ({ ...r, items: r.items.slice(0, max) }))
        };
        const s = JSON.stringify({ at: Date.now(), data: slim });
        if (s.length <= SNAP_MAX) {
          set(SNAP_PREFIX + tab, s);
          return;
        }
      } catch (_) {
      }
    }
  }
  function dataOf(tab) {
    const m = memo.get(tab);
    if (m) return m.data;
    const s = readSnap(tab);
    if (s) {
      memo.set(tab, { data: s, whole: false });
      return s;
    }
    return null;
  }
  const stored = () => {
    const t = get(TAB_KEY);
    return TAB_IDS.includes(t) ? t : null;
  };
  const remember = (tab) => {
    set(TAB_KEY, tab);
  };
  function readKeys() {
    try {
      const a = JSON.parse(get(RECENT_KEY) || "[]");
      return Array.isArray(a) ? a.filter((k) => typeof k === "string") : [];
    } catch (_) {
      return [];
    }
  }
  function notePlayed(ref) {
    const k = playedKey(ref);
    if (!k) return;
    const prior = readKeys().filter((x) => x !== k);
    try {
      set(RECENT_KEY, JSON.stringify([k, ...prior].slice(0, RECENT_MAX)));
    } catch (_) {
    }
  }
  function readHistory() {
    try {
      const a = JSON.parse(get(HIST_KEY) || "[]");
      return Array.isArray(a) ? a.filter((c) => c && typeof c.id === "string" && typeof c.ref === "string" && typeof c.title === "string").slice(0, HIST_MAX) : [];
    } catch (_) {
      return [];
    }
  }
  function rememberFound(cards) {
    try {
      const fresh = cards.slice(0, 12).map((c) => ({
        id: c.id,
        ref: c.ref,
        title: c.title,
        kind: c.kind,
        poster: c.poster,
        year: c.year,
        rating: c.rating
      }));
      const ids = new Set(fresh.map((c) => c.id));
      set(HIST_KEY, JSON.stringify([...fresh, ...readHistory().filter((c) => !ids.has(c.id))].slice(0, HIST_MAX)));
    } catch (_) {
    }
  }
  let found = null;
  const tabFromArgs = (route) => {
    const a = route && route.args && typeof route.args === "object" ? route.args : {};
    return TAB_IDS.includes(a.tab) ? a.tab : null;
  };
  function needed(tab, device) {
    const order = [tab, ...TAB_IDS.filter((t) => t !== tab)];
    return order.filter((t, i) => (i === 0 || device !== "tv") && !(memo.get(t) && memo.get(t).whole));
  }
  function view(ctx) {
    const st = ctx.state && typeof ctx.state === "object" ? ctx.state : {};
    if (ctx.route && ctx.route.name === "settings") return settingsView();
    if (ctx.route && ctx.route.name === "search") {
      const query = typeof st.sq === "string" ? st.sq : "";
      const items = found && found.q === query ? found.items : null;
      const status = query === "" ? "idle" : st.sstate === "fail" ? "fail" : items ? "done" : "loading";
      return searchView({ query, status, items, history: query === "" ? readHistory() : [], device: ctx.device });
    }
    const tab = TAB_IDS.includes(st.tab) ? st.tab : tabFromArgs(ctx.route) ?? stored() ?? TAB_IDS[0];
    const data = enrich(dataOf(tab));
    const loaded = TAB_IDS.map((t) => memo.get(t)).filter(Boolean).map((m) => m.data);
    const pending = Array.isArray(st.pending) && st.pending.length > 0;
    return browseView({
      tab,
      data,
      recent: uniform(meta.dress(recentOf(readKeys(), loaded))),
      pending,
      failed: !!(st.failed && st.failed[tab]),
      device: ctx.device
    });
  }
  async function load(tab) {
    const page = await loadTab(tab);
    const data = tabOf(page);
    if (data) {
      memo.set(tab, { data, whole: true });
      writeSnap(tab, data);
    }
    return data !== null;
  }
  const loadTries = /* @__PURE__ */ new Map();
  function failLoad(tab, rest, failed) {
    const n = (loadTries.get(tab) || 0) + 1;
    loadTries.set(tab, n);
    if (n < MAX_LOAD_TRIES) rest.push(tab);
    else {
      failed[tab] = true;
      loadTries.delete(tab);
    }
  }
  const events = {
    open({ route, state, device }) {
      const tab = tabFromArgs(route) ?? (TAB_IDS.includes(state.tab) ? state.tab : stored() ?? TAB_IDS[0]);
      for (const t of TAB_IDS) dataOf(t);
      return { state: { tab, pending: needed(tab, device), failed: null } };
    },
    tab({ value, arg, state }) {
      const tab = TAB_IDS.includes(value) ? value : TAB_IDS.includes(arg) ? arg : null;
      if (!tab) return null;
      remember(tab);
      dataOf(tab);
      const failed = { ...state.failed || {} };
      delete failed[tab];
      const pending = [tab, ...Array.isArray(state.pending) ? state.pending.filter((t) => t !== tab) : []];
      return { state: { tab, pending: memo.get(tab) && memo.get(tab).whole ? pending.slice(1) : pending, failed } };
    },
    retry({ state, device }) {
      const tab = TAB_IDS.includes(state.tab) ? state.tab : TAB_IDS[0];
      return { state: { failed: null, pending: [tab, ...needed(tab, device).filter((t) => t !== tab)] } };
    },
    async tick({ state }) {
      const pending = Array.isArray(state.pending) ? state.pending : [];
      if (pending.length === 0) return null;
      const [next, ...rest] = pending;
      const failed = { ...state.failed || {} };
      if (next.startsWith("meta:")) {
        const tabId = next.slice(5);
        const m = memo.get(tabId);
        if (!m) return { state: { pending: rest } };
        const cards = [
          ...m.data.slides,
          ...m.data.rails.flatMap((r) => r.items.slice(0, 6)),
          ...m.data.rails.flatMap((r) => r.items.slice(6))
        ];
        const asked = await meta.fill(cards.map(metaAsk), 12e3);
        const made = slidesFrom(m.data.rails);
        if (made.length > m.data.slides.length) {
          m.data = { ...m.data, slides: made.map(({ logo: logo2, ...rest2 }) => rest2) };
          writeSnap(tabId, m.data);
        }
        const tries = (metaTries.get(tabId) || 0) + 1;
        metaTries.set(tabId, tries);
        if (asked > 0 && tries < MAX_META_TICKS && cards.some((c) => !meta.asked(c.id))) {
          return { state: { pending: [next, ...rest] } };
        }
        return { state: { pending: rest } };
      }
      try {
        const ok = await load(next);
        if (!ok) failLoad(next, rest, failed);
        else delete failed[next];
        if (ok && meta.usable()) rest.unshift("meta:" + next);
      } catch (e) {
        log("browse tab error", e && e.message || "error");
        failLoad(next, rest, failed);
      }
      return { state: { pending: rest, failed } };
    },
    openSearch() {
      return { route: { push: "search" }, state: { sq: "", sstate: null } };
    },
    search({ value, route }) {
      const q = value && typeof value.q === "string" ? value.q.trim().slice(0, 100) : "";
      if (q === "") return null;
      const state = { sq: q, sstate: "loading" };
      return route && route.name === "search" ? { state } : { route: { push: "search" }, state };
    },
    async stick({ state }) {
      const q = typeof state.sq === "string" ? state.sq : "";
      if (q === "" || state.sstate !== "loading") return null;
      try {
        const out = await searchTitles(q);
        found = { q, items: (Array.isArray(out) ? out : []).slice(0, 60).map(cardOf) };
        rememberFound(found.items);
        return { state: { sstate: "done" } };
      } catch (e) {
        log("browse search error", e && e.message || "error");
        return { state: { sstate: "fail" } };
      }
    },
    sretry({ state }) {
      return typeof state.sq === "string" && state.sq !== "" ? { state: { sstate: "loading" } } : null;
    },
    go({ arg }) {
      return arg === "settings" ? { route: { push: "settings" }, state: { fromBrowse: true } } : null;
    },
    back({ state, route }) {
      if (route && route.name === "settings" && !state.fromBrowse) return { close: true };
      return { route: { pop: true }, state: { sq: null, sstate: null } };
    }
  };
  async function event(ev) {
    const handler = Object.hasOwn(events, ev.name) ? events[ev.name] : null;
    return handler ? await handler({ ...ev, state: ev.state || {} }) ?? null : null;
  }
  return { view, event, notePlayed };
}

// src/plugin.js
function getLangPreference() {
  try {
    if (typeof kino !== "undefined" && kino.config && typeof kino.config.get === "function") {
      return kino.config.get("preferredLang") || "latino";
    }
  } catch (_) {
  }
  return "latino";
}
async function search(query) {
  const q = typeof query === "string" ? query.trim() : query && typeof query.q === "string" ? query.q.trim() : "";
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
async function home() {
  const categories2 = [
    { id: "movies", title: "Pel\xEDculas Recientes", path: "/ver/peliculas/", ref: "peliculas", kind: "movie" },
    { id: "series", title: "Series Recientes", path: "/ver/series/", ref: "series", kind: "series" },
    { id: "anime", title: "Anime Reciente", path: "/ver/anime/", ref: "anime", kind: "series" }
  ];
  const rows = await Promise.all(
    categories2.map(async (cat) => {
      try {
        const html = await fetchHtml(`${BASE_URL}${cat.path}`);
        const items = parseCards(html, cat.kind);
        return {
          id: cat.id,
          title: cat.title,
          ref: cat.ref,
          items: items.slice(0, 30)
        };
      } catch (err) {
        if (typeof kino !== "undefined" && kino.log) {
          kino.log(`home category ${cat.id} error: ` + (err && err.message));
        }
        return {
          id: cat.id,
          title: cat.title,
          ref: cat.ref,
          items: []
        };
      }
    })
  );
  return rows.filter((r) => r.items.length > 0);
}
async function browse(ref, cursor) {
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
  const hasNextPage = html.includes(`page=${page + 1}`) || html.includes(`page/${page + 1}`) || items.length >= 40;
  return {
    items,
    next: hasNextPage ? String(page + 1) : void 0
  };
}
async function episodes(ref) {
  const pageUrl = String(ref || "");
  const html = await fetchHtml(pageUrl);
  const titleMatch = html.match(/<h1[^>]*class="[^"]*gnrd-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
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
      title: `Episodio ${number}`
    });
  }
  epList.sort((a, b) => {
    if (a.season !== b.season) return a.season - b.season;
    return a.number - b.number;
  });
  return {
    series: {
      title: seriesTitle
    },
    episodes: epList
  };
}
async function resolve(ref) {
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
          langLabel: lang.label
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
        } catch (_) {
        }
        return {
          url: resolved.url,
          mime: resolved.mime || "application/x-mpegURL",
          headers: resolved.headers || {},
          alternatives: alternatives.slice(0, 5)
        };
      }
      if (src) {
        alternatives.push({
          label: `${srv.langLabel} - ${srv.title}`,
          url: src
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
      alternatives: alternatives.slice(1)
    };
  }
  if (typeof kino !== "undefined" && kino.error) {
    throw kino.error("unavailable", "Los servidores de video no est\xE1n disponibles actualmente.");
  }
  throw new Error("No stream found");
}
async function loadTabPage(tab) {
  if (tab === "inicio") {
    const rows = await home();
    return { rows };
  }
  if (tab === "peliculas") {
    const res = await browse("peliculas", "1");
    return { rows: [{ id: "peliculas", title: "Pel\xEDculas en HD", ref: "peliculas", items: res.items }] };
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
async function section(ctx) {
  const tab = ctx && typeof ctx === "object" ? ctx.tab : void 0;
  const tabs = [
    { id: "inicio", label: "Inicio", labelEn: "Home" },
    { id: "peliculas", label: "Pel\xEDculas", labelEn: "Movies" },
    { id: "series", label: "Series", labelEn: "Series" },
    { id: "anime", label: "Anime", labelEn: "Anime" }
  ];
  const chosen = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;
  const page = await loadTabPage(chosen);
  return {
    tabs,
    tab: chosen,
    rows: page.rows
  };
}
async function categories() {
  return [
    { id: "peliculas", ref: "peliculas", title: "Pel\xEDculas", titleEn: "Movies", icon: "movie" },
    { id: "series", ref: "series", title: "Series", titleEn: "Series", icon: "tv" },
    { id: "anime", ref: "anime", title: "Anime", titleEn: "Anime", icon: "animation" }
  ];
}
var browseInstance = null;
function browseScreen() {
  if (browseInstance) return browseInstance;
  browseInstance = makeBrowse({
    kino: typeof kino !== "undefined" ? kino : {},
    loadTab: async (tab) => loadTabPage(tab),
    searchTitles: async (q) => {
      const res = await search(q);
      return res.items || [];
    }
  });
  return browseInstance;
}
async function screen(ctx) {
  await null;
  return browseScreen().view(ctx && typeof ctx === "object" ? ctx : {});
}
async function screenEvent(ev) {
  await null;
  return browseScreen().event(ev && typeof ev === "object" ? ev : {});
}
export {
  browse,
  categories,
  episodes,
  home,
  resolve,
  screen,
  screenEvent,
  search,
  section
};
