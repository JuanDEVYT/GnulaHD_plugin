import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";

test("plugin validation passes Kino sdk", () => {
  const res = spawnSync("node", ["sdk/validate.mjs", ".", "--repo", "JuanDEVYT/GnulaHD_plugin"], {
    encoding: "utf-8",
  });
  const output = (res.stdout || "") + (res.stderr || "");
  assert.equal(res.status, 0);
  assert.match(output, /Kino would accept this plugin/);
});

test("home returns 3 rows with items", () => {
  const raw = execFileSync("node", ["sdk/run.mjs", ".", "home"], {
    encoding: "utf-8"
  });
  const data = JSON.parse(raw);
  assert.equal(Array.isArray(data), true);
  assert.equal(data.length >= 3, true);
  assert.ok(data.some((r) => r.id === "movies"));
  assert.ok(data.some((r) => r.id === "series"));
  assert.ok(data.some((r) => r.id === "anime"));
});

test("search finds titles", () => {
  const raw = execFileSync("node", ["sdk/run.mjs", ".", "search", JSON.stringify({ q: "batman" })], {
    encoding: "utf-8"
  });
  const data = JSON.parse(raw);
  assert.ok(data.items.length > 0);
  assert.match(data.items[0].title.toLowerCase(), /batman/);
});

test("search correctly identifies series with kind series", () => {
  const raw = execFileSync("node", ["sdk/run.mjs", ".", "search", JSON.stringify({ q: "breaking bad" })], {
    encoding: "utf-8"
  });
  const data = JSON.parse(raw);
  assert.ok(data.items.length > 0);
  const bb = data.items.find((i) => i.id === "breaking-bad");
  assert.ok(bb, "Breaking Bad should be found");
  assert.equal(bb.kind, "series", "Breaking Bad must have kind series");
});

test("browse returns paginated results", () => {
  const raw = execFileSync("node", ["sdk/run.mjs", ".", "browse", "peliculas"], {
    encoding: "utf-8"
  });
  const data = JSON.parse(raw);
  assert.ok(data.items.length >= 20);
  assert.equal(data.next, "2");
});

test("episodes returns series chapters", () => {
  const raw = execFileSync("node", ["sdk/run.mjs", ".", "episodes", "https://ww3.gnulahd.nu/ver/visionquest/"], {
    encoding: "utf-8"
  });
  const data = JSON.parse(raw);
  assert.ok(data.episodes.length > 0);
  assert.equal(data.episodes[0].season, 1);
  assert.equal(data.episodes[0].number, 1);
  assert.ok(data.episodes[0].ref.includes("visionquest"));
});

test("resolve gives a playable m3u8 stream", () => {
  const raw = execFileSync("node", ["sdk/run.mjs", ".", "resolve", "https://ww3.gnulahd.nu/ver/el-despertar/"], {
    encoding: "utf-8"
  });
  const data = JSON.parse(raw);
  assert.ok(data.url);
  assert.match(data.url, /\.m3u8/);
  assert.equal(data.mime, "application/x-mpegURL");
});

test("screen produces declarative scaffold UI", () => {
  const raw = execFileSync("node", ["sdk/run.mjs", ".", "screen"], {
    encoding: "utf-8"
  });
  const idx = raw.indexOf("{\n  \"type\": \"scaffold\"");
  assert.ok(idx !== -1);
  const data = JSON.parse(raw.slice(idx));
  assert.equal(data.type, "scaffold");
  assert.equal(data.appBar.titleNode.alt, "GnulaHD");
});
