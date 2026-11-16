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
var LOGO_ASPECT = "banner";
var LOGO_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAwMAAACMCAYAAAAgLHWzAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAz2ElEQVR42u2dD4hUV7bua4qaSqXT6bRldZ1TjuP09Xodn4iINwSR4Ejw9RMJEoLx+Ryv42ScTscx2tG2rT+nuuMYX8Zx8hyvz+fzSp7kiogTQpAQQhAJIhIkhCBBQhCRICIiIiIiIs16a+3abUrtbquqT+2zT9W34KPKsrpq731OnbN+e6+9ViQCg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGG9FoA2uQ1aceoxgRGAwGg8FgMBisUZ3/f7A2s3LJCBWcNHmZLiq4HnnuERrMDNBsjBEMBoPBYDAYDNY4ACAz/znWlmSMHf9Odvy7GQI+4+fXKO8O8SPxa5eo6C6W98JgMBgMBoPBYLBGgIDNz0bZ4U+zs7+a9TkVMjeV85/XKrj3+PXD5DmT6X2MGQwGg8FgMBgMFl4AeE0rPzHGTv4c8jIH2OG/+hAADMtzr1DRXUbbklEJH4LBYDAYDAaDwWBhBQHZD1BwBAKWUjFzkgHg/mMA8AAEMifIcyYhLAgGg8FgMBgMBgs7BGTdBEPAKtZ3I64ClIcFFTMDtCkdw8jBYDAYDAaDwWBhhYD/ZG1NJ6jormAIOM+O/tCoEFAKC7rMWkJea1RCiWAwGAwGg8FgMFjYIEA2BhdTEg60mAHgqydCgKjonqKCMx2bhGEwGAwGg8FgsLBCQE8iSp4zg537Yyrk50kQIPsGPPcg/0079gfAYDAYDAaDwWBhBYG808qOfZ4d/OtPhIAH+wPcPupPxRAWBIPBYDAYDAaDhREC/twWZcf+BfIyZysKCSqBwC1+XEV7Sp8Bg8FgMBgMBoPBbHT4943yumQJyqUkS9A21t2KIKC0UfgGaxH2B8BgMBgMBoPBYLZCwBZx9p0pVHR72Ymf9dD/rZOaAe5MdurPVgwBpfoBkjFoHnVjfGEwGAwGg8FgMPsgQMX/p5MMAe+xw3+TnfdrlEunHvx/NhXl15ZXvDegHASK7lyEBcFgMBgMBoPBYDaCQDfLc+er4mB5Ff8/xM8H6E1+/TUBgXSCnfr3GQTuVgcC7lXWC7R2FPj4C+tv+vnvWMv180e1Wb9P2lLUj39n9eLYwWAwGAwGg8FgtUGAONUbJ0Sp6K7Rm3uHN/peoJyTpP8uIUPpNDv0xzUkVA4CBfc2/91LlGsrOfJbWX2y+jAxqlYg8s4MVZPAc7v5/dv5/QeomDnKbflc1R94WCf5/z7i937If7eLH9fza0v57+byv13+vITay/Au6x0cVxgMBoPBYDAYbGwQ+I04+skYO9WbHqkNIKsCPbRRVgucTn5+rioIGK4jUHBXU/4pdvydBD+fxlrFn7WfH0+rqsPynQX1Xqrh84f/7r4KZyq433E/jvLzTeRl5lOBQWaAIWcwvFmL7ty58wnrmzrrc1ZbSMbjBQPjIZrvU3uPG2jrLguP02xDx+kln9q7xlB723HXqeq4zGWdNXRsyrWX1Rj3+Ly7gvWNAaUtH4evDYzBJh/b+7mh41aLZCxlz+gZ1knWp6zDrD2sPOt11iLWdFaSlWDhgmbtj2NwZoQ2qWrBeeW4P+xoX6FsOsX/N5t1oWpHvRQedIQ/52UqZvYpmJDwolqc/togQWDmCusTtepQcKbQwMQYreJ+rw3VzfACiwxoFysagvFYZGg8FvvU3osG2vqxhcdpnqHjtMyn9mYNtTeJO09Vx+V9Q8flUd1gTW4QGNhQ93tuSZMtH4chA2Ow28f2XjZ03OqtGyyZTP5Ig0IXK8WKARBs+XFs7IiqWfRHQUBUdL/g/5ujZu9rd8rvGHH+K4ODu9yXE9wvJtZ0e1hWCwzCwF3Wi4ABwABgADBgyTkUY10JCAZEDZH3DjAAGLBQd/XKwk7WS6w4rnhB/TBekU24MmP+UGhQ+az+OdaPDXcSFlTfJEvSQSo4z9Pgs1HZZwAYUDpne7gQYAAwABhoGhhYzBoKEAZOh2G1FDAAGGgA3dRhRi9LSBGufqZ+FP9QWYNeVTP3zXOyjQQGsl/hC4aiRTSYjMlG6iaHAdFOm2NlAQOAAcBAU4CA6HCAICASmwUYAAwABoxpSPdbVgxmIoyonj+IQbUiMLvqOgGNDgWeCouaR7kJUZugIAAYuGNzuBBgADAAGGgKGGhn3QoYBkQDgAHAAGAgEMlktWSwXCj7C3BV9PPHsElVFW5lp/drQMAoexxU+JA7RdKgNikMkM6m0WapkwAYAAwABhofBlZbAAKi87J3ATAAGAAMBCYJZT/BWsCK4urox4pAYUKMvMx+Qz+K8KqUhaiH+lOJoDcZBwQDoh02hgsBBgADgIGGB4GoTndsAwzcD0NiBcAAYKBJoOCoTleKC2VNJ5XsESi4MVYeIFDxKoGkJpU8v1ODzDwUIAyIvQAYAAwABgADhs+dTp3djCzRXsAAYAAwYI1uqQK1ebcVV8tqVwSyboId210AgZqg4DoV3WW0oTUa0I3xQoA3wW9ZccscBcAAYAAw0NgwsMkiEBBdZYU2wwlgADDQoPqWNQ9XzEpOpt+prEGzsEfAl1WC9/nReNhQwDAg2mZTuBBgADAAGGhoEIizvrYMBiS96VLAAGAAMGCdpEbWDmwwHms1IN8Rp6Lbww7sTZwwPoYNFVzXZLYhC2BAluvnAgYAA4ABwICB82aujtMny3TM5pTLgAHAQJPrC9vPP/Mn/G7ZH+BMZsf1oxErC0Pj3Vz8NWsqrW8aGBB9xWq1xFkADAAGAAONCwO7LASB4T1UoTx2gAHAQJPoIms+IEA2Cb/TEWVHdSnrEk6MOqqY+Z6Baxb9oWlgQJS3YWYMMAAYAAw0LAi0WnS9G0mvAwYAA4ABqyX1s5Y2bbahUtpQJ8kQsE8V0Kql6FYeqwhVrhBcZM2UfRlNAgO3bAgXAgwABgADDQsDXTo+31YYOBnGmgOAAcBAk+k26/WmqkmgVgO852Q14EXWd1XFv0uWHM/9mIpuHz/fhb0FNa0QXKS8M7Wem4otmyk7zWoBDAAGAAOAAZ/PF9GHFoOA6B5rKmAAMAAYsF53WaubYoVAgUA208LO/ICqnFsZBMiM9pf8Nysol5GVhC7WVzhxxgME7jnKp9P1AgILl82zgAHAAGAAMODz+ZJiXbMcBgK//gEGAANQVUXKljc0ENAadaLMqThlaCkTzpf8uKAUUqTSjX6qXscJ40emoS8ZCFrrAQQWwsBt1hzAAGAAMAAY8PF8WRkCEBiuvRKqmgOAAcBAkwPBS40HAYNPR8hLx9mR72XdrjC2XcKB1qq/+4MqQDaJiplrOEl830Owj7xUrA43SRs31J0J6oYIGAAMAAYaEgY+DwkMDNlYmR0wABiARpX4uzMbCwayE6V2wP6KU4YW3EvkOc/TuriGCXWCLcWKQJ2KXwh0LWoKGJAbYj9gADAAGAAM+DD2nXrFkUKiPYABwABgIFQ6x0o1yKqAyhg0teJsQR6fSAV3Lg0myz9DNhv3WBhmQwpwZBWj4P7Aj6doIHOMnx+gvLNbqcAQNJA5yjB0kp+f5/dcs66OQkG1f66f4UIWp9qTm/fMABwHwABgADDQWDDQGyIQIP2bbgMMAAYAA6HShw1RqZi2SOYgd55ynJ/slN7l9y5+1Cmlvayiu9PQj+JJbbzPuqIzGq2XYhGsSZR1E9TP0DKYjCp4EQjax1ovMNMWpdxzUcqmEpRzXP77+Tpk6jN+fs2KfnnuGW5bm483Spvzbp9ixQEDgAHAAGCgxnEXfRMyGJCV0SWAAcBAA8CAZN25UqWu6tAbyel/S3/GUCiiN/LumtBvKFZOsecseiIMlDYLZ2nDs9HH/n5gYoz//7uAneUbrA+5HUso19FG2afZuY9FqauGMcm1RWgrA0JfKkr5dIo/dxnreMXZlerTv2sq1etrTQEDpGf1AAOAAcAAYKCWcZ9leW2B0XTEhiKMgAHAwDh1tMo2idjfcuOsNjWBm3dnsRbq3P67WV+ybloKCAIw0xsABtyxYUBAoOjuoUJ7tNwZpT+y+thpLribKlpZqM9KwFVufz8/uqov7/1Ladb/wL/6MzavyZ6KSJTWdEaokJlGxcxe/r5bBvt3lzz+zrwzyS8QCAkM3GTNAAwABgADgIEaVgXeCyEIiK6zQjHFCBgADPgFA1W0vYW1gLWD9b1lQPBJqAuSKYe3OAYMyGy4xz96CZ/x3Km0JhGhzR1R5ZwW3FfVjHmwKwJMi06KtnTE/XSWRx2vv8rKgTOZx2yfctTrBwEMYBk+uZxZ1FuXG+aFENwYT5rKLgQYAAwABhoGBuKsSyGFAdEawABgADDwxH7ISsI8HbN/x5JwoeXhBYH+ZExVCh4t/t5zj5CXOcHPb5fAIHOeHy+r57ZkD/Lckyq70VY3QV4yqvZB1LF6ryrMlp8gm6bnV1yToRoIkM8suF0q/OpvdbthXgjJjXEDYAAwABgADFQx5gtDDALDkyCAAcAAYKByKOhkHdD7DIL0Ry9KmFO4IEBtHHYk7OVDTTRhL9B1R2cMOqpWMmTjcCHdTlueidLAc1HaGInSuoivSzi0/ikJsWpj7a44G9PYUHOJj0cP5dwW2ln3G+aFEC2bzzTgQAAGAAOAgfCDgOiDkMOA2DTAAGAAMFA1FDzPOhXwvoKs9ZuJFQTsl0FLT2LHc4dKudmYlXuHswpdIi9zhPu5knJOJ73RGlNjkJ3i7yrB4KQoFd1lKgVobe29wX//HhUcVz7P0E3zQohujl/UO7sQYAAwABhoCBhoZ10LOQxQUPVWAAOAgbDCQFn/ZF+BF2DokPiB7fZCwL//nAfJSbLT2c/O8ZWmygNbeJCN52N+vlTtVt/YGqW9Lf6NcZ/aiP0C62J1m4Pdo/w4k3YkIyb2PIQUBiQryDrAAGAAMAAYeMJ4Lze0Wlnv7zjHsnozImAAMGAjDJStErysU5UG4XfmrVodULPWa56KsLPZRsXMBjVT3uwFIkox+d/xeGyiYjpFxUTULyec/psq4DaTP/+HCtpwmtuwgPrbo9QfyE3zQshmym7Uc+kcMAAYAAyEHgSirOMGxrqbdavO33GfNRcwABgADIyrr3N1DQPTvqaMcasdJ6ikxBzIJKjo9rDzebHpIWDkGP2rPD5McE6bb0AgKwQy0+9lRv7BeZmL/J0raTAVMxUS1CAwMBwuBBgADAAGAAMjjfUUA076ZVar3uRb72P6vs0biQEDgAHbYUD3d5YO3THtY66uf+fefgIEZNMJdnS7VchKAU5/BVBwmR30NZSdGKOVPhyft9QJOJ/H/lbZasB1BoEs5dKtJsOBGgwGhmflAAOAAcAAYODRsd5gYJwP6E3K3Qa+64rpSuyAAcBAo8GA7vN81m3DvuUZKaJWv05t7YjRgPsK5dOuOJ0PXv+jyn/fyk7t6yqrTiEUZZxtCx86qSjy7afGHatJxU5JPbqCdVPVJPDcybTDv5CkJoYBCReaChgADAAGAANl4xxjnTEwzovKViFuGvi+LsAAYAAwMO4+R3QlY5OZM+W75tSnQ31PyybVXp3//4pyNvva2elkCPAya/j184CAca8S3FBjnEslaLNT+7FS6VulOJs7if6cjAYZEtRgMCD61O8ZM8AAYAAwEGoYmM26W+cxvjp83dH7Ez43cFwP2xoqBBgADIQFBnS/xR87bNin9D9JvNoM7LlT2Nm/WjabfY+1h1//FhDwSPagvJrpv62yCMnG6YIao2/K9IMGqhsPagQUyoutZY7x8zRtatibZ5hhQLILve7nTRIwABgADIT6erbdVIhQ2Xe+bmgl1MpjCxgADIQJBnTfJxvq/7DOS6pTfzvxnwoGtoUw9OaekaWZEhhdYB3RmZOWUMGZTVl3EhUy7eQ5CZW5Z8vEKOX4cWsqoVKt5p1OyvH7Cu7LVHTl7w5ym88o6BrMnOL/n0b/CzBgoa76GS4EGAAMAAZCey1LsL43MAGx6JHvnWwoVGgVYAAwABjwrf89hkOF/M0KRtm0VLq9YFE4zX2VJ192aRfdc/zvT9n53s/PPRrIrGUnWvY1LOTHl/h99cr1KrDxoyrYJRtEvA527lNt7NyzOtqowGO2VfZRtMepPx2nN8rGU8J4NqQZDiIMBqz+Z6P0VipK2UlR6nuGH/kzCs501gzaCBiwVJ9IrDBgADAAGGhqGFioU3EaCREq+14JFfrMwLH93MaaA4ABwEBIYaCV9Z3JmgP+Nf41la5yvgpfCcbx19lw3JNUzOzk56vYWX5BVTIe6EjQ+9y+17WDvZ71gWx0Zm18Ls5/82GdVgJulmL7M0l6y0nQm0/FafPTcdqUiNOWlgRtfiZB/clW2jKxlfqeTdCaSPSJY/xaU91AGwEGZLZutU/jARgADAAGwnktO2AiRGiU715j4LvFOgEDgAHAgG9jsNagD33StwJker9A1mjMvaTFLLhf8vdKHv7Z1N+h8uLTln+J0G8raPP6pySbzpq6pDaVol6F9DTaNIGd/1iMASBG3ZHH1cPKPhvnv0lwm6MRWKPBgOiaHzdKwABgADAQyutYm74GGA0RKvv+tIHaBiLrdq8BBgADIYaBdoN7ByQyJu1Pw7vVysCxusf3y0bbYuYgPy5lAEhRtlQYa3jWv6K2Dur2Six++WZnf2HgMHnOVCq0t9DWCQn6EwNBb2ucfq8hYH0r6+nS8zdYf3oqRt4vYxFYI8LAcLhQdJzjARgADAAGwncdW6ad9XoXGmsZ5fuj+vpT7+N71raaA4ABwECIYUC0x9D5K+fHi/40XBzsYuZ0HcNtjqkNtBJj7z0ToXf5+/5SYdtyrH5p38QoA4BLBWcODbgtymGvL7xI2NIh1kLKTWqnYjpBb0+M01p2/guTWni8+N8dcXrr2Riti8do8J8BA+Zh4KqBWF7S37FqnOMBGAAMAAbCdx07bmBs9z+hDSsNtOEea65NYw8YAAyEFQb0OMwzGCq0wb+Ge+45n7P8fK9CgAruVNqerLoYloqx91qjKttOwe3jzzql0ngWpeqxs/xBus76hzTd5e/9mrxML+Uz06gvlaDsL1oo57RQlqGkwJAwkIrT9l/GK13dAAz4puOG4nmHw4UmAQYAA4CBprmGpXU8fSAhQmXtSLJuGzjGO20af4MwcJH1g8UiwEAoYSDB+tHQ8fvQrpUB2QcgWX+KmaXkOW00UP2mWdWWbW2yH2CmmpmXlYWHv+Mav34+oFSmUjDsI1YXw0Ebg0kL5dNxhgQGgkwLYMA4DMjyecpgSNKxWrMLAQYAA4CB0F3D1hkY10us1ie0Q0KFPjbQlgujhSs1OAxAgIF6nL8Rg0XIvvZlEzFtUHsGPhhHjP1VlfJT4vj/xp+1rsZ2yGpAdmKcYWLTYxBgX32D09znLsq1JVS60P5kFDBgHgb0d72sl7lNZBdaXksxMsAAYAAwEKrrlzjgp4MOESprzwpD17dFgAHAAGDAt7HoMbiJePwgTz0qTGhpDVWGxSneS1nHpb+Od3XiNwwknVEGgX16s7FkG/pCfX7BPWFNBeTCAxj4jgYyA5RPtdIhOegdCBMKDgbkxn3QkFN0heXWMB6AAcAAYCA8169pBjYOy+e/VGF72gyFCh0CDAAGAAO+jcVcQ8fvNsufIqlUcGRT7tkqG3CPcs4UP5xgGvxZhIruGm7DJdZ6/twkf2609H+/EEjYE6Djf0UByUBmF7++kvLp6eSlE7QuWsom9MbPY1T4RYI2J7GJOAAY0N9nMlzoaLXhQoABwABgIFTXr20GxvTik0KEHmnTMQNtum7LsQYMAAYaAAYSukqwiYxC8/xp9LsqVGiRrvpbjbO8hHzIUEyDPxcgeZ4hIEW/fzZCfY5+XTIKpVsUJJhx/u+pzc9F9yi/tp7/PY+yTpr6nVbKZ9oo29FKWzoS9GZ57QGGgg1tCdrYiloDAcFAWbiQqexCywEDgAHAQENeuxKs8wbGdF81IYeG0pyKVgIGAAOAAd/G46KhY7jUv0Zv6YixI/zBKI7yPdbtEXPy9z/nmxP86CoDvaWKi/XWGQBkU/JxVg9rLnkZl7YyAOTcFHkd7bQ12UKbJ7TQW4k4vRkZuQDZ71h1DBOibDrOoMQwkm4vydVyuH3cxmxH6fWt8m+3pGzZ68PKOSWVv6Ykr8nnu23qUX1Xh1a6jd5xqp0JDwIGTIYL/ciaXMV4AAYAA4CBcMDAfEMhQgurbFc764aBY/0ZYAAwABjwbTxOGjqGa/1rtNo74LgqHv7xvQHrKO/M4seTj2UQyrsz6UgdBrH/FxFVW8Crw8k1nPnIc1aw4zuZ+tsS1DshTpvb4pSdkOD/a6E8A0BfPD6i81+uN38eo/zkGG2Y6fvKgNpUnU8KpH3Mbb5cpisPlB/htZJKr+fLHvMP/n3loc/LP/TZj2sgs4r22A0D+nvThhxZ0eFKi5EBBgADgIFQgEBEz9ibCBFqq6F9Rw207W41Ex2AAcAAYGDM8Thi6Bj2+9vw/63CheaoDEHlqwJ5ZzrtV3sLklR0TzziWB+ifLv/jnChVVYFdvicBegieZlt3J8Z9I7TQv0TE7Sp/SeHv0dXFS539t8Y4bVySdGx7f8Ul03Qvo/B//uZbO5+ldt+P9CLRdHNU5/9MFAWLmRiOV0yGL0KGAAMAAYaBgba9aqfVSFCZe171dC1bUMt7QMMAAYAA4+Nh6n9rjv8b7zMRhfdeeyEXi8LpVlN/6Fj+PNuOxUzJ8uc7Dv83nnV1hR48oy426kqAfsDAee5T938PE29qTitYyf+9zKrz/oDaz3rj5Eo/W4EbWCtZ/WMAgPrYzHypvi+eZj+wRroiHObzwd+sfDcXbaHCT0yu3fIYLhQGjAAGAAMNAQMLDU0ngtrbF9SV16vd/vOVrrqCRgADAAGxhyP7WE7ho87ogVn9oMCX557hnLp+E8ddFpVAa7hlJ+e+4XsOfDt+/+q0p2+54MTe5nVTVvTrZRPtVBucpL6+PnaMmdenPz8E9rTzdr8XIw2t8cVPAz/7dtPx2hLMkbZ5/xfGdmgxqBbwVjwKVX3hgUG9PdLdqHLhm7shyoYD8AAYAAwYD8MfGSo0FjLONp42NAxnwEYAAwABsY9HnlDx3Bf/TohQCAbSb3MB+yU3mWH8KXy2X/6U3uMiirjzg29wXiJL2lG1aqAM21chcdks3PR3UH9HVIJWRUEo01OXFUO3uI8tg9gzPbI3/4P/owtk+M0+KuE2iw8/Ld9yThl3RhtmOrv2Hf/q2RRSul4fhsuFoerObZBw0DZLJ+J7EKybP8yYAAwABgINQhMNrRBd+94QnB0GKSJY/4eYAAwABgY93j0GzqGB+rbEXHMpbpu0V3AQLDoIRgQJ/ntVtl0PIWd7J1UzByhreOfIaf807JXYF/N+Va9zJf8OIf6no3KjP6DtuaSEcpOitEAO/QDv/xJUiOg14mPVjmZeqdx/38Vp22dCep3SyDR21oCg8FfMxD9yv9xH2yL+rIy4uOPL4QwEDUcLpQCDAAGAAOhhYFuQ2O5YJztTBpa9fxB0qwCBgADgIFQrAzsN9Oh10oa9f+8RIQK6VZ657nxr0bk3elqtaGW1QBPBp7bsa5l5HZu+OcIvfFfovxeBoFJLTSQaaGc00IFfuzl1/pSkiI0+kBvsDamo5TNxOkddv77J8aopyWmVkXyDAjrW6J+pxSlXrUyUtsY1C9M6GDYYEC3wzWYXejgaHG2gAHAAGDAahCQiYNTBsZRnPj4ONtqck/UQsAAYAAwMK7x2GboGO5tqIsybXlOZsQP1rA34HvWAhpoL4UEDY4VgsPa2BqhAXb8t6YTlH0uRjtScdrSEacc/30vA0Bew0CO5cnzZ6NqJSDP2jIlTv3/xIDAn1OPMShMkFSiH1p1sSi4e6q8YVkBA7otr+rMPyaKkS0BDAAGAAOhg4GZd0pmdYhQWXsXG5zgAAwABgADtY/HbkPHcGfjgMBOndZ0pOJmY6e9/Izymcm0IiaZf6oIxZED1cpOfTJO2+MxyqcfFA7TQFECgm3DMPCLOG1yYiq7UH5s4Kh5DNaqWg/zVYYmmy4WXnUnmmUwEDM4k/bDSNmFAAOAAcCA1TDgGdpbtNCn9ppKgXolqGMPGAAMNAgMHDJ0DL1wDMjbo4cZPXC+dzwrqwKfVDFbfZ+8zD7KOy3q7zdKStRITWE7arVgyy9lFSBCb06I0h9/GaO1ExUc0F9MnjgT4yozk12rAkQDbl8Yw4QeCRe6ZMhx2v9ouBBgADAAGLAWBGSy4LyhEKGYT22OGKy2viwQnwEwABhoDBj43NAxXG//YAyqNKVzadB9cTSHUr2n6HZVXFxL3ld0s9T3U7Gz4fCg8u9Q8feDITlp/pSWlZFXAi8wNvLqy5oww4Bu0ysGi5EtBgwABgADoYCB+Yayju31ud2mrinHgwgVAgwABhoEBkzViVph/2D0qRSlM9mhvE3FzFJa9/TD/69SmKalbsEPFYLAXf6sHvqvY83yT5RVhrnU2x4NzUmTm9jCbT5n4YViiPJOVzVF5SyFAZPZhS6UO1CAAcAAYMBaGNhraD/RQp/b3WooVOgmawpgADAAGKh6LGKsu2Z8NHeB/QOiYvM7EqqAWala8UoabP1pRn/rM+K4b68YBKQQV78THfm7XMnEk2ToOMTvu0CF9mgYVgbUCobnrtMHlSzbL3CHx3RWlTcq62BAt8tkMbL9wzNqgAHAAGDAShBIGKroe8nvNJ06VGi/oeNvPAQBMAAYaAAYmGHo+AlwzAzHrPeamDi7/dqhv8NaT4VUKSbfcyvbMCuFzYoZvkBMiI0ablRwJ/HnndLvH6KcM4venGb32PSrVKJSYOyKlRcKSXGac9INAgPD2YXuGwoX6gIMAAYAA9bCgKkCXnvq1P6Fhtp/ZrS0yQ0AA7Ia/43FAgyEFwZWGjp+kobe3ms0eU6CvI44bebnH0gYjJtmx/LWT5t/3SP82MO6WIFDOsTv9yiXGnEDlgo18tzJVHTPPhLrnpXNy1afMHsVKO2wdtag4J6nrelYlTcpK2GgLFzosMHsQm2AgZGPX1BpCwEDgAE9MXA0jCFCj6xsmAgVusua3aAwMNlyh3IIMBA+GOA2ivYZOoclxN7SgZAZ/4HMKipmzrCj+zqDQAt1/0yc3j2PZaqpLFTlEOUmxUeKWy8VPZPQIPfMCH/3FfVn4raGCukCY50PIMlGee7HsnrRKDCg2zfJ0E1UzQqGEAZMHL9PLYSBBYaO06uAgcCPtVTyvW1g7ASsW+oINHsNnQPbAQOAAcBAxeMQZ31n6Bz+xN6BGFQrAZPYyf1Rncxe5it2Kl+R2POq6wh47teUdVtlY/DI35OWPQdHR806VHBn0S5Lx6mv3b4CY4/CmoR3rW4sGNBtXG4wXGh7yGDgBwNt/cJ06EEF/e4ydJyWAgYCP9avhzlE6BGAHTK0yhk3dm8EDAAGwg0DMwzuAR2wezDUjL27/EGqzILSpapmwdV7ndkSBjTid/RLhWB3hQojGqNg1mh/H+j4dKlVgRfUXgh7NxYNcfu6aHfVN6gwwICECx0x5BDcCxkMfGugrV9ZCAPLDBWfWgQYCPQ4S22BE4aO9QIDfblsKNzJWMYSwABgIOQw4Bn00162/qJLf24XZ313zY6o52bJG2vA26LsrH7/BKC4yk532rZQIep3pMDY51ZnGfDc61RwJtdwg7IeBnQ7TYYLhQkGThvKsBKz6TfJ7ek15CDOBwwEepynGgJ0mU1vNdCf3YbOgwOAAcAAYOCJY9BisL6ATK532g8DqoYAD0yxBqfXy3xPntM26mer+gVu6ok/llKoi1UbiWmdKsTWpVcFhsapesLAKcpNiNZwcwoLDAzPBt8HDDw0Lp8a2pTYYtP1ypBTJTAwAzAQ6HE2NW5Del9CvXXXUH+um/rNAgYAAyGGgaUGJ22/lXoGobjwKsc3n06zY3mmynj13fQ/x/jcrCpmNos/d6gCp/aySjv6mk0njNPOms6a8UC5NGv4udLM0mN6+N/D7+W/S4tmct8u1REGvFpWVMICA2XL7IcBAw+NianibHMscxK/NBRukQIMBHaMJQPPNw20GmhSQ35tfgcMAAYaEQb0xuEvw1gjwswA7dCz+MXMiYpPbs89IWFGo37ma+ozF/L7KnVsd9Gfk9bEKKvNz+PR36OyJ2NN3S4WsmpRcJ+nnsaGAd3eSQaLkYUBBnYYau/rFjmJLaxrBvp826+9EoCBmsbshQZaCQxCH5vIAgYYAAyEFAZeMVw8tit0F2HlvGedVpVetFBBiWZ5T8FZMNbMNL9vUcXpSSWLkRQ4+334b2iS3YcKHUm14lG/TELf8vFqqfGGGzYYGM4uNAQYUOPRY6i9R21JL6qzsphwEs+HMNylkWBgNxz6cemOXytbgAHAQCPBALer3WA6UdEVq4uNPXHA3mqRTb+LVA2A4UxDo8/mf0O5dNuoFYergYHhNKWF0T8vNGOYT8nG7H113i+wjVbUfMMNFQzoNkt2oWOAAaMVk69IUTZLnMRdhvp8HDAQ2DFuM1RQr9HVDRgADAAGHuq3aKfhJC+HrS02VtUqQc6JsyO/WNUIKLg3Rw338dyD7Lw/tqyuQmXyzvyKw4R++rw9tCXEY/cfKmXr0ieC1LhDhGQ/RvPAgG63y7oKGLgzzeCmxGVB/6Ykf7oGExP93QkYCOw4L26A1T8bdKremcAAA4CBkMHAEpbpNPFLGmXFNiJOOf2WVUxJKqYXqej2sg6wM3qSHd7vWdeomLmhipU9kg1IZRPKp6dWtTLwUyGy1dQVwvH6tYQHudNL6VLruipwggrp2DhuuqGEAd32FSGOKfYLBtoMplw9ZbKY0Sj9XWvwGK3wsd2AgerG6wgced82wU8HDAAGAAOqzzNZ1w2DwAVWa6TR7MGm2HdZq+IRyqaiVEglKOe0KBVSsZFXBjoSVVc0Ljm7txk6XqQ1IRujguOqUKd6Vx0uuK+OZ/Uk5DAQ5nAhv2BAdNJghpLAiqYYDh2R1ZaZgIFAjnNap8aEM++P6lr1FDAAGAgDDHBbpmjH3HQdqG2hDxHy90DEJXb+XI2z31dZz9MfQtDP19QqSLuRImWqiFuqZTxpWMMMA7r9U0KaXWixj2Oww2C7zwfhcGrwM7mh9LKf4RWAgarGag0ceF91rp41BwADgAHbYYDbMd1gcbFy3REIAQGUH4wNMYmfPzyOcJjLrHm0wuI+dsv+inQbt/NjIxcGz11Hg9Hx3nhDDQO6DytDGC7kJwwsNtz2D0xWJC7LIHXPYB+P+NwHwEDlx/oEHHg7K2kDBgADYYIBvVn4RdalAEBAdIgVjTSDUaFDZsIT9D4/3zfG+7ayBtxN43R+ZYVgiWTosW4c/ixjkU5x+z4zBAKX+PtapXI0YEAVIzvWxDAgYRU3DDsXAyaAQDuHiwz3T7QaMBAIDEzVKTHhxPurffVKDQwYAAzYCAO6qJicm7cCAgFJHDMz0ixG2yZI+M97qlBYwZ1H2VSCCk9FaSP/30FWT9k+g5zTxe8ZGmdojNQg6KX8xJgNaUdLRcWelj0CM7hd3xo5yWQMPXct/V9fbr6hhwHdjykGs8zYBgMSQvN5ALONO+u5oVj3S1YEbhrum3zfFJ/7AhiobJz64LjXRZJkoB0wABhodBjQqwGzWF8YLir2qI401V6B0mZZdw7rjnJSC+4FdlQ/YHXzQLxA2XRazWDnWHmGBS9zzydn+CN2wNO0LsC+q+JsySgV3RXcJnM71KXIWKEj4dPNtyFgQPdlZTPCgO57T0D9kJCOzjocy3bW3oDCv77wexYVMFDxOJ2D4143LQUMAAYaGQb4+yax9rLuBggBw3sFpkWazaivVVYHdo8QykL6B3JPqeC7U3yNHfHVlHdi49lEW1Of31IZgzq5j8fGvdpRbV0Bz+3yq78NBgNhChfyGwYmBRhecUevEnT60I8kqzfgGhIr6nBuAgaePEZzUVugrvoIMAAYaDQY4O+I6X0BhyyAgGG9F2lGk7Sf7JAn2Uk1n7aptEpwmqGgi7IT42PtWxh3P7t1zQTPSfH3DfB33zDeX8/9kP7SFvXxBtwwMFDmFF9rQhiQkJqPA+6T2Ke6FsAsVqKCdksRsek6HOhIAHsDRgqnSNbhvAQMjD0+ovfhsNdV8tuaBBgADIQdBvhzk6yXdCXhH3R8Plki8YMbot5LbQfnt89IuNCSulbbfeKMeeY0P66kHIOJhPC841MYlMhriVLBmcoQsE1lNgoiFs1zf1S5cv/h60240WBAtCoEM4yL69D3Lov6d1fP7p/VkHKQtUfrgF7BOaNTeNq0YXRHnc5LwMDY45MwWDyvmbUWMAAYMAgDklmxrUq1a2dfQn6msuboqsHrWftZX7FuBLwfYDRJFMyrkWY3+tuzEi60L+CDNKScZo9PGgmnyaXTtDUZpV5u305x6kvO/aihP8POv1Rc3tohu9E7GQBW8WcdZ9C4GehJ5rnLabPvN+GGggGLZsmDgIEYYq7HPXPaWadzEjAw9vgswvlnrIo4YAAwYAoG7ujvqUZXWFe1w3/bUqd/rFSisUizGy1i9XdInv1vrDgwpRAiSUd6grWT/72KHfv5lHM6Ke+kVGiTklCok9YZgRbxv3v4ffv5/WdZt3zf61DbqsB+yk6I1eEm3HAwoPs1JeC4c+MwoPu9CnHXNWtXvdIvAgaeuJr3Ic4/Y6F8MwADgAFDMNBM+p6VjsD0CfYblV1oltrca9vBKmhAKM2y32RdZ11j3VBOf2lVYcgK5/9hEDjLsNJOVJcbcUPCgO7bGouLkdULBiQG/zs4PVVLwNGt47loCgZk83V3wFpU5djIpvHrOAeNKQ8YAAwABnyVrGC8CAJ49CQrpRtdyrqLk8SHjEmeO61eNRUaHAYkbOaTZoIB3e9XQliROWitq/O5mG2isfyoyrExlRL4trSNddRSmVrJPC+hlIABwAB8LN/U3VQ1Bao60f4i8fnu+sA2FDeCPKbNovtiPYurNTIMWB4uVE8YiIRgz4RNOlnvasqAgVHHxWTBvI/rFQbm0zniGSwYOA8wABiAn+WLdrGiEdgYqwNbkzF2aLcbzcPfOCsCEsq0st5VlpsABkSrLYyjX1znfk8NSYrVoHVLUpsaOA8BA6Ofp7cNtWu5zfdMbt9s1j1DY7HHLzACDAAGmlhHsWG4kpNN0nvmOxLs2O4N2Y7w4NNTFdxNlJ8QNXADamgY0H2MWzhTvthAv9ciXGhM3a9HqkXAQFUw0GuoTbInwerNfXqV5FuDe2QSPjmVgAHAQDPqOKsFnn41KwQ5BQT7AQQVg0CWchNihm5ADQ8Dup+dls2Um4AB2TNxGE7/qDroZ+w0YKA6GNCQftZQm47ZHCJUNiZ5g8dpCWAAMADVpE+kJgI8/GpPOlW5Nxknz92NPQRjhgbd5THqo3x7zODNp1lgYDi70FCzwIDudxq1B0bNt95u8PwDDDw+JnMNhsWEohCQrtxtqgjfUT9gGDAAGGgiyTE+zGqFZz+eFYJNHTEqullkGRpls7DnrqF3klHDN5+mgIGyZfhPmwkGdL9nWF5zwbQk9epkw+ceYODxMXnPYIhQexjuk/oaZWq15CYrBRgADEAVSSayd7Li8Oj9OAH3/jqiKul6mRs4uR6sCFxnSFpE+ZYgbj5NAwO6v1N0pdmmgQHd7wUGN2rarIsmNgwDBp44HglD1x7RkTCECJWNTb/BY7UGMAAYgCqqpLwaWYP8/tHsVGlHZ1pTqThIFd1vKe9Mp38L7MbTVDCg+/y6BeFCiwPo90tNDgQ/SPaagM45wMDD47HI4G9waZjuj3olz1So0InxptUFDAAGGlznWbPhudfrh1OQkzHdzkBwoCn3EUifi+4HVHTa6d1AbzzNCAOysfZ4E8LAsBPWjClHz+pVoaDOOcDAw+NxyFBbZBUwVBk/dKjQGUPjIzYNMAAYgEZI5pJ398lGYRQUq/ePR/YR5CfKPoIV7BxfaaL9AVfIy6wmLxWjfwR+42k6GND9nhZwHP3iAPv+vMEQjaA1pKvOtgd8vgEGfhqLdh3Hb6ItH4YpRKhsjHoNHq9+wABgAHpI37G6EBZk+ke0+2cRhoFOdpKPNPTmYlkN8NyPyHOmSYVmS246TQkDuu9rAwwXWhxw32WW/DMLi7H5qds6/jphwbkGGPhpLFYYOu/kO14O4z1RT1aYChX6RtK8AgYAA5B7neWx2iOwAFcJcskoO8tdrK8brGrxEHmZ77lfy2hrOlbvqsKAgYr7Hg8wXGixBf2XTZwDDbqPQIo3vWjLrDBg4KGx+MxgFqFEGO+HOpTxS0PjJOldXwAMAAaaWLdZUgtrKkKCbPlBSdXiXLqFipluBoKLoS9U5rnXuB/9lHPabIIAwMBDM3DXmhEGdP+H871/1SCrBLdYHqvVsvMMMFAaB5d111A7PgjzvZDbv97gMXsfMAAYaELdYh1gzQAE2AwFeaeVnekeBQWF0IUEXeO2D/DzNL1t9Q2nqWFAj8HaZoWBR1ZJZBwuh9QBva83pU6z9BwDDJTGYYPBvSKLw3wP1KF8psDpYq0ADRgADIRQ0vcB288pWPkJu07SkDpxKmaWsXN9kp3sexYDgKwEfMdtXU9Fp402huKGAxgoLcl/2swwUDYWraxN2jkIg+N5R28SnWX5Odb0MGC4oNblsGURGmW8ThiEpyWAAcBAg68CHGUtYcUisBACgewnOMjKpmPsbM9iZ/s9drzPW5GStKBDgYruYX7+EmUZXHbHIrQ5NDecpocBPQ6dhouRLbZ4LIahYBXrlJ51t83hlPN2hz5u0RCcX4CBO3dmGgxF298I9z7uR4/B43YEMAAYaKi9mnkVan6YtUw2BSMUqNHAYBU721vTLeyEP8/azk74V6xbRkKJCkr3WD+Ql/mA9Sq/nqJt7VH6P6X2hexmAxj4yQHuNuisLA7J+SGrJrNZO1nn9GbDoJzMH/UqwGINK2H6nQEGSvBmapZ7UYPAgMk9FrLhOgUYAAyEeOb/vJ79X8+aw2oFADQDGOzTcJCdGKecM4WK7ivspO/iRwkn+pFB4bb6gdaamaig/lbSgd7kR8kGdIy1ngFgrtrPUIxH6O/hAwDAwJiO7+eAgVHHR7IPzdFhRJ/qUIx7dXToZGP3ae1EvhR0rQDAQO0wICE7rO9tj3+38LyRUKEvDB671YABwIBFM/tDuviX+HI3WFf0bP9Z1kesXay1rBfl/GAl4PxjxaCkN1nvJ6LsrEvVuOnsxHcxHKzlx+1q13gx8wnrFL92mh37r/j5WX7+FT8/zY8nVB0ASTHluXn+v5X8fB5/1hSGjYSE/kiRMFrdOOMmsdY6m0w9NTVE45EyMB6itpCfN6I2vWqwUq8cfKxTekoxt5s6Zek9HWY0VObk39ev39HvE6f/vE45uVdvZH6BlQ5jwagxZnjnNommjgLapr5/eiPd27g/kw2OXdUOt0qSkXfnGlDc5uNkaAwm+9je2YbaPB7J7P5M1jTt7Ccl3h8OP6w2SNDx+5RjvcvawHq7DCBE/8bqV4o+eC0fCU3sPwxmkfMS1478NL2SII79fNYCnft/3rDTpp3klkZx+mEwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAwGg8FgMBgMBoPBYDAYDAaDwWAwGAzWHPb/AUSLG3bUHqwmAAAAAElFTkSuQmCC";

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
      ...e.b && HTTPS2.test(e.b) ? { backdrop: e.b } : {},
      ...e.o ? { overview: e.o } : {}
    };
  }
  const asked = (id) => Object.hasOwn(read(), id);
  function dress(cards) {
    return cards.map((c) => {
      const k = known(c.id);
      const withId = k.tmdb && !(c.ids && c.ids.tmdb) ? { ...c, ids: { ...c.ids || {}, tmdb: k.tmdb } } : c;
      const withBackdrop = k.backdrop && !withId.backdrop ? { ...withId, backdrop: k.backdrop } : withId;
      return k.logo && !withBackdrop.logo ? { ...withBackdrop, logo: k.logo } : withBackdrop;
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
            const type = c.kind === "series" ? "series" : "movie";
            const yearNum = c.year ? parseInt(c.year, 10) : void 0;
            const res = await kino2.meta({
              type,
              title: c.title,
              ...yearNum && yearNum > 1900 ? { year: yearNum } : {}
            });
            count++;
            if (!res) {
              read()[c.id] = { t: 0, l: "" };
            } else {
              const tmdbId = res.ids && res.ids.tmdb || res.id || 0;
              read()[c.id] = {
                t: tmdbId,
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
function cleanId(raw) {
  let s = raw;
  try {
    s = decodeURIComponent(s);
  } catch (_) {
  }
  let id = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._~-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 128);
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
function parseCards(html, defaultKind = "movie", typeMap = null) {
  const cards = [];
  const cardRegex = /<a class="gnrd-card" href="([^"]+)" title="([^"]+)">([\s\S]*?)<\/a>/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const href = match[1];
    const title = match[2].trim();
    const body = match[3];
    const slugMatch = href.match(/\/ver\/([^\/]+)/);
    const rawSlug = slugMatch ? slugMatch[1] : href.replace(/^https?:\/\/[^\/]+\//, "");
    const id = cleanId(rawSlug);
    const imgMatch = body.match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/i);
    const poster = imgMatch ? imgMatch[1] : "";
    const ratingMatch = body.match(/class="gnrd-rating"[^>]*>★?\s*([0-9.]+)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : void 0;
    const yearMatch = body.match(/<span>(\b(19\d\d|20\d\d)\b)<\/span>/);
    const year = yearMatch ? yearMatch[1] : void 0;
    const badges = [];
    const langMatches = body.matchAll(/class="gnrd-lang"[^>]*>([^<]+)<\/span>/g);
    for (const lm of langMatches) {
      const l = lm[1].trim();
      if (l && !badges.includes(l)) badges.push(l);
    }
    const genreMatch = body.match(/class="gnrd-card-genres"[^>]*>([^<]+)<\//i);
    const genres = genreMatch ? genreMatch[1].split(/[·,]/).map((s) => s.trim()).filter(Boolean).slice(0, 5) : [];
    let kind = defaultKind;
    const mappedType = typeMap ? typeMap.get(href) || rawSlug && typeMap.get(rawSlug) : null;
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
      genres
    });
  }
  return cards;
}
function parseHeroSlides(html) {
  const slides = [];
  const slideRegex = /<div class="gnrd-slide[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;
  while ((match = slideRegex.exec(html)) !== null) {
    const block = match[1];
    const bgMatch = block.match(/background-image:url\('([^']+)'\)/i);
    const backdrop = bgMatch ? bgMatch[1] : "";
    const logoMatch = block.match(/<img class="gnrd-hero-logo" src="([^"]+)" alt="([^"]+)"/i);
    const logo2 = logoMatch ? logoMatch[1] : "";
    let title = logoMatch ? logoMatch[2].trim() : "";
    const playMatch = block.match(/href="([^"]+)"[^>]*>▶\s*Reproducir/i);
    if (!playMatch) continue;
    const ref = playMatch[1];
    if (!title) {
      const slugMatch2 = ref.match(/\/ver\/([^\/]+)/);
      title = slugMatch2 ? slugMatch2[1].replace(/-/g, " ") : "Destacado";
    }
    const synMatch = block.match(/<p class="gnrd-hero-syn">([\s\S]*?)<\/p>/i);
    const overview = synMatch ? synMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    const yearMatch = block.match(/<span>(\b(19\d\d|20\d\d)\b)<\/span>/);
    const year = yearMatch ? yearMatch[1] : void 0;
    const ratingMatch = block.match(/class="gnrd-m-rating"[^>]*>★?\s*([0-9.]+)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : void 0;
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
      logo: logo2,
      overview,
      year,
      rating,
      poster: backdrop
    });
  }
  return slides;
}
async function fetchHtml(url) {
  const res = await kino.fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: BASE_URL + "/"
    }
  });
  if (!res.ok) {
    throw kino.error("unavailable", `Error de conexi\xF3n con GnulaHD (HTTP ${res.status})`);
  }
  return await res.text();
}
async function fetchJson(url, referer) {
  const res = await kino.fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: referer || BASE_URL + "/",
      Accept: "application/json"
    }
  });
  if (!res.ok) return null;
  return await res.json();
}
async function resolveVidara(url) {
  const m = url.match(/(?:vidara\.[a-z]+|vidaraa\.[a-z]+)\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const filecode = m[1];
  try {
    const res = await kino.fetch("https://vidara.to/api/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Referer: `https://vidara.to/e/${filecode}`,
        Origin: "https://vidara.to"
      },
      body: JSON.stringify({
        filecode,
        device: "desktop",
        codecs: ["h264", "aac"]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.streaming_url) {
      return {
        url: data.streaming_url,
        mime: "application/x-mpegURL",
        headers: {
          Referer: `https://vidara.to/e/${filecode}`,
          "User-Agent": USER_AGENT
        }
      };
    }
  } catch (_) {
  }
  return null;
}
async function resolveSavefiles(url) {
  const m = url.match(/savefiles\.com\/(?:e\/)?([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  const filecode = m[1];
  try {
    const bodyStr = `op=embed&file_code=${encodeURIComponent(filecode)}&auto=1&referer=${encodeURIComponent(BASE_URL + "/")}`;
    const res = await kino.fetch("https://savefiles.com/dl", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        Referer: `https://savefiles.com/e/${filecode}`,
        Origin: "https://savefiles.com"
      },
      body: bodyStr
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
          "User-Agent": USER_AGENT
        }
      };
    }
  } catch (_) {
  }
  return null;
}

// src/plugin.js
var browseApp = null;
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
              { id: "peliculas", title: "Pel\xEDculas en HD", ref: "peliculas", items: res.items }
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
async function search(query) {
  const q = typeof query === "string" ? query : query && query.q || "";
  const queryType = typeof query === "object" && query ? query.type : null;
  const cleanQ = q.trim();
  if (!cleanQ) return { items: [] };
  const jsonUrl = `${BASE_URL}/wp-json/gnrd/v1/search?q=${encodeURIComponent(cleanQ)}`;
  const htmlUrl = `${BASE_URL}/?s=${encodeURIComponent(cleanQ)}`;
  const [jsonRes, htmlRes] = await Promise.allSettled([
    fetchJson(jsonUrl),
    fetchHtml(htmlUrl)
  ]);
  const typeMap = /* @__PURE__ */ new Map();
  const jsonResults = jsonRes.status === "fulfilled" && jsonRes.value && Array.isArray(jsonRes.value.results) ? jsonRes.value.results : [];
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
        year: r.year ? String(r.year) : void 0,
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
          year: r.year ? String(r.year) : void 0,
          badges: r.type ? [r.type] : []
        });
      }
    }
  }
  return { items };
}
async function home() {
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
    title: "Pel\xEDculas Recientes",
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
      title: "Terror \xB7 Top Semanal",
      ref: "genres/terror",
      items: terrorItems
    });
  }
  if (accionItems.length > 0) {
    rows.push({
      id: "accion",
      title: "Acci\xF3n \xB7 Top Semanal",
      ref: "genres/accion",
      items: accionItems
    });
  }
  return rows;
}
async function browse(ref, cursor) {
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
async function episodes(ref) {
  const html = await fetchHtml(ref);
  const seriesTitle = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").replace(/<[^>]+>/g, "").trim() || "GnulaHD Series";
  const cardRegex = /<a[^>]*class="[^"]*gnrd-epc[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  const episodes2 = [];
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
    episodes2.push({
      season: sNum,
      number: eNum,
      ref: epRef,
      title,
      still
    });
  }
  episodes2.sort((a, b) => a.season - b.season || a.number - b.number);
  return {
    series: { title: seriesTitle },
    episodes: episodes2
  };
}
async function resolve(ref) {
  let pid = null;
  let tok = null;
  try {
    const u = new URL(ref);
    pid = u.searchParams.get("id");
    tok = u.searchParams.get("t");
  } catch (_) {
  }
  if (!pid || !tok) {
    const html = await fetchHtml(ref);
    const pidMatch = html.match(/_gnrdPid\s*=\s*(\d+)/);
    const tokMatch = html.match(/_gnrdTok\s*=\s*"([^"]+)"/);
    if (pidMatch) pid = pidMatch[1];
    if (tokMatch) tok = tokMatch[1];
  }
  if (!pid || !tok) {
    throw typeof kino !== "undefined" && kino.error ? kino.error("unavailable", "No se encontr\xF3 el reproductor para este contenido") : new Error("No se encontr\xF3 el reproductor de GnulaHD");
  }
  const apiUrl = `${BASE_URL}/wp-json/gnrd/v1/player?id=${pid}&t=${encodeURIComponent(tok)}`;
  const res = await kino.fetch(apiUrl, { headers: { Referer: ref } });
  const data = await res.json();
  if (!data || !data.p) {
    throw typeof kino !== "undefined" && kino.error ? kino.error("unavailable", "Respuesta inv\xE1lida del reproductor de GnulaHD") : new Error("Respuesta vac\xEDa del reproductor");
  }
  const unpacked = gnrdUnpack(data.p);
  if (!unpacked || !Array.isArray(unpacked.langs)) {
    throw typeof kino !== "undefined" && kino.error ? kino.error("unavailable", "No se pudieron descifrar los servidores") : new Error("No se pudieron descifrar los servidores");
  }
  const preferred = typeof kino !== "undefined" && kino.config && kino.config.get("preferredLang") || "latino";
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
      alternatives: alternatives.length > 0 ? alternatives : void 0
    };
  }
  throw typeof kino !== "undefined" && kino.error ? kino.error("unavailable", "No hay servidores disponibles para reproducir") : new Error("No hay servidores de video reproducibles disponibles");
}
async function categories() {
  return [
    { id: "peliculas", ref: "peliculas", title: "Pel\xEDculas", titleEn: "Movies", icon: "movie" },
    { id: "series", ref: "series", title: "Series", titleEn: "Series", icon: "tv" },
    { id: "anime", ref: "anime", title: "Anime", titleEn: "Anime", icon: "animation" },
    { id: "terror", ref: "genres/terror", title: "Terror", titleEn: "Horror", icon: "psychology" },
    { id: "accion", ref: "genres/accion", title: "Acci\xF3n", titleEn: "Action", icon: "flash_on" },
    { id: "comedia", ref: "genres/comedia", title: "Comedia", titleEn: "Comedy", icon: "sentiment_very_satisfied" },
    { id: "ciencia-ficcion", ref: "genres/ciencia-ficcion", title: "Ciencia Ficci\xF3n", titleEn: "Sci-Fi", icon: "rocket" },
    { id: "suspenso", ref: "genres/suspenso", title: "Suspenso", titleEn: "Thriller", icon: "visibility" },
    { id: "animacion", ref: "genres/animacion", title: "Animaci\xF3n", titleEn: "Animation", icon: "brush" }
  ];
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
  const page = await getBrowseApp().loadTab(chosen);
  return {
    tabs,
    tab: chosen,
    rows: page ? page.rows : []
  };
}
async function screen(ctx) {
  const app = getBrowseApp();
  return app.view(ctx);
}
async function screenEvent(ev) {
  const app = getBrowseApp();
  return app.event(ev);
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
