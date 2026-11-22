// Scraper y resolutor de servidores para GnulaHD (ww3.gnulahd.nu).
export const BASE_URL = "https://ww3.gnulahd.nu";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function gnrdUnpack(s) {
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

export function cleanId(raw) {
  let s = raw;
  try {
    s = decodeURIComponent(s);
  } catch (_) {}
  let id = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._~-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 128);
  if (!id) id = "item-" + Math.abs(hashCode(raw));
  return id;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function parseCards(html, defaultKind = "movie", typeMap = null) {
  const cards = [];
  const cardRegex = /<a[^>]*class="[^"]*gnrd-card[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const body = match[1];

    const hrefMatch = fullTag.match(/href="([^"]+)"/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];

    const titleAttr = fullTag.match(/title="([^"]+)"/i);
    const titleTag = body.match(/class="gnrd-card-title"[^>]*>([^<]+)<\//i);
    const title = (titleAttr ? titleAttr[1] : (titleTag ? titleTag[1] : "")).trim();
    if (!title) continue;

    const slugMatch = href.match(/\/ver\/([^\/]+)/);
    const rawSlug = slugMatch ? slugMatch[1] : href.replace(/^https?:\/\/[^\/]+\//, "");
    const id = cleanId(rawSlug);

    const imgMatch = body.match(/<img[^>]+src="([^"]+)"/i);
    const poster = imgMatch ? imgMatch[1] : "";

    const ratingMatch = body.match(/class="(?:gnrd-rating|gnrd-cm-rating)"[^>]*>★?\s*([0-9.]+)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

    const yearMatch = body.match(/<span>(\b(19\d\d|20\d\d)\b)<\/span>/);
    const year = yearMatch ? yearMatch[1] : undefined;

    const badges = [];
    const langMatches = body.matchAll(/class="gnrd-lang"[^>]*>([^<]+)<\/span>/g);
    for (const lm of langMatches) {
      const l = lm[1].trim();
      if (l && !badges.includes(l)) badges.push(l);
    }

    const genreMatch = body.match(/class="gnrd-card-genres"[^>]*>([^<]+)<\//i);
    const genres = genreMatch
      ? genreMatch[1].split(/[·,]/).map((s) => s.trim()).filter(Boolean).slice(0, 5)
      : [];

    let kind = defaultKind;
    const mappedType = typeMap
      ? (typeMap.get(href) || (rawSlug && typeMap.get(rawSlug)))
      : null;

    if (mappedType) {
      kind = /serie|anime/i.test(mappedType) ? "series" : "movie";
      if (!badges.includes(mappedType)) badges.unshift(mappedType);
    } else if (/serie/i.test(body) || href.includes("/ver/series/")) {
      kind = "series";
    } else if (href.includes("/ver/anime/")) {
      kind = "series";
    } else if (href.includes("/ver/peliculas/")) {
      kind = "movie";
    }

    cards.push({
      id,
      ref: href,
      title,
      kind,
      poster,
      backdrop: "",
      rating,
      year,
      badges: badges.slice(0, 3),
      genres,
    });
  }

  return cards;
}

export function parseHeroSlides(html) {
  const slides = [];
  const slideRegex = /<div class="gnrd-slide[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;

  while ((match = slideRegex.exec(html)) !== null) {
    const block = match[1];
    const bgMatch = block.match(/background-image:url\('([^']+)'\)/i);
    const backdrop = bgMatch ? bgMatch[1] : "";

    const logoMatch = block.match(/<img class="gnrd-hero-logo" src="([^"]+)" alt="([^"]+)"/i);
    const logo = logoMatch ? logoMatch[1] : "";
    let title = logoMatch ? logoMatch[2].trim() : "";

    const playMatch = block.match(/href="([^"]+)"[^>]*>▶\s*Reproducir/i);
    if (!playMatch) continue;
    const ref = playMatch[1];

    if (!title) {
      const slugMatch = ref.match(/\/ver\/([^\/]+)/);
      title = slugMatch ? slugMatch[1].replace(/-/g, " ") : "Destacado";
    }

    const synMatch = block.match(/<p class="gnrd-hero-syn">([\s\S]*?)<\/p>/i);
    const overview = synMatch ? synMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    const yearMatch = block.match(/<span>(\b(19\d\d|20\d\d)\b)<\/span>/);
    const year = yearMatch ? yearMatch[1] : undefined;

    const ratingMatch = block.match(/class="gnrd-m-rating"[^>]*>★?\s*([0-9.]+)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

    const isSeries = /serie/i.test(block) || /temporada/i.test(block);
    const kind = isSeries ? "series" : "movie";

    const slugMatch = ref.match(/\/ver\/([^\/]+)/);
    const rawSlug = slugMatch ? slugMatch[1] : ref;
    const id = cleanId(rawSlug);

    slides.push({
      id,
      ref,
      title,
      kind,
      backdrop,
      logo,
      overview,
      year,
      rating,
      poster: backdrop,
    });
  }

  return slides;
}

export async function fetchHtml(url) {
  const res = await kino.fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: BASE_URL + "/",
    },
  });
  if (!res.ok) {
    throw kino.error("unavailable", `Error de conexión con GnulaHD (HTTP ${res.status})`);
  }
  return await res.text();
}

export async function fetchJson(url, referer) {
  const res = await kino.fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: referer || BASE_URL + "/",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function resolveVidara(url) {
  const m = url.match(/(?:vidara\.[a-z]+|vidaraa\.[a-z]+)\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const filecode = m[1];
  try {
    const res = await kino.fetch("https://vidara.to/api/stream", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `https://vidara.to/e/${filecode}`,
        Origin: "https://vidara.to",
      },
      body: {
        json: {
          filecode,
          device: "desktop",
          codecs: ["h264", "aac"],
        },
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.streaming_url) {
      return {
        url: data.streaming_url,
        mime: "application/x-mpegURL",
        headers: {
          Referer: `https://vidara.to/e/${filecode}`,
          "User-Agent": USER_AGENT,
        },
      };
    }
  } catch (_) {}
  return null;
}

export async function resolveSavefiles(url) {
  const m = url.match(/savefiles\.com\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const filecode = m[1];
  try {
    const res = await kino.fetch("https://savefiles.com/dl", {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `https://savefiles.com/e/${filecode}`,
        Origin: "https://savefiles.com",
      },
      body: {
        form: {
          op: "embed",
          file_code: filecode,
          auto: "1",
          referer: BASE_URL + "/",
        },
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m3u8Match = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
    if (m3u8Match) {
      return {
        url: m3u8Match[0],
        mime: "application/x-mpegURL",
        headers: {
          Referer: `https://savefiles.com/e/${filecode}`,
          "User-Agent": USER_AGENT,
        },
      };
    }
  } catch (_) {}
  return null;
}

export async function getPlayerPayload(ref) {
  let pid = null;
  let tok = null;

  try {
    const u = new URL(ref);
    pid = u.searchParams.get("id");
    tok = u.searchParams.get("t");
  } catch (_) {}

  if (pid && tok) {
    const apiUrl = `${BASE_URL}/wp-json/gnrd/v1/player?id=${pid}&t=${encodeURIComponent(tok)}`;
    const data = await fetchJson(apiUrl, ref);
    if (data && data.p) {
      const payload = gnrdUnpack(data.p);
      if (payload && Array.isArray(payload.langs) && payload.langs.length > 0) {
        return payload;
      }
    }
  }

  const cleanUrl = ref.split("?")[0];
  const html = await fetchHtml(cleanUrl);
  if (!html) return null;

  const pidMatch = html.match(/_gnrdPid\s*=\s*(\d+)/);
  const tokMatch = html.match(/_gnrdTok\s*=\s*"([^"]+)"/);
  if (pidMatch && tokMatch) {
    const freshPid = pidMatch[1];
    const freshTok = tokMatch[1];
    const apiUrl = `${BASE_URL}/wp-json/gnrd/v1/player?id=${freshPid}&t=${encodeURIComponent(freshTok)}`;
    const data = await fetchJson(apiUrl, cleanUrl);
    if (data && data.p) {
      return gnrdUnpack(data.p);
    }
  }

  return null;
}
