/* Midnight Lawn Co. — Yard survey.
   Turns a street address into a 3D model of that front yard, built only from public data:
   - US Census geocoder: the address, its county, and the side of the street
   - OpenStreetMap (OpenFreeMap vector tiles): street centrelines and names
   - USGS 3DEP lidar (Wayne County, 2017): the shape of the ground, each house's footprint and roof,
     every tree's position and height
   - USGS NAIP aerial photo: which ground is lawn and which is driveway or walk
   Google content is never used to build the model; their terms forbid deriving models from it.
   The module has no DOM dependencies, so it also runs under Node for testing: everything that
   touches the network or decodes files comes in through `env`. */

export const SOURCES = {
  census: "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress",
  tiles: "https://tiles.openfreemap.org/planet",
  lidar: "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_MI_WayneCo_2017_LAS_2018",
  naip: "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage",
  lazperf: "https://cdn.jsdelivr.net/npm/laz-perf@0.0.7/lib/web/laz-perf.js",
};
export const CREDITS = "Lidar and aerial photo: USGS 3DEP and NAIP. Streets: © OpenStreetMap contributors. Address: US Census Bureau.";

const HALF = 46;            /* survey box: 92 m square around the address */
const DEM_CS = 1;           /* ground and object grids, metres */
const SURF_CS = 0.5;        /* surface (lawn, paving, road) grid */
const CELL_M = 2.5 * 0.3048;/* one builder square, 2.5 ft */
const SETBACK_ROWS = 2;     /* 5 ft clear of the sidewalk */
const R_EARTH = 6378137;

/* ------------------------------------------------------------------ small helpers */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mercX = (lon) => (lon * Math.PI / 180) * R_EARTH;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * R_EARTH;
const median = (arr) => { if (!arr.length) return NaN; const a = Float64Array.from(arr).sort(); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const pct = (arr, p) => { if (!arr.length) return NaN; const a = Float64Array.from(arr).sort(); return a[clamp(Math.round((a.length - 1) * p), 0, a.length - 1)]; };
class SurveyError extends Error { constructor(code, message) { super(message); this.code = code; } }
export { SurveyError };

const withTimeout = async (env, url, opts = {}, ms = 30000) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  const outer = opts.signal; if (outer) outer.addEventListener("abort", () => ctl.abort(), { once: true });
  try { return await env.fetch(url, { ...opts, signal: ctl.signal }); } finally { clearTimeout(t); }
};
const pool = async (items, n, fn) => {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
};

/* ------------------------------------------------------------------ 1. the address */
const normStreet = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const SUFFIX = /\b(STREET|ST|AVENUE|AVE|ROAD|RD|BOULEVARD|BLVD|PARKWAY|PKWY|DRIVE|DR|LANE|LN|COURT|CT|PLACE|PL|CIRCLE|CIR|TERRACE|TER|WAY|HIGHWAY|HWY)\b/g;
const streetKey = (s) => normStreet(s).replace(SUFFIX, "").replace(/\b(NORTH|SOUTH|EAST|WEST|N|S|E|W)\b/g, "").replace(/\s+/g, " ").trim();

export async function geocode(address, env) {
  const params = new URLSearchParams({ address, benchmark: "Public_AR_Current", vintage: "Current_Current", layers: "Counties" });
  const data = await env.jsonp(`${SOURCES.census}?${params}`, 25000);
  const matches = data && data.result && data.result.addressMatches || [];
  const exact = matches.filter((m) => m.matchType === "Exact");
  const candidates = exact.length ? exact : matches;
  if (candidates.length > 1) throw new SurveyError("ambiguous-address", "More than one address matches. Add the city and ZIP code so we can pick the right one.");
  const m = candidates[0];
  if (!m) throw new SurveyError("no-match", "We couldn't find that address. Check the house number and street, and add the city.");
  if (!Number.isFinite(m.coordinates?.x) || !Number.isFinite(m.coordinates?.y)) throw new SurveyError("no-match", "The address lookup did not return a usable location. Check the address and try again.");
  const requestedNumber = (String(address).match(/^\s*(\d+)/) || [])[1];
  const returnedNumber = (String(m.matchedAddress).match(/^\s*(\d+)/) || [])[1];
  if (requestedNumber && returnedNumber && requestedNumber !== returnedNumber) throw new SurveyError("no-match", "The lookup returned a different house number. Check the number, street and city.");
  const county = (m.geographies && m.geographies.Counties && m.geographies.Counties[0]) || {};
  const a = m.addressComponents || {};
  /* a second number on the same block tells us which way the numbers run, and so which side of
     the street "R" or "L" is (TIGER sides are relative to the direction of the address range) */
  let dir = null;
  const num = +(String(address).match(/^\s*(\d+)/) || [])[1];
  const lo = Math.min(+a.fromAddress, +a.toAddress), hi = Math.max(+a.fromAddress, +a.toAddress);
  if (num && hi > lo) {
    const n2 = num + 10 <= hi ? num + 10 : num - 10 >= lo ? num - 10 : num + 2 <= hi ? num + 2 : num - 2;
    if (n2 !== num && n2 >= lo && n2 <= hi) {
      const street = [a.preDirection, a.streetName, a.suffixType, a.suffixDirection].filter(Boolean).join(" ");
      try {
        const d2 = await env.jsonp(`${SOURCES.census.replace("geographies", "locations")}?${new URLSearchParams({ address: `${n2} ${street}, ${a.city}, ${a.state} ${a.zip}`, benchmark: "Public_AR_Current" })}`, 15000);
        const m2 = d2 && d2.result && d2.result.addressMatches && d2.result.addressMatches[0];
        if (m2 && streetKey(m2.addressComponents?.streetName || "") === streetKey(a.streetName) && Number.isFinite(m2.coordinates?.x) && Number.isFinite(m2.coordinates?.y)) {
          const up = n2 > num ? 1 : -1, k = Math.cos(m.coordinates.y * Math.PI / 180);
          let dx = (m2.coordinates.x - m.coordinates.x) * up * k, dy = (m2.coordinates.y - m.coordinates.y) * up;
          if (+a.toAddress < +a.fromAddress) { dx = -dx; dy = -dy; }   /* ranges that run backwards along their edge */
          const L = Math.hypot(dx, dy);
          // A cross-block or nearly identical fallback pin does not establish street direction.
          if (L > 1e-7 && L < .005) dir = [dx / L, dy / L];
        }
      } catch { /* no direction: the picker still lets them choose */ }
    }
  }
  const side = m.tigerLine && m.tigerLine.side;
  return {
    sideVec: dir && (side === "R" || side === "L") ? (side === "R" ? [dir[1], -dir[0]] : [-dir[1], dir[0]]) : null,
    matched: m.matchedAddress, lat: m.coordinates.y, lon: m.coordinates.x,
    side: m.tigerLine && m.tigerLine.side, street: [a.preDirection, a.streetName, a.suffixType].filter(Boolean).join(" "),
    streetKey: streetKey(a.streetName), county: county.NAME || "", countyFips: (county.STATE || "") + (county.COUNTY || ""),
    number: (String(address).match(/^\s*(\d+)/) || [])[1] || "",
  };
}

/* ------------------------------------------------------------------ 2. the street map (Mapbox vector tiles) */
/* a tiny protobuf + MVT reader: enough for lines, points and their string/number tags */
export function readTile(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let pos = 0;
  const varint = () => { let r = 0, s = 0, b; do { b = u8[pos++]; r += (b & 0x7f) * 2 ** s; s += 7; } while (b & 0x80); return r; };
  const skip = (wire) => { if (wire === 0) varint(); else if (wire === 1) pos += 8; else if (wire === 2) pos += varint(); else if (wire === 5) pos += 4; };
  const str = (end) => new TextDecoder().decode(u8.subarray(pos, end));
  const packed = (end) => { const out = []; while (pos < end) out.push(varint()); return out; };
  const layers = {};
  while (pos < u8.length) {
    const tag = varint(), field = tag >> 3, wire = tag & 7;
    if (field !== 3 || wire !== 2) { skip(wire); continue; }
    const len = varint(), end = pos + len;
    const L = { name: "", extent: 4096, keys: [], values: [], features: [] };
    while (pos < end) {
      const t2 = varint(), f2 = t2 >> 3, w2 = t2 & 7;
      if (f2 === 1 && w2 === 2) { const l = varint(); L.name = str(pos + l); pos += l; }
      else if (f2 === 3 && w2 === 2) { const l = varint(); L.keys.push(str(pos + l)); pos += l; }
      else if (f2 === 5 && w2 === 0) L.extent = varint();
      else if (f2 === 4 && w2 === 2) {
        const l = varint(), ve = pos + l; let v = null;
        while (pos < ve) {
          const t3 = varint(), f3 = t3 >> 3, w3 = t3 & 7;
          if (f3 === 1 && w3 === 2) { const l3 = varint(); v = str(pos + l3); pos += l3; }
          else if (f3 === 2 && w3 === 5) { v = new DataView(u8.buffer, u8.byteOffset + pos, 4).getFloat32(0, true); pos += 4; }
          else if (f3 === 3 && w3 === 1) { v = new DataView(u8.buffer, u8.byteOffset + pos, 8).getFloat64(0, true); pos += 8; }
          else if ((f3 === 4 || f3 === 5) && w3 === 0) v = varint();
          else if (f3 === 6 && w3 === 0) { const z = varint(); v = z % 2 ? -(z + 1) / 2 : z / 2; }
          else if (f3 === 7 && w3 === 0) v = !!varint();
          else skip(w3);
        }
        L.values.push(v);
      } else if (f2 === 2 && w2 === 2) {
        const l = varint(), fe = pos + l; const F = { type: 0, tags: [], geom: [] };
        while (pos < fe) {
          const t3 = varint(), f3 = t3 >> 3, w3 = t3 & 7;
          if (f3 === 2 && w3 === 2) { const l3 = varint(); F.tags = packed(pos + l3); }
          else if (f3 === 3 && w3 === 0) F.type = varint();
          else if (f3 === 4 && w3 === 2) { const l3 = varint(); F.geom = packed(pos + l3); }
          else skip(w3);
        }
        L.features.push(F);
      } else skip(w2);
    }
    pos = end;
    layers[L.name] = L;
  }
  /* decode geometry commands into rings/lines of [x, y] in tile units */
  for (const L of Object.values(layers)) {
    L.features = L.features.map((F) => {
      const props = {};
      for (let i = 0; i + 1 < F.tags.length; i += 2) props[L.keys[F.tags[i]]] = L.values[F.tags[i + 1]];
      const parts = []; let cur = null, x = 0, y = 0, i = 0;
      const g = F.geom;
      while (i < g.length) {
        const cmd = g[i] & 7, count = g[i] >> 3; i++;
        if (cmd === 7) { if (cur && cur.length) cur.push(cur[0]); continue; }
        for (let k = 0; k < count; k++) {
          const dx = g[i++], dy = g[i++];
          x += dx % 2 ? -(dx + 1) / 2 : dx / 2; y += dy % 2 ? -(dy + 1) / 2 : dy / 2;
          if (cmd === 1) { cur = [[x, y]]; parts.push(cur); } else cur.push([x, y]);
        }
      }
      return { type: F.type, props, parts };
    });
  }
  return layers;
}

async function streetMap(ctx, env) {
  const { mx0, my0, k } = ctx;
  let tilesUrl = `${SOURCES.tiles}/20261004_113936_pt/{z}/{x}/{y}.pbf`;
  try { const tj = await (await withTimeout(env, SOURCES.tiles, {}, 12000)).json(); if (tj.tiles && tj.tiles[0]) tilesUrl = tj.tiles[0]; } catch { /* keep the known build */ }
  const z = 14, n = 2 ** z, world = 2 * Math.PI * R_EARTH, tileM = world / n;
  const pad = (HALF + 30) * k;
  const tx0 = Math.floor((mx0 - pad + world / 2) / tileM), tx1 = Math.floor((mx0 + pad + world / 2) / tileM);
  const ty0 = Math.floor((world / 2 - (my0 + pad)) / tileM), ty1 = Math.floor((world / 2 - (my0 - pad)) / tileM);
  const roads = [], numbers = [];
  const jobs = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) jobs.push([tx, ty]);
  await pool(jobs, 4, async ([tx, ty]) => {
    const r = await withTimeout(env, tilesUrl.replace("{z}", z).replace("{x}", tx).replace("{y}", ty), {}, 15000);
    if (!r.ok) throw new Error(`street tile ${r.status}`);
    const layers = readTile(new Uint8Array(await r.arrayBuffer()));
    const toLocal = (L, p) => {
      const X = tx * tileM - world / 2 + p[0] / L.extent * tileM, Y = world / 2 - ty * tileM - p[1] / L.extent * tileM;
      return [(X - mx0) / k, (Y - my0) / k];
    };
    const tn = layers.transportation_name, tr = layers.transportation, hn = layers.housenumber;
    if (tn) for (const f of tn.features) if (f.type === 2 && f.props.name) for (const part of f.parts) roads.push({ name: f.props.name, cls: f.props.class, pts: part.map((p) => toLocal(tn, p)), named: true });
    if (tr) for (const f of tr.features) if (f.type === 2 && ["minor", "tertiary", "secondary", "primary", "trunk", "residential", "unclassified"].includes(f.props.class) && f.props.brunnel !== "tunnel") for (const part of f.parts) roads.push({ name: "", cls: f.props.class, pts: part.map((p) => toLocal(tr, p)), named: false });
    if (hn) for (const f of hn.features) if (f.type === 1) for (const part of f.parts) numbers.push({ num: String(f.props.housenumber), street: f.props["addr:street"] || f.props.street || "", at: toLocal(hn, part[0]) });
  });
  /* keep what touches the survey box */
  /* a long straight street can have no vertex anywhere near the house: test segments, not points */
  const B = HALF + 25;
  const near = (pts) => pts.some(([x, y], i) => {
    if (Math.abs(x) < B && Math.abs(y) < B) return true;
    const q = pts[i + 1]; if (!q) return false;
    return Math.max(x, q[0]) > -B && Math.min(x, q[0]) < B && Math.max(y, q[1]) > -B && Math.min(y, q[1]) < B;
  });
  return { roads: roads.filter((r) => r.pts.length > 1 && near(r.pts)), numbers: numbers.filter((h) => Math.abs(h.at[0]) < HALF && Math.abs(h.at[1]) < HALF) };
}

/* ------------------------------------------------------------------ 3. the lidar (Entwine Point Tiles of LAZ files) */
let lazPerfPromise = null;
async function lidar(ctx, env, onProgress) {
  const { mx0, my0, k } = ctx;
  const ept = await (await withTimeout(env, `${SOURCES.lidar}/ept.json`, {}, 20000)).json();
  const b = ept.bounds, cube = b[3] - b[0];
  const pad = (HALF + 4) * k, box = [mx0 - pad, my0 - pad, mx0 + pad, my0 + pad];
  /* skip the coarse levels: their few points add nothing at yard scale but cost a full file each */
  const minDepth = Math.max(0, Math.ceil(Math.log2(cube / k / 500)));
  const hier = new Map();
  const getHier = async (key) => { if (!hier.has(key)) hier.set(key, (await withTimeout(env, `${SOURCES.lidar}/ept-hierarchy/${key}.json`, {}, 20000)).json()); return hier.get(key); };
  const nodes = [];
  const walk = async (d, x, y, zz, h) => {
    const key = `${d}-${x}-${y}-${zz}`;
    if (!(key in h)) return;
    let count = h[key];
    if (count === -1) { h = await getHier(key); count = h[key]; }
    const w = cube / 2 ** d, x0 = b[0] + x * w, y0 = b[1] + y * w;
    if (x0 + w < box[0] || x0 > box[2] || y0 + w < box[1] || y0 > box[3]) return;
    if (d >= minDepth && count > 0) nodes.push(key);
    const kids = [];
    for (const dx of [0, 1]) for (const dy of [0, 1]) for (const dz of [0, 1]) kids.push(walk(d + 1, 2 * x + dx, 2 * y + dy, 2 * zz + dz, h));
    await Promise.all(kids);
  };
  await walk(0, 0, 0, 0, await getHier("0-0-0-0"));
  if (!nodes.length) throw new SurveyError("no-lidar", "There's no laser survey for this spot.");

  if (!lazPerfPromise) lazPerfPromise = env.lazPerf().catch((e) => { lazPerfPromise = null; throw e; });
  const LazPerf = await lazPerfPromise;
  let done = 0, bytes = 0;
  const chunks = await pool(nodes, 6, async (key) => {
    const r = await withTimeout(env, `${SOURCES.lidar}/ept-data/${key}.laz`, {}, 45000);
    if (!r.ok) throw new Error(`lidar tile ${r.status}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    bytes += buf.length; done++; onProgress && onProgress(done / nodes.length, bytes);
    return decodeLaz(LazPerf, buf, ctx, pad / k);
  });
  /* concatenate */
  const total = chunks.reduce((s, c) => s + c.n, 0);
  const P = { n: total, e: new Float32Array(total), nn: new Float32Array(total), z: new Float32Array(total), cls: new Uint8Array(total), inten: new Uint16Array(total), rn: new Uint8Array(total), nr: new Uint8Array(total) };
  let o = 0;
  for (const c of chunks) { for (const f of ["e", "nn", "z", "cls", "inten", "rn", "nr"]) P[f].set(c[f].subarray(0, c.n), o); o += c.n; }
  P.bytes = bytes; P.files = nodes.length;
  return P;
}

function decodeLaz(LazPerf, buf, ctx, halfTrue) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const fmt = dv.getUint8(104) & 0x3f;
  const sx = dv.getFloat64(131, true), sy = dv.getFloat64(139, true), sz = dv.getFloat64(147, true);
  const ox = dv.getFloat64(155, true), oy = dv.getFloat64(163, true), oz = dv.getFloat64(171, true);
  const filePtr = LazPerf._malloc(buf.length);
  LazPerf.HEAPU8.set(buf, filePtr);
  const las = new LazPerf.LASZip();
  try {
    las.open(filePtr, buf.length);
    const count = las.getCount(), len = las.getPointLength();
    const ptr = LazPerf._malloc(len);
    const out = { n: 0, e: new Float32Array(count), nn: new Float32Array(count), z: new Float32Array(count), cls: new Uint8Array(count), inten: new Uint16Array(count), rn: new Uint8Array(count), nr: new Uint8Array(count) };
    const wide = fmt >= 6;
    for (let i = 0; i < count; i++) {
      las.getPoint(ptr);
      const p = new DataView(LazPerf.HEAPU8.buffer, ptr, len);
      const E = (p.getInt32(0, true) * sx + ox - ctx.mx0) / ctx.k, N = (p.getInt32(4, true) * sy + oy - ctx.my0) / ctx.k;
      if (Math.abs(E) > halfTrue || Math.abs(N) > halfTrue) continue;
      const rb = p.getUint8(14);
      const cls = wide ? p.getUint8(16) : p.getUint8(15) & 31;
      if (cls === 7 || cls === 18) continue;   /* noise */
      const j = out.n++;
      out.e[j] = E; out.nn[j] = N; out.z[j] = p.getInt32(8, true) * sz + oz;
      out.inten[j] = p.getUint16(12, true); out.cls[j] = cls;
      out.rn[j] = wide ? rb & 15 : rb & 7; out.nr[j] = wide ? rb >> 4 : (rb >> 3) & 7;
    }
    LazPerf._free(ptr);
    return out;
  } finally { las.delete(); LazPerf._free(filePtr); }
}

/* ------------------------------------------------------------------ 4. the aerial photo */
async function aerial(ctx, env) {
  const { mx0, my0, k } = ctx;
  const h = HALF * k, px = Math.round(2 * HALF / 0.3);
  const params = new URLSearchParams({ bbox: `${mx0 - h},${my0 - h},${mx0 + h},${my0 + h}`, bboxSR: 3857, imageSR: 3857, size: `${px},${px}`, format: "jpg", compressionQuality: 90, interpolation: "RSP_BilinearInterpolation", f: "image" });
  const r = await withTimeout(env, `${SOURCES.naip}?${params}`, {}, 30000);
  if (!r.ok || !(r.headers.get("content-type") || "").includes("image")) throw new Error(`aerial ${r.status}`);
  const img = await env.decodeImage(new Uint8Array(await r.arrayBuffer()));
  return { w: img.width, h: img.height, rgba: img.data };
}

/* ------------------------------------------------------------------ the survey */
export async function survey(address, env, onStep = () => {}) {
  onStep("address", "active");
  const geo = await geocode(address, env);
  const nice = (t) => t.replace(/, \d{5}$/, "").replace(/\b([A-Z])([A-Z]+)\b/g, (m, a, b) => a + b.toLowerCase()).replace(/\bMi$/, "MI");
  if (geo.countyFips && geo.countyFips !== "26163") throw new SurveyError("out-of-area", `We only set up in Wayne County, Michigan, and ${nice(geo.matched)} is in ${geo.county || "another county"}.`);
  onStep("address", "done", geo.matched);
  const ctx = { lat: geo.lat, lon: geo.lon, mx0: mercX(geo.lon), my0: mercY(geo.lat), k: 1 / Math.cos(geo.lat * Math.PI / 180) };

  onStep("streets", "active"); onStep("lidar", "active"); onStep("photo", "active");
  const [streets, points, photo] = await Promise.all([
    streetMap(ctx, env).then((s) => { onStep("streets", "done", `${new Set(s.roads.filter((r) => r.named).map((r) => r.name)).size} streets`); return s; }, (e) => { onStep("streets", "fail"); console.warn("street map", e); return { roads: [], numbers: [] }; }),
    lidar(ctx, env, (f, bytes) => onStep("lidar", "progress", `${(bytes / 1048576).toFixed(1)} MB`, f)).then((p) => { onStep("lidar", "done", `${(p.n / 1000).toFixed(0)}k laser points`); return p; }),
    aerial(ctx, env).then((a) => { onStep("photo", "done"); return a; }, (e) => { onStep("photo", "fail"); console.warn("aerial photo", e); return null; }),
  ]);
  onStep("model", "active");
  const site = analyzeSite({ geo, ctx, streets, points, photo });
  const yard = buildYard(site, site.targetId);
  onStep("model", "done", `${site.buildings.length} buildings, ${site.trees.length} trees`);
  return { site, yard };
}

/* ================================================================== analysis */
export function analyzeSite({ geo, ctx, streets, points: P, photo }) {
  const N1 = Math.round(2 * HALF / DEM_CS);
  const idx1 = (e, n) => { const i = Math.floor((e + HALF) / DEM_CS), j = Math.floor((n + HALF) / DEM_CS); return i < 0 || j < 0 || i >= N1 || j >= N1 ? -1 : j * N1 + i; };

  /* --- ground: mean height of ground returns per metre, holes filled by diffusion --- */
  const gSum = new Float64Array(N1 * N1), gCnt = new Float32Array(N1 * N1);
  for (let i = 0; i < P.n; i++) if (P.cls[i] === 2) { const c = idx1(P.e[i], P.nn[i]); if (c >= 0) { gSum[c] += P.z[i]; gCnt[c]++; } }
  const dem = new Float32Array(N1 * N1); const known = new Uint8Array(N1 * N1);
  for (let c = 0; c < dem.length; c++) if (gCnt[c]) { dem[c] = gSum[c] / gCnt[c]; known[c] = 1; }
  if (!known.some(Boolean)) throw new SurveyError("no-ground", "The laser survey has no usable ground measurements here. Try another address or use a typical lawn.");
  fillHoles(dem, known, N1);
  smooth(dem, N1, 1);
  const demAt = (e, n) => bilinear(dem, N1, (e + HALF) / DEM_CS - .5, (n + HALF) / DEM_CS - .5);

  /* --- height above ground for every return, and per-metre object features --- */
  const hag = new Float32Array(P.n);
  const lastHigh = new Uint16Array(N1 * N1), lastLow = new Uint16Array(N1 * N1), firstHigh = new Uint16Array(N1 * N1), multiHigh = new Uint16Array(N1 * N1);
  const chm = new Float32Array(N1 * N1);
  for (let i = 0; i < P.n; i++) {
    const h = P.z[i] - demAt(P.e[i], P.nn[i]); hag[i] = h;
    const c = idx1(P.e[i], P.nn[i]); if (c < 0) continue;
    const last = P.rn[i] === P.nr[i], ground = P.cls[i] === 2 || h < .4;
    if (last && ground) lastLow[c]++;
    if (!ground && h > 2) {
      if (last) lastHigh[c]++;
      if (P.rn[i] === 1) firstHigh[c]++;
      if (P.nr[i] > 1) multiHigh[c]++;
      if (h > chm[c]) chm[c] = h;
    }
  }

  /* --- buildings: tall last returns that hide the ground (leaf-off trees let it through) --- */
  let bmask = new Uint8Array(N1 * N1);
  for (let c = 0; c < bmask.length; c++) bmask[c] = lastHigh[c] >= 1 && lastHigh[c] >= lastLow[c] ? 1 : 0;
  bmask = morph(bmask, N1, "close"); bmask = morph(bmask, N1, "open");
  const comps = components(bmask, N1);
  const buildings = [];
  for (const comp of comps) {
    if (comp.length < 12) continue;
    let multi = 0, high = 0;
    for (const c of comp) { multi += multiHigh[c]; high += firstHigh[c] + lastHigh[c]; }
    const cellSet = new Set(comp);
    const pts = [];
    for (let i = 0; i < P.n; i++) if (hag[i] > 1.6 && P.cls[i] !== 2 && cellSet.has(idx1(P.e[i], P.nn[i]))) pts.push([P.e[i], P.nn[i], hag[i], P.nr[i], P.cls[i]]);
    if (pts.length < 20) continue;
    const singleFrac = pts.filter((p) => p[3] === 1).length / pts.length;
    if (singleFrac < .55 && pts.filter((p) => p[4] === 6).length < 20) continue; /* explicit building returns outrank the canopy heuristic */
    if (pct(pts.map((p) => p[2]), .9) < 2.6) continue;       /* a car or a fence */
    buildings.push({ id: buildings.length, cells: comp, pts });
  }

  /* --- the street: centreline of the matched name nearest the address point --- */
  const named = streets.roads.filter((r) => r.named && streetKey(r.name) === geo.streetKey);
  const roadLines = named.length ? named : streets.roads;
  const nearestOn = (lines, x, y) => {
    let best = null;
    for (const r of lines) for (let i = 0; i + 1 < r.pts.length; i++) {
      const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1);
      const px = ax + t * dx, py = ay + t * dy, d = Math.hypot(x - px, y - py);
      if (!best || d < best.d) best = { d, x: px, y: py, tx: dx / Math.sqrt(L2), ty: dy / Math.sqrt(L2), road: r };
    }
    return best;
  };
  const addrOnStreet = nearestOn(roadLines, 0, 0);

  /* --- fit each building with rectangles and a roof, oriented to its street --- */
  const fitted = [];
  for (const bld of buildings) {
    const cx = bld.pts.reduce((s, p) => s + p[0], 0) / bld.pts.length, cy = bld.pts.reduce((s, p) => s + p[1], 0) / bld.pts.length;
    const st = nearestOn(streets.roads, cx, cy);
    /* Single returns and classified building returns: exclude unclassified overhanging branches. */
    const roofPts = bld.pts.filter((p) => p[3] === 1 || p[4] === 6);
    const { rects } = fitBuilding(roofPts.length >= 20 ? roofPts : bld.pts, st ? Math.atan2(st.ty, st.tx) : null);
    /* houses a few feet apart can share one blob: rectangles that don't touch are separate buildings */
    for (const group of groupRects(rects)) {
      const area = group.reduce((a, r) => a + r.len * r.wid, 0);
      const gx = group.reduce((a, r) => a + r.cx * r.len * r.wid, 0) / area, gy = group.reduce((a, r) => a + r.cy * r.len * r.wid, 0) / area;
      fitted.push({ id: fitted.length, rects: group, area, cx: gx, cy: gy });
    }
  }
  buildings.length = 0; buildings.push(...fitted);

  /* --- streets: width from the ground model where the gutter shows, else by road class --- */
  const demAtXY = (x, y) => demAt(x, y);
  const widths = { minor: 4.3, residential: 4.3, unclassified: 4.3, tertiary: 5.5, secondary: 7, primary: 9, trunk: 10 };
  const roads = streets.roads.map((r) => ({ ...r, half: widths[r.cls] || 4.3 }));
  const gutter = (st) => {
    /* the lowest line either side of the crown, 2.5 to 8 m out, averaged along 30 m of street */
    const nx = -st.ty, ny = st.tx, out = [];
    for (const sg of [1, -1]) {
      let best = null;
      for (let t = 2.5; t <= 8; t += .25) {
        const zs = [];
        for (let s = -15; s <= 15; s += 1) zs.push(demAtXY(st.x + st.tx * s + sg * nx * t, st.y + st.ty * s + sg * ny * t));
        const z = median(zs); if (!best || z < best.z) best = { t, z };
      }
      out.push(best.t);
    }
    return out;
  };
  let street = null;
  if (addrOnStreet) {
    const [g1, g2] = gutter(addrOnStreet);
    const half = clamp((g1 + g2) / 2 + .25, 3.2, 9);
    street = { name: addrOnStreet.road.name || geo.street, x: addrOnStreet.x, y: addrOnStreet.y, tx: addrOnStreet.tx, ty: addrOnStreet.ty, half, gutters: [g1, g2] };
    for (const r of roads) if (r.named && streetKey(r.name) === geo.streetKey) r.half = half;
  }

  /* --- trees: crown tops in the canopy height model away from roofs --- */
  const roofNear = dilate(bmask, N1, 1);
  const tchm = new Float32Array(N1 * N1);
  for (let c = 0; c < tchm.length; c++) tchm[c] = roofNear[c] ? 0 : (firstHigh[c] + multiHigh[c] > 0 ? chm[c] : 0);
  const trees = findTrees(tchm, N1, HALF, DEM_CS);

  /* --- surfaces at 0.5 m: lawn, paving, road --- */
  let surface = classifySurface({ P, hag, photo, buildings, roads, canopy: tchm, N1 });
  /* the street's real width: walk out from the centreline until open ground starts. Concrete
     streets read as paving, so this catches road the class width missed. */
  if (street) {
    const sAt = (x, y) => { const i = Math.floor((x + HALF) / surface.cs), j = Math.floor((y + HALF) / surface.cs); return i < 0 || j < 0 || i >= surface.n || j >= surface.n ? -1 : surface.cls[j * surface.n + i]; };
    const edge = (sign) => {
      const nx = -street.ty * sign, ny = street.tx * sign;
      for (let t = 2; t <= 11; t += .25) {
        let pv = 0, n = 0;
        for (let s = -26; s <= 26; s += .5) {
          const c = sAt(street.x + street.tx * s + nx * t, street.y + street.ty * s + ny * t);
          if (c < 0 || c === SURF.roof) continue;
          n++; if (c === SURF.pave || c === SURF.road) pv++;
        }
        if (n > 20 && pv / n < .5) return t - .125;
      }
      return null;
    };
    const e1 = edge(1), e2 = edge(-1);
    const g1 = e1 != null ? Math.max(street.gutters[0], e1) : street.gutters[0], g2 = e2 != null ? Math.max(street.gutters[1], e2) : street.gutters[1];
    street.gutters = [clamp(g1, 3, 9), clamp(g2, 3, 9)];
    street.half = clamp((street.gutters[0] + street.gutters[1]) / 2, 3.2, 9);
    for (const r of roads) if (r.named && streetKey(r.name) === geo.streetKey) r.half = street.half;
    surface = classifySurface({ P, hag, photo, buildings, roads, canopy: tchm, N1 });
  }
  /* driveways, walks and sidewalks are poured in rectangles square to the street */
  const paving = regularizePaving(surface, street ? Math.atan2(street.ty, street.tx) : 0);

  /* --- shrubs: low, rough clumps on unpaved ground --- */
  const shrubs = findShrubs({ P, hag, surface, roofNear, N1 });

  /* --- houses, and which one is the address --- */
  const houses = buildings.filter((b) => b.area >= 35 && b.area <= 650);
  const streetSide = (b) => {
    if (!addrOnStreet) return { perp: Math.hypot(b.cx, b.cy) };
    const st = nearestOn(roadLines, b.cx, b.cy);
    return { perp: st ? st.d : 99 };
  };
  const selection = selectAddressHouse(houses, geo, streets.numbers, addrOnStreet);
  const target = selection.target;
  /* the picker offers the houses that front the same street, in order along it */
  const along = (b) => (addrOnStreet ? (b.cx - addrOnStreet.x) * addrOnStreet.tx + (b.cy - addrOnStreet.y) * addrOnStreet.ty : b.cx);
  const fronting = houses.filter((b) => streetSide(b).perp < 40).sort((a, b) => along(a) - along(b));
  /* "osm": OpenStreetMap has this exact number here. "range": the Census only knows the block, so
     the house is the likeliest one for that number on that side, and the buyer should check it. */
  geo.matchedBy = selection.matchedBy;
  geo.matchedTargetId = target?.id ?? null;
  return {
    geo, half: HALF, demCs: DEM_CS, dem, n1: N1, surface, paving, buildings, trees, shrubs, roads, street,
    houses: (fronting.length ? fronting : houses).map((b) => b.id), targetId: target ? target.id : null,
    numbers: streets.numbers, photoOk: !!photo, photo, lidar: { points: P.n, bytes: P.bytes, files: P.files },
  };
}

/* Address points can be interpolated onto the road. Compare frontage and footprint distance,
   not just building centers (which favor shallow houses and detached garages).
   A number is exact evidence only when it lies on a plausible house on the correct street side. */
export function selectAddressHouse(houses, geo, numbers, street) {
  const distance = (p, b) => Math.min(...b.rects.map((r) => {
    const c = Math.cos(r.ang), s = Math.sin(r.ang), dx = p[0] - r.cx, dy = p[1] - r.cy;
    return Math.hypot(Math.max(0, Math.abs(dx * c + dy * s) - r.len / 2), Math.max(0, Math.abs(-dx * s + dy * c) - r.wid / 2));
  }));
  const wrongSide = (b) => geo.sideVec && (b.cx - (street?.x || 0)) * geo.sideVec[0] + (b.cy - (street?.y || 0)) * geo.sideVec[1] < -1;
  const markers = numbers.filter((h) => h.num === geo.number && (!h.street || streetKey(h.street) === geo.streetKey));
  const exact = new Map();
  for (const h of markers) for (const b of houses) {
    if (!wrongSide(b) && distance(h.at, b) <= .75) {
      const d = Math.hypot(h.at[0], h.at[1]);
      if (!exact.has(b.id) || d < exact.get(b.id).d) exact.set(b.id, { b, d });
    }
  }
  const confirmed = [...exact.values()].sort((a, b) => a.d - b.d);
  // Duplicate numbers on intersecting streets must not silently become an exact match.
  if (confirmed.length && (!confirmed[1] || confirmed[1].d - confirmed[0].d > 5)) return { target: confirmed[0].b, matchedBy: "osm" };
  const ranked = houses.map((b) => {
    const along = street ? Math.abs((b.cx - street.x) * street.tx + (b.cy - street.y) * street.ty) : 0;
    const depth = street ? Math.abs((b.cx - street.x) * -street.ty + (b.cy - street.y) * street.tx) : 0;
    return { b, score: distance([0, 0], b) + along * .65 + Math.max(0, depth - 25) * 1.5 + (wrongSide(b) ? 80 : 0) };
  }).sort((a, b) => a.score - b.score);
  return { target: ranked[0]?.b || null, matchedBy: "range" };
}

/* rectangles that touch (within 0.6 m) belong to the same building */
function groupRects(rects) {
  const corners = (r, grow) => {
    const c = Math.cos(r.ang), s = Math.sin(r.ang), L = r.len / 2 + grow, W = r.wid / 2 + grow;
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [r.cx + c * u * L - s * v * W, r.cy + s * u * L + c * v * W]);
  };
  const overlap = (a, b) => {
    const pa = corners(a, .3), pb = corners(b, .3);
    for (const poly of [pa, pb]) for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % 4], ax = -(y2 - y1), ay = x2 - x1;
      const pr = (P) => P.map(([x, y]) => x * ax + y * ay);
      const A = pr(pa), B = pr(pb);
      if (Math.max(...A) < Math.min(...B) || Math.max(...B) < Math.min(...A)) return false;
    }
    return true;
  };
  const groups = [], seen = new Set();
  rects.forEach((r, i) => {
    if (seen.has(i)) return;
    const g = [i]; seen.add(i);
    for (let k = 0; k < g.length; k++) rects.forEach((q, j) => { if (!seen.has(j) && overlap(rects[g[k]], q)) { seen.add(j); g.push(j); } });
    groups.push(g.map((j) => rects[j]));
  });
  return groups;
}

/* ------------------------------------------------------------------ raster helpers */
function bilinear(a, n, fx, fy) {
  fx = clamp(fx, 0, n - 1.001); fy = clamp(fy, 0, n - 1.001);
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const i = y0 * n + x0;
  return a[i] * (1 - tx) * (1 - ty) + a[i + 1] * tx * (1 - ty) + a[i + n] * (1 - tx) * ty + a[i + n + 1] * tx * ty;
}
function fillHoles(a, known, n) {
  /* push known values outward one ring at a time, averaging the known neighbours */
  if (!known.some(Boolean)) { a.fill(0); return; }
  let k = known.slice();
  for (let iter = 0; iter < 4 * n; iter++) {
    const next = k.slice(); let changed = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const c = y * n + x; if (k[c]) continue;
      let s = 0, m = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        const cc = yy * n + xx; if (k[cc]) { s += a[cc]; m++; }
      }
      if (m) { a[c] = s / m; next[c] = 1; changed++; }
    }
    k = next; if (!changed) break;
  }
}
function smooth(a, n, passes) {
  for (let p = 0; p < passes; p++) {
    const src = a.slice();
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0, m = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < n && yy < n) { s += src[yy * n + xx]; m++; } }
      a[y * n + x] = s / m;
    }
  }
}
function dilate(m, n, r) {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!m[y * n + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < n && yy < n) out[yy * n + xx] = 1; }
  }
  return out;
}
function erode(m, n, r) {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let ok = 1;
    for (let dy = -r; dy <= r && ok; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n || !m[yy * n + xx]) { ok = 0; break; } }
    out[y * n + x] = ok;
  }
  return out;
}
function morph(m, n, op) { return op === "close" ? erode(dilate(m, n, 1), n, 1) : dilate(erode(m, n, 1), n, 1); }
function components(m, n) {
  const seen = new Uint8Array(m.length), out = [];
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || seen[s]) continue;
    const comp = [], stack = [s]; seen[s] = 1;
    while (stack.length) {
      const c = stack.pop(); comp.push(c);
      const x = c % n, y = (c / n) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        const cc = yy * n + xx; if (m[cc] && !seen[cc]) { seen[cc] = 1; stack.push(cc); }
      }
    }
    out.push(comp);
  }
  return out;
}
const pointInRect = ([x, y], r) => {
  const c = Math.cos(r.ang), s = Math.sin(r.ang), dx = x - r.cx, dy = y - r.cy;
  return Math.abs(dx * c + dy * s) <= r.len / 2 && Math.abs(-dx * s + dy * c) <= r.wid / 2;
};

/* ------------------------------------------------------------------ buildings: rectangles and roofs */
export function fitBuilding(pts, streetAng) {
  /* orientation: the angle (mod 90°) whose bounding box hugs the roof points best */
  const ang0 = streetAng == null ? 0 : ((streetAng % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
  const boxFor = (a) => {
    const c = Math.cos(a), s = Math.sin(a), us = [], vs = [];
    for (const p of pts) { us.push(p[0] * c + p[1] * s); vs.push(-p[0] * s + p[1] * c); }
    const u0 = pct(us, .015), u1 = pct(us, .985), v0 = pct(vs, .015), v1 = pct(vs, .985);
    return { a, u0, u1, v0, v1, area: (u1 - u0) * (v1 - v0) };
  };
  let best = null;
  for (let d = 0; d < 90; d += 2) { const bx = boxFor(d * Math.PI / 180); if (!best || bx.area < best.area) best = bx; }
  /* snap to the street grid when it's close: houses are built square to their street */
  const diff = Math.abs(((best.a - ang0 + Math.PI / 4) % (Math.PI / 2) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4);
  if (streetAng != null && diff < 14 * Math.PI / 180) {
    const snapped = boxFor(ang0);
    if (snapped.area <= best.area * 1.025) best = snapped;
  }
  const a = best.a, c = Math.cos(a), s = Math.sin(a);
  /* Rasterise at 0.5 m and retain up to six substantial wings rather than flattening complex houses. */
  const cs = .5, nu = Math.max(1, Math.ceil((best.u1 - best.u0) / cs)), nv = Math.max(1, Math.ceil((best.v1 - best.v0) / cs));
  let grid = new Uint8Array(nu * nv);
  const pu = [], pv = [];
  for (const p of pts) {
    const u = p[0] * c + p[1] * s, v = -p[0] * s + p[1] * c; pu.push(u); pv.push(v);
    const i = Math.floor((u - best.u0) / cs), j = Math.floor((v - best.v0) / cs);
    if (i >= 0 && j >= 0 && i < nu && j < nv) grid[j * nu + i] = 1;
  }
  grid = closeRect(grid, nu, nv);
  const fill = grid.reduce((x, y) => x + y, 0) / grid.length;
  const rects = [];
  if (fill > .84) rects.push({ i0: 0, j0: 0, i1: nu, j1: nv });
  else {
    const g = grid.slice();
    for (let k = 0; k < 6; k++) {
      const r = maxRect(g, nu, nv);
      if (!r || (r.i1 - r.i0) * (r.j1 - r.j0) * cs * cs < (k ? 6 : 20)) break;
      if (k && Math.min(r.i1 - r.i0, r.j1 - r.j0) * cs < 2) break;
      rects.push(r);
      for (let j = r.j0; j < r.j1; j++) for (let i = r.i0; i < r.i1; i++) g[j * nu + i] = 0;
    }
    if (!rects.length) rects.push({ i0: 0, j0: 0, i1: nu, j1: nv });
  }
  const out = rects.map((r) => {
    const u0 = best.u0 + r.i0 * cs, u1 = best.u0 + r.i1 * cs, v0 = best.v0 + r.j0 * cs, v1 = best.v0 + r.j1 * cs;
    const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
    const hs = [], uu = [], vv = [];
    for (let i = 0; i < pts.length; i++) if (pu[i] >= u0 && pu[i] <= u1 && pv[i] >= v0 && pv[i] <= v1) { hs.push(pts[i][2]); uu.push(pu[i] - uc); vv.push(pv[i] - vc); }
    const L = u1 - u0, W = v1 - v0;
    /* keep the long side as "len" so roof ridges default along it */
    const long = L >= W;
    const rect = { cx: uc * c - vc * s, cy: uc * s + vc * c, ang: long ? a : a + Math.PI / 2, len: Math.max(L, W), wid: Math.min(L, W) };
    Object.assign(rect, fitRoof(hs, long ? uu : vv, long ? vv : uu.map((x) => -x), rect.len, rect.wid));
    return rect;
  });
  const area = out.reduce((s, r) => s + r.len * r.wid, 0);
  return { rects: out, area };
}
function closeRect(g, nu, nv) {
  const at = (i, j) => (i >= 0 && j >= 0 && i < nu && j < nv ? g[j * nu + i] : 0);
  const d = new Uint8Array(g.length), o = new Uint8Array(g.length);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { let v = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) v |= at(i + di, j + dj); d[j * nu + i] = v; }
  const atd = (i, j) => (i >= 0 && j >= 0 && i < nu && j < nv ? d[j * nu + i] : 1);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { let v = 1; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) v &= atd(i + di, j + dj); o[j * nu + i] = v; }
  return o;
}
function maxRect(g, nu, nv) {
  /* largest all-ones rectangle (histogram method) */
  const h = new Int32Array(nu); let best = null;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) h[i] = g[j * nu + i] ? h[i] + 1 : 0;
    const st = [];
    for (let i = 0; i <= nu; i++) {
      const cur = i < nu ? h[i] : 0;
      let start = i;
      while (st.length && st[st.length - 1][1] >= cur) {
        const [si, sh] = st.pop();
        const area = sh * (i - si);
        if (sh > 0 && (!best || area > best.area)) best = { area, i0: si, i1: i, j0: j - sh + 1, j1: j + 1 };
        start = si;
      }
      st.push([start, cur]);
    }
  }
  return best;
}
export function fitRoof(hs, us, vs, len, wid) {
  if (hs.length < 6) return { eave: 3, ridge: 5, roof: "gable" };
  const eave = Math.max(2.4, pct(hs, .12)), ridge = Math.max(eave + .2, pct(hs, .97));
  if (ridge - eave < .7) return { eave: Math.max(2.4, pct(hs, .6)), ridge: Math.max(2.4, pct(hs, .6)), roof: "flat" };
  const a = len / 2, b = wid / 2;
  const models = {
    gable: (u, v) => 1 - clamp(Math.abs(v) / b, 0, 1),
    "gable-cross": (u, v) => 1 - clamp(Math.abs(u) / a, 0, 1),
    hip: (u, v) => 1 - clamp(Math.max(Math.abs(v) / b, (Math.abs(u) - (a - b)) / b), 0, 1),
  };
  let best = { eave, ridge, roof: "gable" }, err = Infinity;
  for (const [name, f] of Object.entries(models)) {
    const weights = hs.map((h, i) => f(us[i], vs[i]));
    let low = eave, rise = ridge - eave, keep = hs.map((h, i) => i);
    // Robustly fit eave and ridge to the roof slopes; chimney/branch outliers are trimmed.
    for (let pass = 0; pass < 3; pass++) {
      let sw = 0, sh = 0, sww = 0, swh = 0;
      for (const i of keep) { const w = weights[i]; sw += w; sh += hs[i]; sww += w * w; swh += w * hs[i]; }
      const n = keep.length, det = n * sww - sw * sw;
      if (det < 1e-6) break;
      rise = clamp((n * swh - sw * sh) / det, .2, 12); low = Math.max(2.4, (sh - rise * sw) / n);
      const residuals = hs.map((h, i) => Math.abs(h - low - rise * weights[i]));
      const cutoff = Math.max(.12, pct(residuals, .85)); keep = keep.filter((i) => residuals[i] <= cutoff);
      if (keep.length < 6) break;
    }
    const e = median(hs.map((h, i) => Math.abs(h - low - rise * weights[i])));
    if (e < err - .03) { err = e; best = { eave: low, ridge: low + rise, roof: name }; }
  }
  return best;
}

/* ------------------------------------------------------------------ trees and shrubs */
function findTrees(chm, n, half, cs) {
  const sm = new Float32Array(chm.length);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let mx = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < n && yy < n) mx = Math.max(mx, chm[yy * n + xx]); }
    sm[y * n + x] = mx;
  }
  const tops = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const h = sm[y * n + x]; if (h < 3.5 || chm[y * n + x] < 2.5) continue;
    const r = Math.round(clamp(.15 * h + 1.5, 2, 4) / cs);
    let isMax = true;
    for (let dy = -r; dy <= r && isMax; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue; const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
      const v = sm[yy * n + xx]; if (v > h || (v === h && (yy * n + xx) < y * n + x)) { isMax = false; break; }
    }
    if (isMax) tops.push({ x: -half + (x + .5) * cs, y: -half + (y + .5) * cs, h, cells: 0 });
  }
  /* crown size: canopy cells above half the top's height go to their nearest top */
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = chm[y * n + x]; if (v < 2) continue;
    const px = -half + (x + .5) * cs, py = -half + (y + .5) * cs;
    let best = null, bd = 64;
    for (const t of tops) { const d = (t.x - px) ** 2 + (t.y - py) ** 2; if (d < bd && v > t.h * .45) { bd = d; best = t; } }
    if (best) best.cells++;
  }
  return tops.filter((t) => t.cells >= 3).map((t) => ({ x: t.x, y: t.y, h: t.h, r: clamp(Math.sqrt(t.cells * cs * cs / Math.PI) * 1.1, 1.3, 8) }));
}
function findShrubs({ P, hag, surface, roofNear, N1 }) {
  const NS = surface.n, cs = surface.cs;
  const cnt = new Uint16Array(N1 * N1), hmax = new Float32Array(N1 * N1);
  for (let i = 0; i < P.n; i++) {
    const h = hag[i]; if (h < .35 || h > 2.6 || P.cls[i] === 2) continue;
    const x = Math.floor((P.e[i] + HALF) / DEM_CS), y = Math.floor((P.nn[i] + HALF) / DEM_CS);
    if (x < 0 || y < 0 || x >= N1 || y >= N1) continue;
    const c = y * N1 + x; if (roofNear[c]) continue;
    const si = Math.floor((P.e[i] + HALF) / cs), sj = Math.floor((P.nn[i] + HALF) / cs);
    const s = surface.cls[sj * NS + si];
    if (s === SURF.pave || s === SURF.road) continue;      /* cars and bins on paving */
    cnt[c]++; hmax[c] = Math.max(hmax[c], h);
  }
  const m = new Uint8Array(N1 * N1); for (let c = 0; c < m.length; c++) m[c] = cnt[c] >= 2 ? 1 : 0;
  return components(m, N1).filter((comp) => comp.length >= 2 && comp.length <= 40).map((comp) => {
    let sx = 0, sy = 0, h = 0;
    for (const c of comp) { sx += c % N1; sy += (c / N1) | 0; h = Math.max(h, hmax[c]); }
    return { x: -HALF + (sx / comp.length + .5) * DEM_CS, y: -HALF + (sy / comp.length + .5) * DEM_CS, h: clamp(h, .5, 2.2), r: clamp(Math.sqrt(comp.length / Math.PI) * DEM_CS * .9, .5, 2.6) };
  });
}

/* ------------------------------------------------------------------ surfaces */
export const SURF = { lawn: 0, pave: 1, road: 2, bed: 3, roof: 4 };
function classifySurface({ P, hag, photo, buildings, roads, canopy, N1 }) {
  const H = HALF, cs = SURF_CS, n = Math.round(2 * H / cs);
  const cls = new Uint8Array(n * n);
  const X = (i) => -H + (i + .5) * cs;
  /* lidar ground intensity: the laser is its own light, so it has no shadows */
  const iSum = new Float32Array(n * n), iCnt = new Uint16Array(n * n);
  for (let i = 0; i < P.n; i++) {
    if (!(P.cls[i] === 2 || hag[i] < .25)) continue;
    const x = Math.floor((P.e[i] + H) / cs), y = Math.floor((P.nn[i] + H) / cs);
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    iSum[y * n + x] += P.inten[i]; iCnt[y * n + x]++;
  }
  const inten = new Float32Array(n * n), ik = new Uint8Array(n * n);
  for (let c = 0; c < inten.length; c++) if (iCnt[c]) { inten[c] = iSum[c] / iCnt[c]; ik[c] = 1; }
  fillHoles(inten, ik, n); smoothF(inten, n);
  /* photo greenness and brightness on the same grid */
  const green = new Float32Array(n * n), bright = new Float32Array(n * n);
  if (photo) {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const px = clamp(Math.floor((x + .5) / n * photo.w), 0, photo.w - 1), py = clamp(Math.floor((1 - (y + .5) / n) * photo.h), 0, photo.h - 1);
      const o = (py * photo.w + px) * 4, R = photo.rgba[o], G = photo.rgba[o + 1], B = photo.rgba[o + 2];
      green[y * n + x] = (2 * G - R - B) / Math.max(30, R + G + B) * 100; bright[y * n + x] = (R + G + B) / 3;
    }
    smoothF(green, n); smoothF(bright, n);
  }
  /* roofs, then streets from their centrelines */
  const roof = new Uint8Array(n * n);
  for (const b of buildings) for (const r of b.rects) {
    const ext = Math.max(r.len, r.wid) / 2 + 1;
    for (let y = Math.max(0, Math.floor((r.cy - ext + H) / cs)); y <= Math.min(n - 1, Math.ceil((r.cy + ext + H) / cs)); y++)
      for (let x = Math.max(0, Math.floor((r.cx - ext + H) / cs)); x <= Math.min(n - 1, Math.ceil((r.cx + ext + H) / cs)); x++)
        if (pointInRect([X(x), X(y)], r)) roof[y * n + x] = 1;
  }
  const road = new Uint8Array(n * n);
  for (const r of roads) for (let k = 0; k + 1 < r.pts.length; k++) {
    const [ax, ay] = r.pts[k], [bx, by] = r.pts[k + 1], L = Math.hypot(bx - ax, by - ay) || 1;
    const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - r.half - 1 + H) / cs)), x1 = Math.min(n - 1, Math.ceil((Math.max(ax, bx) + r.half + 1 + H) / cs));
    const y0 = Math.max(0, Math.floor((Math.min(ay, by) - r.half - 1 + H) / cs)), y1 = Math.min(n - 1, Math.ceil((Math.max(ay, by) + r.half + 1 + H) / cs));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = X(x), py = X(y), t = clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (L * L), 0, 1);
      if (Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay))) <= r.half) road[y * n + x] = 1;
    }
  }
  /* lawn or paving: two-cluster k-means on intensity, brightness and greenness over open ground.
     Each neighbourhood's grass and concrete differ, so the split adapts to this survey. */
  const feats = [];
  const norm = (arr) => { const v = []; for (let c = 0; c < arr.length; c += 2) if (!roof[c] && !road[c]) v.push(arr[c]); const lo = pct(v, .05), hi = pct(v, .95); return (x) => (x - lo) / Math.max(1e-6, hi - lo); };
  const nI = norm(inten), nB = photo ? norm(bright) : null, nG = photo ? norm(green) : null;
  const f = (c) => photo ? [nI(inten[c]), 1 - nB(bright[c]), nG(green[c])] : [nI(inten[c])];
  const canopyAt = (c) => { const x = Math.floor(X(c % n) + H), y = Math.floor(X((c / n) | 0) + H); return x >= 0 && y >= 0 && x < N1 && y < N1 && canopy[y * N1 + x] > 0; };
  for (let c = 0; c < cls.length; c += 3) if (!roof[c] && !road[c] && !canopyAt(c)) feats.push(f(c));
  const dim = feats[0] ? feats[0].length : 1;
  let lawnC = new Array(dim).fill(.75), paveC = new Array(dim).fill(.2);
  for (let it = 0; it < 12; it++) {
    const sl = new Array(dim).fill(0), sp = new Array(dim).fill(0); let nl = 0, np = 0;
    for (const v of feats) {
      const dl = v.reduce((a, x, i) => a + (x - lawnC[i]) ** 2, 0), dp = v.reduce((a, x, i) => a + (x - paveC[i]) ** 2, 0);
      if (dl <= dp) { nl++; v.forEach((x, i) => (sl[i] += x)); } else { np++; v.forEach((x, i) => (sp[i] += x)); }
    }
    if (nl) lawnC = sl.map((x) => x / nl); if (np) paveC = sp.map((x) => x / np);
  }
  const sep = Math.sqrt(lawnC.reduce((a, x, i) => a + (x - paveC[i]) ** 2, 0));
  for (let c = 0; c < cls.length; c++) {
    if (roof[c]) { cls[c] = SURF.roof; continue; }
    if (road[c]) { cls[c] = SURF.road; continue; }
    if (sep < .25) { cls[c] = SURF.lawn; continue; }       /* the survey can't tell them apart here */
    const v = f(c);
    const dl = v.reduce((a, x, i) => a + (x - lawnC[i]) ** 2, 0), dp = v.reduce((a, x, i) => a + (x - paveC[i]) ** 2, 0);
    /* under trees the photo sees leaves and the laser loses power: only call clear paving there */
    cls[c] = dp * (canopyAt(c) ? 2.2 : 1.15) < dl ? SURF.pave : SURF.lawn;
  }
  /* tidy speckle: 3x3 majority between lawn and paving, twice */
  for (let pass = 0; pass < 2; pass++) {
    const src = cls.slice();
    for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
      const c = y * n + x; if (src[c] !== SURF.lawn && src[c] !== SURF.pave) continue;
      let pv = 0, lv = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const v = src[c + dy * n + dx]; if (v === SURF.pave) pv++; else if (v === SURF.lawn) lv++; }
      cls[c] = pv > lv ? SURF.pave : SURF.lawn;
    }
  }
  return { cs, n, cls, inten, green: photo ? green : null, bright: photo ? bright : null, sep };
}
/* Rebuild the paving as rectangles, square to the street, so the model gets
   clean driveways and walks instead of classifier speckle. Updates surface.cls in place. */
function regularizePaving(surface, ang) {
  const { cs, n, cls } = surface, H = HALF;
  const c = Math.cos(ang), s = Math.sin(ang), rc = .25;
  const span = H * Math.SQRT2, m = Math.ceil(2 * span / rc);
  /* rotated grid: u along the street, v across it */
  const mask = new Uint8Array(m * m);
  const at = (u, v) => { const x = u * c - v * s, y = u * s + v * c; const i = Math.floor((x + H) / cs), j = Math.floor((y + H) / cs); return i < 0 || j < 0 || i >= n || j >= n ? -1 : cls[j * n + i]; };
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) mask[j * m + i] = at(-span + (i + .5) * rc, -span + (j + .5) * rc) === SURF.pave ? 1 : 0;
  const opened = dilate(erode(mask, m, 1), m, 1);
  const rects = [];
  for (const comp of components(opened, m)) {
    if (comp.length * rc * rc < 2) continue;
    let i0 = m, j0 = m, i1 = 0, j1 = 0;
    for (const k of comp) { const i = k % m, j = (k / m) | 0; i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); }
    const bw = i1 - i0 + 1, bh = j1 - j0 + 1, g = new Uint8Array(bw * bh);
    for (const k of comp) g[((k / m | 0) - j0) * bw + (k % m) - i0] = 1;
    let left = comp.length;
    for (let t = 0; t < 48 && left > comp.length * .08; t++) {
      const r = maxRect(g, bw, bh);
      if (!r || Math.min(r.i1 - r.i0, r.j1 - r.j0) * rc < .8 || r.area * rc * rc < 1.5) break;
      for (let j = r.j0; j < r.j1; j++) for (let i = r.i0; i < r.i1; i++) if (g[j * bw + i]) { g[j * bw + i] = 0; left--; }
      const u0 = -span + (i0 + r.i0) * rc, u1 = -span + (i0 + r.i1) * rc, v0 = -span + (j0 + r.j0) * rc, v1 = -span + (j0 + r.j1) * rc;
      const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2, L = u1 - u0, Wd = v1 - v0;
      rects.push({ cx: uc * c - vc * s, cy: uc * s + vc * c, ang, len: L, wid: Wd, along: L >= Wd });
    }
  }
  /* repaint the surface grid from the rectangles */
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i; if (cls[k] !== SURF.pave && cls[k] !== SURF.lawn) continue;
    const p = [-H + (i + .5) * cs, -H + (j + .5) * cs];
    cls[k] = rects.some((r) => pointInRect(p, r)) ? SURF.pave : SURF.lawn;
  }
  return rects;
}
function smoothF(a, n) {
  const s = a.slice();
  for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
    let t = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) t += s[(y + dy) * n + x + dx];
    a[y * n + x] = t / 9;
  }
}

/* ================================================================== the front yard */
/* Everything the builder and the 3D view need for one chosen house. The yard frame puts the
   street along +x (the viewer's right, standing in the street facing the house) and the
   house-to-street direction along +z, the same as the shape-picker lawn. Rows run from the
   house (row 0) toward the street. */
const rectCorners = (r, grow = 0) => {
  const c = Math.cos(r.ang), s = Math.sin(r.ang), L = r.len / 2 + grow, W = r.wid / 2 + grow;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [r.cx + c * u * L - s * v * W, r.cy + s * u * L + c * v * W]);
};
export function streetFrame(site, house) {
  const lines = site.roads.filter((r) => r.named && streetKey(r.name) === site.geo.streetKey);
  let q = null;
  for (const r of lines.length ? lines : site.roads) for (let i = 0; i + 1 < r.pts.length; i++) {
    const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const t = clamp(((house.cx - ax) * dx + (house.cy - ay) * dy) / L2, 0, 1), px = ax + t * dx, py = ay + t * dy, d = Math.hypot(house.cx - px, house.cy - py);
    if (!q || d < q.d) q = { d, x: px, y: py, tx: dx / Math.sqrt(L2), ty: dy / Math.sqrt(L2), half: r.half || 4.3 };
  }
  if (!q) {
    /* no street map: face the address point, square to the house */
    const r0 = house.rects[0], c = Math.cos(r0.ang), s = Math.sin(r0.ang);
    const ax = -house.cx, ay = -house.cy;
    const alongLen = Math.abs(ax * c + ay * s) < Math.abs(-ax * s + ay * c);
    const tx = alongLen ? c : -s, ty = alongLen ? s : c;
    const k = ax * -ty + ay * tx;
    q = { d: Math.abs(k), x: house.cx - ty * k, y: house.cy + tx * k, tx, ty, half: 4.3, guessed: true };
  }
  let nx = -q.ty, ny = q.tx;
  if ((q.x - house.cx) * nx + (q.y - house.cy) * ny < 0) { nx = -nx; ny = -ny; }
  return { q, nx, ny, rx: -ny, ry: nx };
}

export function buildYard(site, targetId) {
  const house = site.buildings.find((b) => b.id === targetId);
  if (!house) throw new SurveyError("no-house", "We couldn't pick out a house at that address in the survey.");
  const H = site.half;
  const { q, nx, ny, rx, ry } = streetFrame(site, house);
  const S = (x, y) => (x - q.x) * rx + (y - q.y) * ry;          /* along the street */
  const T = (x, y) => (x - q.x) * nx + (y - q.y) * ny;          /* toward the street; the house side is negative */
  const ptAt = (s, t) => [q.x + rx * s + nx * t, q.y + ry * s + ny * t];

  const corners = house.rects.flatMap((r) => rectCorners(r));
  const frontT = Math.max(...corners.map(([x, y]) => T(x, y)));
  const hs0 = Math.min(...corners.map(([x, y]) => S(x, y))), hs1 = Math.max(...corners.map(([x, y]) => S(x, y)));

  /* the road edge on our side: the gutter the ground model found, else the class width */
  const st = site.street;
  let roadHalf = q.half;
  if (st && st.gutters && !q.guessed) {
    /* gutters[0] lies on the street normal's + side, (-ty, tx); the house is on the -n side */
    const housePlus = (-nx) * (-st.ty) + (-ny) * st.tx > 0;
    roadHalf = clamp((housePlus ? st.gutters[0] : st.gutters[1]) + .2, 3, 9);
  }
  const curbT = -roadHalf;

  /* the sidewalk: a band of paving parallel to the street between the curb and the house */
  const surf = site.surface, ns = surf.n, cs = surf.cs;
  const surfAt = (x, y) => { const i = Math.floor((x + H) / cs), j = Math.floor((y + H) / cs); return i < 0 || j < 0 || i >= ns || j >= ns ? -1 : surf.cls[j * ns + i]; };
  const sMid = (hs0 + hs1) / 2, prof = [];
  for (let t = curbT - .5; t >= frontT + .5; t -= .25) {
    let pave = 0, n = 0;
    for (let s = sMid - 22; s <= sMid + 22; s += .5) {
      const [x, y] = ptAt(s, t); const c = surfAt(x, y);
      if (c < 0 || c === SURF.roof) continue;
      n++; if (c === SURF.pave || c === SURF.road) pave++;
    }
    prof.push({ t, frac: n ? pave / n : 0 });
  }
  /* bands of paving parallel to the street; the sidewalk is the first one in from the curb */
  const bands = [];
  for (let i = 0; i < prof.length; i++) {
    if (prof[i].frac < .5) continue;
    let j = i, sum = 0;
    while (j < prof.length && prof[j].frac >= .45) { sum += prof[j].frac; j++; }
    const outer = prof[i].t + .125, inner = prof[j - 1].t - .125, w = outer - inner;
    if (w >= .9 && w <= 2.8 && inner > frontT + 2) bands.push({ outer, inner, score: sum / (j - i) });
    i = j;
  }
  const walk = bands.find((b) => b.outer < curbT - .6) || bands[0] || null;
  let walkBand = walk;
  if (!walkBand && curbT - frontT > 8) walkBand = { outer: curbT - 2.2, inner: curbT - 3.7, guessed: true };

  /* the decorating grid: from just off the house front to the sidewalk (or to the city strip) */
  const MAX_ROWS = 24;
  const yardFar = walkBand ? walkBand.inner : curbT - 1.2;
  /* a deep lot keeps the squares nearest the street, where a display is seen */
  const yardNear = Math.max(frontT + .3, yardFar - MAX_ROWS * CELL_M);
  const yardDepth = Math.max(0, yardFar - yardNear);
  /* lot width: halfway to the neighbours on this side of the street, at most 8 m past the house */
  let left = hs0 - 8, right = hs1 + 8;
  for (const b of site.buildings) {
    if (b.id === house.id || b.area < 20) continue;
    const bc = b.rects.flatMap((r) => rectCorners(r)), bt = bc.map(([x, y]) => T(x, y));
    if (Math.max(...bt) > curbT) continue;                                  /* across the street */
    if (Math.abs(T(b.cx, b.cy) - T(house.cx, house.cy)) > 22) continue;     /* a garage out back */
    const bs = bc.map(([x, y]) => S(x, y)), b0 = Math.min(...bs), b1 = Math.max(...bs);
    if (b1 <= hs0 + .3) left = Math.max(left, (b1 + hs0) / 2);
    if (b0 >= hs1 - .3) right = Math.min(right, (b0 + hs1) / 2);
  }
  const cols = Math.min(Math.floor((right - left) / CELL_M), 34);
  if (cols < 4) throw new SurveyError("narrow-yard", "The estimated lawn is too narrow for a display. Check the selected house or use a typical lawn.");
  const rows = clamp(Math.floor(yardDepth / CELL_M), 0, MAX_ROWS);
  if (rows < SETBACK_ROWS + 1) throw new SurveyError("no-yard", "This house sits too close to the sidewalk for a front-yard display.");
  const gs0 = (left + right) / 2 - cols * CELL_M / 2;
  const cellS = (c) => gs0 + (c + .5) * CELL_M, cellT = (r) => yardNear + (r + .5) * CELL_M;

  const types = new Uint8Array(cols * rows), cellY = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const [x, y] = ptAt(cellS(c), cellT(r));
    let pave = 0, roof = 0;
    for (const du of [-.25, 0, .25]) for (const dv of [-.25, 0, .25]) {
      const s2 = surfAt(x + rx * du + nx * dv, y + ry * du + ny * dv);
      if (s2 === SURF.pave || s2 === SURF.road) pave++; else if (s2 === SURF.roof) roof++;
    }
    let type = CELL.ok;
    if (roof >= 3 || site.buildings.some((b) => b.rects.some((rr) => pointInRect([x, y], { ...rr, len: rr.len + .4, wid: rr.wid + .4 })))) type = CELL.house;
    else if (pave >= 5) type = CELL.pave;
    else if (site.trees.some((t) => Math.hypot(t.x - x, t.y - y) < .6)) type = CELL.tree;
    else if (site.shrubs.some((sb) => Math.hypot(sb.x - x, sb.y - y) < sb.r * .85)) type = CELL.bed;
    else if (r >= rows - SETBACK_ROWS) type = CELL.setback;
    types[r * cols + c] = type;
    cellY[r * cols + c] = demSample(site, x, y);
  }
  const [ox, oy] = ptAt((left + right) / 2, yardNear + rows * CELL_M / 2);
  const base = demSample(site, ox, oy);
  for (let i = 0; i < cellY.length; i++) cellY[i] -= base;
  const so = S(ox, oy), to = T(ox, oy);
  const lawnCells = types.reduce((a, t) => a + (t === CELL.ok ? 1 : 0), 0);
  return {
    address: site.geo.matched, street: (st && st.name) || site.geo.street, targetId: house.id,
    cols, rows, cellM: CELL_M, setbackRows: SETBACK_ROWS, types, cellY, lawnCells,
    /* survey (east, north) -> yard: x = (p - o)·r, z = (p - o)·n, y = height - base */
    frame: { ox, oy, rx, ry, nx, ny, base },
    /* street geometry in yard coordinates (z grows toward the street) */
    road: { curbZ: curbT - to, half: roadHalf, centreZ: -to },
    walk: walkBand ? { z0: walkBand.inner - to, z1: walkBand.outer - to, guessed: !!walkBand.guessed } : null,
    lot: { x0: left - so, x1: right - so },
    house: { x0: hs0 - so, x1: hs1 - so, frontZ: frontT - to },
    depthM: yardDepth, photoOk: site.photoOk,
  };
}

export const CELL = { ok: 0, setback: 1, pave: 2, tree: 3, bed: 4, house: 5 };
export function demSample(site, x, y) { return bilinear(site.dem, site.n1, (x + site.half) / site.demCs - .5, (y + site.half) / site.demCs - .5); }

/* ------------------------------------------------------------------ browser environment */
export function browserEnv() {
  return {
    fetch: (u, o) => fetch(u, o),
    jsonp: (url, ms = 20000) => new Promise((ok, fail) => {
      const cb = `__mlcGeo${Date.now()}${Math.floor(Math.random() * 1e6)}`;
      const s = document.createElement("script");
      const done = (fn, v) => { clearTimeout(t); delete window[cb]; s.remove(); fn(v); };
      const t = setTimeout(() => done(fail, new SurveyError("timeout", "The address lookup took too long. Try again in a minute.")), ms);
      window[cb] = (data) => done(ok, data);
      s.onerror = () => done(fail, new SurveyError("network", "We couldn't reach the address lookup. Check your connection and try again."));
      s.src = `${url}&format=jsonp&callback=${cb}`;
      document.head.appendChild(s);
    }),
    lazPerf: () => new Promise((ok, fail) => {
      if (window.createLazPerf) { window.createLazPerf().then(ok, fail); return; }
      const s = document.createElement("script");
      s.src = SOURCES.lazperf; s.async = true;
      s.onload = () => window.createLazPerf().then(ok, fail);
      s.onerror = () => fail(new SurveyError("network", "We couldn't load the survey reader. Check your connection and try again."));
      document.head.appendChild(s);
    }),
    decodeImage: async (bytes) => {
      const bmp = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
      const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(bmp, 0, 0);
      return { width: c.width, height: c.height, data: x.getImageData(0, 0, c.width, c.height).data };
    },
  };
}
