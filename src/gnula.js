// Scraper y resolver para GnulaHD (https://ww3.gnulahd.nu)

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

function cleanText(str) {
  if (!str) return "";
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseCards(html, defaultKind = "movie") {
  const items = [];
  const cardRegex = /<a class="gnrd-card" href="([^"]+)" title="([^"]+)">([\s\S]*?)<\/a>/g;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const href = match[1];
    const rawTitle = match[2];
    const inner = match[3];

    // Slug como id limpio cumpliendo ^[A-Za-z0-9._~-]{1,128}$
    const slugMatch = href.match(/\/ver\/([^\/]+)/);
    let rawSlug = slugMatch ? slugMatch[1] : href.replace(/^https?:\/\/[^\/]+\//, "");
    try {
      rawSlug = decodeURIComponent(rawSlug);
    } catch (_) {}
    let id = rawSlug
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9._~-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 128);
    if (!id) id = "item-" + Date.now().toString(36);

    // Poster
    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/i);
    const poster = imgMatch ? imgMatch[1] : undefined;

    // Rating (ej: "★ 7.7")
    const ratingMatch = inner.match(/class="[^"]*rating[^"]*">[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;

    // Año
    const yearMatch = inner.match(/<span>(19\d{2}|20\d{2})<\/span>/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

    // Badges de idioma
    const langMatches = [...inner.matchAll(/class="gnrd-lang">([^<]+)<\/span>/g)].map(m => m[1].trim());
    const badges = langMatches.slice(0, 3);

    // Kind detection
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
      kind,
    };

    if (poster && /^https?:\/\//.test(poster)) item.poster = poster;
    if (rating !== undefined && !Number.isNaN(rating)) item.rating = rating;
    if (year !== undefined && !Number.isNaN(year)) item.year = year;
    if (badges.length > 0) item.badges = badges;

    items.push(item);
  }

  return items;
}

export async function fetchHtml(url, referer = BASE_URL) {
  const res = await kino.fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": referer,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al cargar ${url}`);
  }
  return await res.text();
}

export async function fetchJson(url, referer = BASE_URL) {
  const res = await kino.fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Referer": referer,
      "Accept": "application/json,text/plain,*/*",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al cargar JSON ${url}`);
  }
  return await res.json();
}

export async function getPlayerPayload(pageUrl, html) {
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

export async function resolveVidara(url) {
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
      "Origin": `https://${host}`,
    },
    body: JSON.stringify({ filecode, device: "desktop", codecs: ["h264", "aac"] }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data && data.streaming_url) {
    return {
      url: data.streaming_url,
      mime: "application/x-mpegURL",
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": `https://${host}/`,
      },
    };
  }
  return null;
}

export async function resolveSavefiles(url) {
  const m = url.match(/savefiles\.com\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const filecode = m[1];
  const params = new URLSearchParams({
    op: "embed",
    file_code: filecode,
    auto: "1",
    referer: BASE_URL,
  });

  const res = await kino.fetch("https://savefiles.com/dl", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "Referer": `https://savefiles.com/e/${filecode}`,
      "Origin": "https://savefiles.com",
    },
    body: params.toString(),
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
        "Referer": `https://savefiles.com/`,
      },
    };
  }
  return null;
}
