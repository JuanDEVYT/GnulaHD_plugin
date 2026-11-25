import test from "node:test";
import assert from "node:assert/strict";

// ── shim de Kino ──────────────────────────────────────────────
const K = [103, 78, 55, 100];
/** El payload del reproductor va en base64 y XOR (lo que deshace gnrdUnpack). */
function pack(obj) {
  const bytes = Buffer.from(JSON.stringify(obj), "utf8");
  const out = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ K[i & 3];
  return out.toString("base64");
}

const respuesta = (body) => ({
  ok: true,
  status: 200,
  text: async () => body,
  json: async () => JSON.parse(body),
});

let fetchCalls = [];
let resolverCalls = [];
let payload = { langs: [] };
let streamsPorSrc = {};
let needsBrowser = {};
let media = [];

globalThis.kino = {
  fetch: async (url, opts = {}) => {
    fetchCalls.push(String(url));
    if (String(url).includes("/wp-json/gnrd/v1/player")) return respuesta(JSON.stringify({ p: pack(payload) }));
    if (/\.m3u8/.test(String(url))) return respuesta("#EXTM3U\n#EXTINF:10,\nseg1.ts\n#EXTINF:10,\nseg2.ts\n");
    if (/\.mp4/.test(String(url))) return respuesta("video");
    return respuesta("<html></html>");
  },
  error: (code, message, extra) => Object.assign(new Error(message), { code, ...(extra || {}) }),
  log: Object.assign(() => {}, { report: () => {} }),
  config: { get: (k) => ({ preferredLang: "latino" })[k] },
  storage: (() => {
    const m = new Map();
    return {
      get: (k) => (m.has(k) ? m.get(k) : null),
      set: (k, v) => { m.set(k, String(v)); },
      remove: (k) => { m.delete(k); },
      keys: () => [...m.keys()],
      clear: () => m.clear(),
    };
  })(),
  plugins: {
    call: async (door, fn, args) => {
      resolverCalls.push({ fn, url: args && args.url });
      if (fn === "resolve") {
        const s = streamsPorSrc[args.url];
        if (s) return { streams: [{ url: s, kind: "hls", server: "Vidara" }] };
        if (needsBrowser[args.url]) return { streams: [], needs_browser: [args.url] };
        return { streams: [], dead: [args.url] };
      }
      if (fn === "rank") return { scores: (args.urls || []).map(() => 1) };
      return null;
    },
  },
  browser: {
    capture: async () => ({ media: media.slice() }),
  },
};

const plugin = await import("../plugin.js");

const REF = "https://ww3.gnulahd.nu/ver/el-despertar/?id=1&t=abc";

test.beforeEach(() => {
  fetchCalls = [];
  resolverCalls = [];
  needsBrowser = {};
  media = [];
  globalThis.kino.storage.clear();
});

test("resolve: sin servidores avisa de que el título no está y no gasta el navegador", async () => {
  payload = { langs: [] };
  const t = Date.now();
  await assert.rejects(() => plugin.resolve(REF), (e) => {
    assert.equal(e.code, "not_found");
    assert.match(e.userMessage, /no está disponible en GnulaHD/);
    return true;
  });
  assert.ok(Date.now() - t < 8000, "no espera como antes");
  assert.equal(resolverCalls.length, 0, "ni siquiera llama al motor");
});

test("resolve: el último enlace bueno se devuelve sin volver a resolver", async () => {
  payload = { langs: [{ label: "Latino", servers: [{ src: "https://vidara.to/e/uno", title: "Vidara" }] }] };
  streamsPorSrc = { "https://vidara.to/e/uno": "https://cdn.example/master.m3u8" };

  const uno = await plugin.resolve(REF);
  assert.equal(uno.url, "https://cdn.example/master.m3u8");
  assert.match(uno.label, /Latino/);
  const llamadas = resolverCalls.length;

  const dos = await plugin.resolve(REF);
  assert.equal(dos.url, uno.url);
  assert.equal(resolverCalls.length, llamadas, "no vuelve a llamar al motor");
});

test("resolve: los servidores que no se prueban vuelven como copias diferidas", async () => {
  const servers = Array.from({ length: 10 }, (_, i) => ({ src: `https://hoster${i}.example/e/${i}`, title: `Hoster ${i}` }));
  payload = { langs: [{ label: "Latino", servers }] };
  streamsPorSrc = {};
  for (const s of servers) streamsPorSrc[s.src] = null;
  streamsPorSrc["https://hoster0.example/e/0"] = "https://cdn.example/uno.m3u8";
  streamsPorSrc["https://hoster9.example/e/9"] = "https://cdn.example/nueve.m3u8";

  const out = await plugin.resolve(REF);
  assert.equal(out.url, "https://cdn.example/uno.m3u8");
  assert.ok(out.alternatives.length > 0 && out.alternatives.length <= 8);
  const lazy = out.alternatives.find((a) => a.ref && /Hoster 9/.test(a.label));
  assert.ok(lazy, "hay al menos una copia diferida");
  assert.ok(lazy.ref.length < 400, "la ref es corta");
  assert.match(lazy.label, /Hoster 9/);

  resolverCalls = [];
  const copia = await plugin.resolve(lazy.ref);
  assert.equal(copia.url, "https://cdn.example/nueve.m3u8");
  assert.equal(copia.label.includes("Hoster 9"), true);
});

test("resolve: el navegador oculto no devuelve el anuncio de media[0]", async () => {
  payload = { langs: [{ label: "Latino", servers: [{ src: "https://byse.sx/e/xyz", title: "Byse" }] }] };
  streamsPorSrc = {};
  needsBrowser["https://byse.sx/e/xyz"] = true;
  media = [
    { url: "https://cdn.ads.example/pre-roll.mp4", mime: "video/mp4" },
    { url: "https://cdn.example/pelicula.m3u8", mime: "application/x-mpegURL" },
  ];
  const out = await plugin.resolve(REF);
  assert.equal(out.url, "https://cdn.example/pelicula.m3u8");
  assert.doesNotMatch(out.url, /ads/);
});

test("prepare deja el enlace listo y resolve lo usa", async () => {
  payload = { langs: [{ label: "Latino", servers: [{ src: "https://vidara.to/e/dos", title: "Vidara" }] }] };
  streamsPorSrc = { "https://vidara.to/e/dos": "https://cdn.example/prep.m3u8" };
  await plugin.prepare(REF);
  resolverCalls = [];
  const out = await plugin.resolve(REF);
  assert.equal(out.url, "https://cdn.example/prep.m3u8");
  assert.equal(resolverCalls.length, 0);
});
