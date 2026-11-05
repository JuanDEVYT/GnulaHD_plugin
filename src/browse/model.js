// Modelos y transformaciones puras para la pantalla declarativa de GnulaHD.

export const TAB_IDS = ["inicio", "peliculas", "series", "anime"];
export const MAX_SLIDES = 6;
export const MAX_RAILS = 8;
export const MAX_RAIL_ITEMS = 24;
const MAX_SLIDE_TEXT = 160;
const HTTPS = /^https?:\/\//;

export function cardOf(item) {
  const out = {
    id: `${item.kind || "movie"}-${item.id}`,
    ref: item.ref,
    title: item.title,
    kind: item.kind || "movie",
  };
  const poster = item.poster || item.logo;
  if (poster && HTTPS.test(poster)) out.poster = poster;
  if (item.backdrop && HTTPS.test(item.backdrop)) out.backdrop = item.backdrop;
  if (item.rating !== undefined) out.rating = item.rating;
  if (item.year !== undefined) out.year = item.year;
  if (item.badges && Array.isArray(item.badges)) out.badges = item.badges.slice(0, 3);
  return out;
}

export function slidesOf(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    if (!row || !Array.isArray(row.items)) continue;
    for (const item of row.items) {
      if (out.length >= MAX_SLIDES) return out;
      const img = item.backdrop || item.poster;
      if (!img || !HTTPS.test(img) || seen.has(item.id)) continue;
      seen.add(item.id);
      const text = typeof item.overview === "string" ? item.overview.trim() : (item.badges ? item.badges.join(" · ") : "");
      out.push({
        id: item.id,
        ref: item.ref,
        kind: item.kind || "movie",
        title: item.title,
        image: img,
        text: text.length <= MAX_SLIDE_TEXT ? text : `${text.slice(0, MAX_SLIDE_TEXT - 1).trimEnd()}…`,
      });
    }
  }
  return out;
}

export function railsOf(rows) {
  return rows.filter((r) => r && r.items && r.items.length > 0).slice(0, MAX_RAILS).map((r) => ({
    id: r.id,
    title: r.title,
    ...(r.ref ? { ref: r.ref } : {}),
    items: r.items.slice(0, MAX_RAIL_ITEMS).map(cardOf),
  }));
}

export function tabOf(page) {
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const rails = railsOf(rows);
  if (rails.length === 0) return null;
  return { slides: slidesOf(rows), rails };
}

export function playedKey(ref) {
  const r = String(ref || "");
  const m = /\/ver\/([^\/\?#]+)/.exec(r) || /gnulahd\.nu\/([^\/\?#]+)/.exec(r);
  return m ? m[1] : "";
}

export function recentOf(keys, tabs) {
  if (!keys || keys.length === 0) return [];
  const byKey = new Map();
  for (const data of tabs) {
    if (!data || !data.rails) continue;
    for (const rail of data.rails) {
      for (const card of rail.items) {
        const k = playedKey(card.ref);
        if (k && !byKey.has(k)) byKey.set(k, card);
      }
    }
  }
  const out = [];
  const used = new Set();
  for (const key of keys) {
    const card = byKey.get(key);
    if (card && !used.has(card.id)) {
      used.add(card.id);
      out.push(card);
    }
  }
  return out;
}
