/* Midnight Lawn Co. — Lawn Builder 3D (Three.js r160, loaded on demand).
   Two worlds share one renderer:
   - a typical lawn built from the shape and size the buyer picked, and
   - a surveyed yard: the real ground, houses, roofs, trees and street around an address,
     modelled from public lidar and aerial data by js/yard-survey.js.
   Every placed piece stands up as a die-cut yard sign on wire stakes. Textured physical
   materials, two lighting rigs (morning, 2 AM) and five camera angles framed on the display.
   With `opts.edit` the surveyed yard is also the decorating surface: a grid of 2.5-ft squares
   draped over the real lawn, tap to place, drag a piece to move it. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { RGBELoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/RGBELoader.js";
import { demSample, SURF, CELL } from "./yard-survey.js";

/* Natural scene materials; the signs themselves retain the catalog's brand colors. */
const COLORS = {
  grass: 0x566c35, lawn: 0x627d3c, lawn2: 0x6b8443, walk: 0xc3c0b5, curb: 0xb2b0a7, road: 0x414449, dash: 0xe1c16a, drive: 0xb8b6aa,
  wall: 0xd8d2bc, trim: 0xf1efe6, roof: 0x494842, door: 0x34565b, glass: 0x52717e, trunk: 0x63503b, leaves: 0x354f26, leaves2: 0x53682f,
  pole: 0x43474a, chimney: 0x976954, nWall: 0xc2bbb0, nRoof: 0x62605a, joint: 0x99988f, curbTop: 0xa9a89f,
};
const HEX = (n) => "#" + n.toString(16).padStart(6, "0");
/* intensities are physical (r155+ lights): a sun of about pi lights a face at its full colour */
const TIMES = {
  day: { sky: 0xb5cedd, fog: [0xd6dfde, 45, 150], hemi: [0xd6e8ff, 0x737056, 2], sun: [0xffead1, 3.2], porch: 0, spot: 0, window: 0, stars: 0 },
  night: { sky: 0x10192b, fog: [0x152030, 32, 120], hemi: [0x9fb8e0, 0x303a27, .55], sun: [0xb8d0ef, .65], porch: 12, spot: 210, window: 1, stars: 1 },
};
const VIEW_ORDER = ["street", "close", "drive", "next", "above"];

/* ---------------- textures: die-cut yard signs with a white edge ---------------- */
const SIZE = 512;
/* SVG as an image is strict XML: keep the first of any repeated attribute, as inline HTML does */
const dedupeAttrs = (svg) => svg.replace(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")+)(\s*\/?)>/g, (m, tag, attrs, end) => {
  const seen = new Map();
  attrs.replace(/\s+([\w:-]+)="([^"]*)"/g, (x, k, v) => { if (!seen.has(k)) seen.set(k, v); return ""; });
  return `<${tag}${[...seen].map(([k, v]) => ` ${k}="${v}"`).join("")}${end}>`;
});
const loadImage = (svg) => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => ok(img); img.onerror = () => fail(new Error("decoration art failed to load"));
  svg = dedupeAttrs(svg);
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace("<svg ", `<svg width="${SIZE}" height="${SIZE}" `));
});
const cutout = (draw) => {
  /* draw the art, then a white silhouette around it (the coroplast edge), then the art again */
  const art = document.createElement("canvas"); art.width = art.height = SIZE;
  draw(art.getContext("2d"));
  const edge = document.createElement("canvas"); edge.width = edge.height = SIZE;
  const ex = edge.getContext("2d"); ex.drawImage(art, 0, 0); ex.globalCompositeOperation = "source-in"; ex.fillStyle = "#ffffff"; ex.fillRect(0, 0, SIZE, SIZE);
  const out = document.createElement("canvas"); out.width = out.height = SIZE;
  const ox = out.getContext("2d");
  for (let a = 0; a < 16; a++) ox.drawImage(edge, Math.cos(a / 16 * Math.PI * 2) * 7, Math.sin(a / 16 * Math.PI * 2) * 7);
  ox.drawImage(art, 0, 0);
  const tex = new THREE.CanvasTexture(out); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
};
/* yard letters: Chango, sized so its wide letters (M, W) still fit the sign */
const LETTER_FONT = '"Chango", "Host Grotesk", "Segoe UI", sans-serif';
const isLight = (hex) => { const n = parseInt(hex.slice(1), 16); return (.299 * (n >> 16) + .587 * ((n >> 8) & 255) + .114 * (n & 255)) / 255 > .8; };
const letterTexture = (ch, fill) => cutout((x) => {
  let size = SIZE * .66;
  x.font = `400 ${size}px ${LETTER_FONT}`;
  const w = x.measureText(ch).width;
  if (w > SIZE * .8) { size *= SIZE * .8 / w; x.font = `400 ${size}px ${LETTER_FONT}`; }
  x.textAlign = "center"; x.textBaseline = "alphabetic";
  const m = x.measureText(ch), y = SIZE / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  x.lineJoin = "round";
  if (isLight(fill)) { x.strokeStyle = "#2f3130"; x.lineWidth = 10; x.strokeText(ch, SIZE / 2, y); }
  x.fillStyle = fill; x.fillText(ch, SIZE / 2, y);
});
const artTexture = async (svg) => {
  const img = await loadImage(svg).catch((e) => { console.warn(e); return null; });
  return cutout((x) => { if (img) x.drawImage(img, SIZE * .06, SIZE * .06, SIZE * .88, SIZE * .88); else { x.fillStyle = "#ffffff"; x.beginPath(); x.roundRect(SIZE * .14, SIZE * .14, SIZE * .72, SIZE * .72, 24); x.fill(); } });
};

const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
};

/* Repeatable, local surface maps: no external texture requests or per-frame canvas work. */
const randomSource = (seed = 73) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
function surfaceMaps(disposables) {
  const maps = new Map();
  const get = (kind) => {
    if (maps.has(kind)) return maps.get(kind);
    const rand = randomSource(91 + kind.length);
    const texture = canvasTex(512, 512, (x, w, h) => {
      x.fillStyle = "#dededb"; x.fillRect(0, 0, w, h);
      const image = x.getImageData(0, 0, w, h);
      for (let i = 0; i < image.data.length; i += 4) {
        const v = 205 + Math.floor(rand() * 45);
        image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
      }
      x.putImageData(image, 0, 0);
      if (kind === "grass") {
        for (let i = 0; i < 14000; i++) {
          const a = rand() * w, b = rand() * h;
          x.strokeStyle = rand() > .5 ? "rgba(65,74,45,.22)" : "rgba(255,255,220,.3)";
          x.lineWidth = .7; x.beginPath(); x.moveTo(a, b); x.lineTo(a + rand() * 3 - 1.5, b - 2 - rand() * 6); x.stroke();
        }
      }
      if (kind === "siding" || kind === "roof") {
        const step = kind === "siding" ? 32 : 64;
        for (let y = 0; y < h; y += step) {
          x.fillStyle = "rgba(40,40,40,.28)"; x.fillRect(0, y, w, 2);
          x.fillStyle = "rgba(255,255,255,.65)"; x.fillRect(0, y + 2, w, 2);
          if (kind === "roof") {
            for (let a = (y / step % 2) * 64; a < w; a += 128) { x.fillStyle = "rgba(45,45,45,.22)"; x.fillRect(a, y, 2, step); }
          }
        }
      }
      if (kind === "bark") {
        for (let i = 0; i < 90; i++) { x.fillStyle = "rgba(35,30,25,.23)"; x.fillRect(rand() * w, rand() * h, 1 + rand() * 4, 20 + rand() * 150); }
      }
    });
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 8;
    const bump = texture.clone(); bump.colorSpace = THREE.NoColorSpace; bump.needsUpdate = true;
    disposables.push(texture, bump); const pair = { map: texture, bumpMap: bump, bumpScale: kind === "grass" ? .018 : .012 };
    maps.set(kind, pair); return pair;
  };
  const forColor = (color) => {
    if ([COLORS.grass, COLORS.lawn, COLORS.lawn2].includes(color)) return get("grass");
    if ([COLORS.wall, COLORS.nWall].includes(color)) return get("siding");
    if ([COLORS.roof, COLORS.nRoof].includes(color)) return get("roof");
    if (color === COLORS.trunk) return get("bark");
    if ([COLORS.walk, COLORS.drive, COLORS.curb, COLORS.road].includes(color)) return get("mineral");
    return {};
  };
  return { get, forColor };
}

/* Many small leaf clusters give a porous silhouette instead of a smooth ball canopy.
   One instanced draw per crown, shared geometry/texture; crown opacity still works in the editor. */
function vegetation({ mat, disposables }) {
  const leafMap = canvasTex(128, 128, (x) => {
    const rand = randomSource(9); x.clearRect(0, 0, 128, 128);
    for (let i = 0; i < 17; i++) {
      const v = 180 + Math.floor(rand() * 75); x.fillStyle = `rgb(${v},${v},${v})`;
      x.beginPath(); x.ellipse(15 + rand() * 98, 15 + rand() * 98, 5 + rand() * 6, 2 + rand() * 3, rand() * Math.PI, 0, Math.PI * 2); x.fill();
    }
  });
  const geo = new THREE.PlaneGeometry(1, 1); disposables.push(leafMap, geo);
  return (r, height, seed, count = 1000) => {
    const material = mat(0xffffff, { map: leafMap, alphaTest: .45, side: THREE.DoubleSide, roughness: .95 });
    const mesh = new THREE.InstancedMesh(geo, material, count);
    const rand = randomSource(seed), dummy = new THREE.Object3D(), color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2, v = rand() * 2 - 1, radius = Math.cbrt(rand());
      const horizontal = Math.sqrt(1 - v * v) * radius;
      dummy.position.set(Math.cos(theta) * horizontal * r, v * radius * height / 2, Math.sin(theta) * horizontal * r);
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI);
      dummy.scale.setScalar(r * (.24 + rand() * .22)); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      color.setHSL(.23 + rand() * .055, .27 + rand() * .2, .17 + rand() * .14); mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere(); disposables.push(mesh);
    return mesh;
  };
}

function plantGrass(ctx, m, groundAt) {
  const { W, Dp, cell, mat, scene, disposables } = ctx;
  const count = Math.min(18000, Math.ceil(W * Dp * 160));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([-.012, 0, 0, .012, 0, 0, .006, .065, -.008, -.006, .065, -.008, .025, .12, -.025], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 4]); geo.computeVertexNormals();
  const material = mat(0xffffff, { side: THREE.DoubleSide, roughness: 1 });
  const grass = new THREE.InstancedMesh(geo, material, count), dummy = new THREE.Object3D(), color = new THREE.Color(), rand = randomSource(482);
  let used = 0;
  for (let i = 0; i < count; i++) {
    const x = (rand() - .5) * W, z = (rand() - .5) * Dp, c = Math.floor((x + W / 2) / cell), r = Math.floor((z + Dp / 2) / cell);
    const type = m.survey ? m.survey.yard.types[r * m.cols + c] : CELL.ok;
    if (type !== CELL.ok && type !== CELL.setback) continue;
    if (!m.survey && m.shape === "corner" && c < m.cols - m.cornerSideCols && r < m.cornerHouseRows) continue;
    dummy.position.set(x, groundAt(x, z) + .006, z); dummy.rotation.y = rand() * Math.PI * 2;
    dummy.scale.set(.5 + rand() * .5, .18 + rand() * .22, 1); dummy.updateMatrix(); grass.setMatrixAt(used, dummy.matrix);
    color.setHSL(.23 + rand() * .055, .4 + rand() * .2, .13 + rand() * .1); grass.setColorAt(used++, color);
  }
  grass.count = used; grass.instanceMatrix.needsUpdate = true; if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  grass.receiveShadow = true; grass.computeBoundingSphere(); scene.add(grass); disposables.push(geo, grass);
}

/* ---------------- scene ---------------- */
export async function createLawnRender(canvas, m, opts = {}) {
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) throw new Error("WebGL unavailable");
  await Promise.all([document.fonts.load(`800 120px "Host Grotesk"`), document.fonts.load(`400 120px "Chango"`)]).catch(() => {});

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, .1, 400);
  const disposables = [];
  const surfaces = surfaceMaps(disposables);
  const mat = (color, extra = {}) => {
    const glass = color === COLORS.glass;
    const mm = new THREE.MeshStandardMaterial({ color, roughness: glass ? .16 : .9, metalness: glass ? .25 : 0, envMapIntensity: .25, ...surfaces.forColor(color), ...extra });
    disposables.push(mm); return mm;
  };
  const surfaceMat = (color, w, h) => {
    const mm = mat(color);
    for (const key of ["map", "bumpMap"]) if (mm[key]) {
      const t = mm[key].clone(); t.repeat.set(w / 2, h / 2); t.needsUpdate = true; disposables.push(t); mm[key] = t;
    }
    return mm;
  };
  // Pre-filtered sunrise reflections, locally shipped. Missing HDR never blocks the yard.
  const pmrem = new THREE.PMREMGenerator(renderer);
  let dayEnvironment = null;
  try {
    const hdr = await new RGBELoader().loadAsync(new URL("../assets/environments/spruit_sunrise_1k.hdr", import.meta.url).href);
    dayEnvironment = pmrem.fromEquirectangular(hdr); hdr.dispose(); disposables.push(dayEnvironment);
  } catch { /* hemisphere and sun remain the complete lighting fallback */ }
  pmrem.dispose();
  const add = (geo, material, { x = 0, y = 0, z = 0, cast = false, receive = true, ry = 0, parent = scene } = {}) => {
    disposables.push(geo);
    const mesh = new THREE.Mesh(geo, material); mesh.position.set(x, y, z); mesh.rotation.y = ry;
    mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); return mesh;
  };
  const flat = (geo, material, at) => { const mesh = add(geo, material, at); mesh.rotation.x = -Math.PI / 2; return mesh; };

  const cell = m.cellM, W = m.cols * cell, Dp = m.rows * cell;
  const X = (c) => (c + .5) * cell - W / 2, Z = (r) => (r + .5) * cell - Dp / 2;
  const ctx = { scene, mat, surfaceMat, surfaces, add, flat, disposables, cell, W, Dp, X, Z };
  ctx.foliage = vegetation(ctx);
  const world = m.survey ? buildSurveyed(ctx, m, opts) : buildTypical(ctx, m);
  const groundAt = world.groundAt;
  plantGrass(ctx, m, groundAt);
  let sceneDirty = true, shadowsDirty = true, animationUntil = 0;

  /* sky lights */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x82cc5c, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sh = world.shadowHalf || 22;
  Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, near: 1, far: 120 });
  sun.shadow.bias = -.0006;
  sun.shadow.normalBias = .025;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const starGeo = new THREE.BufferGeometry();
  const pts = []; for (let i = 0; i < 500; i++) { const t = Math.random() * Math.PI * 2, p = Math.random() * .45; pts.push(Math.cos(t) * Math.cos(p) * 150, 20 + Math.sin(p) * 120, Math.sin(t) * Math.cos(p) * 150); }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: .6, sizeAttenuation: true, transparent: true, opacity: 0, fog: false });
  disposables.push(starGeo, starMat); scene.add(new THREE.Points(starGeo, starMat));

  /* ---------------- the pieces: die-cut signs on wire stakes, facing the street ---------------- */
  const stakeMat = mat(0x8a8d89, { metalness: .75, roughness: .35 });
  const stakeGeo = new THREE.CylinderGeometry(.006, .006, .32, 6); disposables.push(stakeGeo);
  const lift = .12;
  const texCache = new Map(), pieceMeshes = new Map();
  const pieceSig = (p) => (p.kind === "letter" ? `L${p.ch}${p.fill}` : `I${p.id}`);
  const textureFor = async (p) => {
    const sig = pieceSig(p);
    if (!texCache.has(sig)) texCache.set(sig, p.kind === "letter" ? Promise.resolve(letterTexture(p.ch, p.fill)) : artTexture(p.svg));
    return texCache.get(sig);
  };
  const makePiece = async (p) => {
    const tex = await textureFor(p);
    const sign = new THREE.MeshStandardMaterial({ map: tex, roughness: .72, envMapIntensity: .25, alphaTest: .5, side: THREE.DoubleSide });
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: .5 });
    const size = p.kind === "letter" ? p.h * 1.12 : p.h;
    const geo = new THREE.PlaneGeometry(size, size);
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(geo, sign);
    mesh.customDepthMaterial = depth; mesh.castShadow = true; mesh.receiveShadow = false;
    mesh.position.y = lift + size / 2;
    g.add(mesh);
    [-.18, .18].forEach((dx) => { const s = new THREE.Mesh(stakeGeo, stakeMat); s.position.set(dx * size, lift / 2 + .02, -.01); s.castShadow = true; g.add(s); });
    g.userData = { sig: pieceSig(p), size, dispose: () => { sign.dispose(); depth.dispose(); geo.dispose(); } };
    mesh.userData.pieceKey = `${p.c},${p.r}`;
    return g;
  };
  const placeGroup = (g, c, r) => {
    const jitter = ((c * 7 + r * 13) % 9 - 4) * .012;
    g.position.set(X(c), groundAt(X(c), Z(r)), Z(r)); g.rotation.y = jitter;
    g.children[0].userData.pieceKey = `${c},${r}`;
  };
  let pieceList = m.pieces || [];
  let pieceJob = Promise.resolve();
  const setPieces = (list, { plant = [] } = {}) => {
    pieceList = list;
    pieceJob = pieceJob.then(async () => {
      const want = new Map(list.map((p) => [`${p.c},${p.r}`, p]));
      for (const [k, g] of pieceMeshes) {
        const p = want.get(k);
        if (!p || pieceSig(p) !== g.userData.sig) { scene.remove(g); g.userData.dispose(); pieceMeshes.delete(k); }
      }
      for (const [k, p] of want) {
        if (pieceMeshes.has(k)) continue;
        const g = await makePiece(p); placeGroup(g, p.c, p.r); scene.add(g); pieceMeshes.set(k, g);
        if (plant.includes(k) && window.gsap && !opts.reduceMotion) window.gsap.from(g.position, { y: g.position.y + .6, duration: .45, ease: "back.out(2)" });
      }
      sceneDirty = shadowsDirty = true;
      if (plant.length && !opts.reduceMotion) animationUntil = performance.now() + 600;
    });
    return pieceJob;
  };
  await setPieces(pieceList);

  /* where the decorations are: every view frames this patch */
  const focus = new THREE.Vector3(); let spanW = 3;
  const frameDisplay = () => {
    const px = pieceList.map((p) => X(p.c)), pz = pieceList.map((p) => Z(p.r));
    const bx = px.length ? [Math.min(...px) - cell / 2, Math.max(...px) + cell / 2] : [-W / 2, W / 2];
    const bz = pz.length ? [Math.min(...pz) - cell / 2, Math.max(...pz) + cell / 2] : [-Dp / 2, Dp / 2 - m.setbackRows * cell];
    /* depth: the average row, so a stray piece near the street doesn't pull the camera off the message */
    const fz = pz.length ? pz.reduce((a, b) => a + b, 0) / pz.length : (bz[0] + bz[1]) / 2, fx = (bx[0] + bx[1]) / 2;
    focus.set(fx, groundAt(fx, fz) + .3, fz);
    spanW = Math.max(bx[1] - bx[0], 3);
  };
  frameDisplay();

  /* 2 AM: a warm pool of street light over the display so its colours still read */
  const spot = new THREE.SpotLight(0xffe7b8, 0, 0, Math.PI / 5, .85, 2);
  spot.position.copy(world.lampPos);
  spot.target.position.copy(focus);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0008;
  scene.add(spot, spot.target);
  const aimSpot = () => { spot.target.position.copy(focus); spot.angle = Math.min(Math.PI / 3, Math.atan2(spanW / 2 + 1.5, spot.position.distanceTo(focus)) + .12); };
  aimSpot();

  /* ---------------- views and times ---------------- */
  const halfH = () => Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
  const reach = (width) => width / 2 / Math.tan(halfH());           /* distance at which `width` fills the frame */
  const orbitFrom = (c, dist, pitchDeg, yawDeg) => {
    const p = THREE.MathUtils.degToRad(pitchDeg), y = THREE.MathUtils.degToRad(yawDeg);
    return { pos: [c.x + Math.sin(y) * Math.cos(p) * dist, c.y + Math.sin(p) * dist, c.z + Math.cos(y) * Math.cos(p) * dist], target: [c.x, c.y, c.z] };
  };
  const orbit = (dist, pitchDeg, yawDeg) => orbitFrom(focus, dist, pitchDeg, yawDeg);
  /* the whole decorating grid, seen from the street side */
  const gridFocus = () => new THREE.Vector3(0, groundAt(0, 0) + .2, 0);
  const gridReach = (k) => Math.max(reach(W / k), reach(Dp * 1.6 / k) * .8);
  const VIEWS = {
    street: () => orbit(reach(spanW / .75), 21, 0),                   /* from across the street, display at 75% of the frame */
    close: () => orbit(reach(Math.max(4, spanW * (camera.aspect < 1.5 ? .45 : .62))), 26, 0),   /* standing on the sidewalk */
    drive: () => orbit(reach(spanW / .8), 22, 42),                    /* from the driveway side */
    next: () => orbit(reach(spanW / .8), 22, -42),                    /* from next door */
    above: () => orbit(reach(Math.max(spanW, W) / .85) * 1.05, 62, 0),
    overhead: () => orbitFrom(gridFocus(), gridReach(.86), 56, 0),     /* decorating: the whole grid from above the street */
    curb: () => orbitFrom(gridFocus(), gridReach(.9), 24, 0),          /* decorating: eye level from the street */
    survey: () => (world.surveyView ? world.surveyView(reach) : orbit(30, 40, 0)),
  };
  const target = new THREE.Vector3();
  const tween = (obj, to, instant) => {
    const G = window.gsap;
    if (instant || opts.reduceMotion || !G) { Object.assign(obj, to); return; }
    G.to(obj, { ...to, duration: .9, ease: "power2.inOut", overwrite: true });
  };
  const camState = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 };
  const applyCam = () => { camera.position.set(camState.px, camState.py, camState.pz); target.set(camState.tx, camState.ty, camState.tz); camera.lookAt(target); };
  let current = opts.view || "street";
  const setView = (name, instant) => {
    sceneDirty = true;
    current = VIEWS[name] ? name : "street";
    const v = VIEWS[current]();
    tween(camState, { px: v.pos[0], py: v.pos[1], pz: v.pos[2], tx: v.target[0], ty: v.target[1], tz: v.target[2] }, instant);
    if (instant) applyCam();
  };
  const light = { hemi: 0, sun: 0, porch: 0, spot: 0, window: 0, stars: 0 };
  const setTime = (name, instant) => {
    sceneDirty = shadowsDirty = true;
    const t = TIMES[name] || TIMES.day;
    scene.background = new THREE.Color(t.sky);
    scene.environment = name === "night" ? null : dayEnvironment && dayEnvironment.texture;
    scene.fog = new THREE.Fog(t.fog[0], t.fog[1] * (world.fogScale || 1), t.fog[2] * (world.fogScale || 1));
    hemi.color.set(t.hemi[0]); hemi.groundColor.set(t.hemi[1]); sun.color.set(t.sun[0]);
    sun.position.set(name === "night" ? -12 : -18, name === "night" ? 22 : 16, name === "night" ? 8 : 12);
    tween(light, { hemi: t.hemi[2], sun: t.sun[1], porch: t.porch, spot: t.spot, window: t.window, stars: t.stars }, instant);
  };

  /* ---------------- pointer: walk around the display, or (editing) place and move pieces ---------------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const toNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  const edit = opts.edit && world.grid ? world.grid : null;
  const cellAtPointer = (e) => {
    toNdc(e);
    /* a standing sign is hit before the lawn behind it */
    const signs = [...pieceMeshes.values()].map((g) => g.children[0]);
    const hitSign = ray.intersectObjects(signs, false)[0];
    if (hitSign) { const [c, r] = hitSign.object.userData.pieceKey.split(",").map(Number); return { c, r, piece: true }; }
    if (!edit) return null;
    const hit = ray.intersectObject(edit.pickMesh, false)[0];
    if (!hit) return null;
    const c = Math.floor((hit.point.x + W / 2) / cell), r = Math.floor((hit.point.z + Dp / 2) / cell);
    return c >= 0 && r >= 0 && c < m.cols && r < m.rows ? { c, r, piece: pieceMeshes.has(`${c},${r}`) } : null;
  };
  let drag = null, pinch = null;
  const touches = new Map();
  const camDist = () => Math.hypot(camState.px - camState.tx, camState.py - camState.ty, camState.pz - camState.tz);
  const zoomTo = (d) => {
    const dx = camState.px - camState.tx, dy = camState.py - camState.ty, dz = camState.pz - camState.tz, k = Math.max(4, Math.min(70, d)) / camDist();
    camState.px = camState.tx + dx * k; camState.py = camState.ty + dy * k; camState.pz = camState.tz + dz * k;
  };
  const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  const onDown = (e) => {
    if (e.button && e.button !== 0) return;
    sceneDirty = shadowsDirty = true;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (edit && touches.size === 2) {
      /* two fingers: pinch to zoom; any drag in progress is dropped where it started */
      if (drag && drag.piece) { const [fc, fr] = drag.piece.split(",").map(Number); const g = pieceMeshes.get(drag.piece); if (g) placeGroup(g, fc, fr); }
      drag = null; pinch = { d: spread(), dist: camDist() }; window.gsap && window.gsap.killTweensOf(camState); return;
    }
    const at = edit ? cellAtPointer(e) : null;
    drag = { x: e.clientX, y: e.clientY, moved: false, at, piece: at && at.piece ? `${at.c},${at.r}` : null,
      ang: Math.atan2(camState.px - camState.tx, camState.pz - camState.tz), rad: Math.hypot(camState.px - camState.tx, camState.pz - camState.tz),
      pitch: Math.atan2(camState.py - camState.ty, Math.hypot(camState.px - camState.tx, camState.pz - camState.tz)), dist: Math.hypot(camState.px - camState.tx, camState.py - camState.ty, camState.pz - camState.tz) };
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    sceneDirty = true;
    if (drag?.piece) shadowsDirty = true;
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) { if (touches.size === 2) zoomTo(pinch.dist * pinch.d / spread()); return; }
    if (edit && !drag) { const at = cellAtPointer(e); edit.hover(at); canvas.style.cursor = !at ? "" : at.piece ? "grab" : world.cellType(at.c, at.r) === CELL.ok ? "pointer" : "not-allowed"; return; }
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;   /* a tap, not a drag */
    drag.moved = true;
    if (drag.piece) {
      const at = cellAtPointer(e); edit.hover(at, true);
      const g = pieceMeshes.get(drag.piece);
      if (g && at) { g.position.set(X(at.c), groundAt(X(at.c), Z(at.r)) + .08, Z(at.r)); }
      canvas.style.cursor = "grabbing";
      return;
    }
    window.gsap && window.gsap.killTweensOf(camState);
    const ang = Math.max(-1.25, Math.min(1.25, drag.ang - (e.clientX - drag.x) * .006));
    if (edit) {
      /* editing: drag also tilts between overhead and street level */
      const pitch = Math.max(.25, Math.min(1.35, drag.pitch + (e.clientY - drag.y) * .005));
      const hz = Math.cos(pitch) * drag.dist;
      camState.px = camState.tx + Math.sin(ang) * hz; camState.pz = camState.tz + Math.cos(ang) * hz; camState.py = camState.ty + Math.sin(pitch) * drag.dist;
    } else { camState.px = camState.tx + Math.sin(ang) * drag.rad; camState.pz = camState.tz + Math.cos(ang) * drag.rad; }
  };
  const onUp = (e) => {
    sceneDirty = shadowsDirty = true;
    touches.delete(e.pointerId);
    if (pinch) { if (touches.size < 2) pinch = null; return; }
    if (!drag) return;
    const d = drag; drag = null; canvas.style.cursor = "";
    if (!edit) return;
    if (d.piece && d.moved) {
      const at = cellAtPointer(e); const [fc, fr] = d.piece.split(",").map(Number);
      const g = pieceMeshes.get(d.piece); if (g) placeGroup(g, fc, fr);   /* the builder decides; it re-renders */
      if (at) opts.onPieceMove && opts.onPieceMove(d.piece, at.c, at.r);
      edit.hover(null);
      return;
    }
    if (!d.moved && d.at) opts.onCellClick && opts.onCellClick(d.at.c, d.at.r);
  };
  const onLeave = () => { if (edit && !drag) { edit.hover(null); canvas.style.cursor = ""; sceneDirty = true; } };
  const onWheel = (e) => {
    if (!edit) return;
    e.preventDefault();
    window.gsap && window.gsap.killTweensOf(camState);
    zoomTo(camDist() * Math.exp(e.deltaY * .0012));
  };
  const onClickPick = (e) => {
    if (!opts.onPickHouse || !world.houseMeshes) return;
    toNdc(e);
    const hit = ray.intersectObjects(world.houseMeshes, false)[0];
    if (hit) opts.onPickHouse(hit.object.userData.houseId);
  };
  canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onUp); canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("click", onClickPick);

  /* ---------------- size + loop ---------------- */
  const fit = () => {
    const w = canvas.clientWidth || 800, h = canvas.clientHeight || 450;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    sceneDirty = true;
  };
  const ro = new ResizeObserver(() => { fit(); setView(current, true); }); ro.observe(canvas); fit();
  const v3 = new THREE.Vector3();
  let shadowLight = "";
  const draw = () => {
    hemi.intensity = light.hemi; sun.intensity = light.sun; spot.intensity = light.spot;
    world.setNight(light.window, light.porch);
    starMat.opacity = light.stars * .9;
    applyCam();
    const crownChanged = world.tick && world.tick(camera, target);
    const shadowState = `${light.sun},${light.spot}`;
    renderer.shadowMap.needsUpdate = shadowsDirty || crownChanged || shadowState !== shadowLight || performance.now() < animationUntil;
    shadowsDirty = false; shadowLight = shadowState;
    if (opts.marker && world.markerAt) {
      const p = world.markerAt();
      if (p) {
        v3.copy(p).project(camera); const r = canvas.getBoundingClientRect();
        const mx = Math.max(70, Math.min(r.width - 70, (v3.x + 1) / 2 * r.width)), my = Math.max(58, Math.min(r.height - 16, (1 - v3.y) / 2 * r.height));
        opts.marker.style.transform = `translate(${mx}px, ${my}px)`; opts.marker.hidden = v3.z > 1;
      }
    }
    renderer.render(scene, camera);
  };
  // Static yards need no continuous GPU work. Camera/light tweens and planting still redraw.
  let raf = 0, lastState = "";
  const loop = () => {
    const state = Object.values(camState).join(",") + Object.values(light).join(",");
    if (document.visibilityState !== "hidden" && (sceneDirty || state !== lastState || performance.now() < animationUntil)) {
      draw(); lastState = state; sceneDirty = false;
    }
    raf = requestAnimationFrame(loop);
  };
  const onVisible = () => { sceneDirty = shadowsDirty = true; };
  document.addEventListener("visibilitychange", onVisible);
  loop();

  /* the photo strip: one still per angle, alternating morning and 2 AM, each marked as an illustration */
  const NAMES = { street: "Street", close: "Up close", drive: "Driveway side", next: "Next door", above: "Above" };
  const shots = async () => {
    await pieceJob;
    const out = [];
    const small = document.createElement("canvas");
    for (const [i, view] of VIEW_ORDER.entries()) {
      const time = i % 2 ? "night" : "day";
      setTime(time, true); setView(view, true); draw();
      small.width = 480; small.height = Math.round(480 * canvas.height / canvas.width);
      const x = small.getContext("2d");
      x.drawImage(canvas, 0, 0, small.width, small.height);
      x.font = '600 13px "Host Grotesk", "Segoe UI", sans-serif';
      const tag = m.survey ? "Model from survey data" : "Illustration", tw = x.measureText(tag).width + 16;
      x.fillStyle = "rgba(255,255,255,.92)"; x.beginPath(); x.roundRect(8, small.height - 30, tw, 22, 11); x.fill();
      x.fillStyle = "#2f3130"; x.fillText(tag, 16, small.height - 14);
      out.push({ view, time, label: `${NAMES[view]}, ${time === "day" ? "morning" : "2 AM"}`, url: small.toDataURL("image/jpeg", .86) });
    }
    return out;
  };

  if (world.intro && !opts.reduceMotion && window.gsap) {
    const duration = world.intro(window.gsap) || 0;
    animationUntil = performance.now() + duration + 100;
  }

  return {
    setView, setTime, shots,
    setPieces: (list, o) => { const job = setPieces(list, o); job.then(() => { frameDisplay(); aimSpot(); }); return job; },
    setFocusCell: (c, r) => { if (edit) edit.focus(c == null ? null : { c, r }); sceneDirty = true; },
    setTarget: (id, y) => { if (world.setTarget) world.setTarget(id, y); sceneDirty = shadowsDirty = true; },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
      canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp); canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel); canvas.removeEventListener("click", onClickPick);
      canvas.style.cursor = "";
      pieceMeshes.forEach((g) => g.userData.dispose());
      texCache.forEach((t) => t.then((tt) => tt.dispose()));
      scene.traverse((o) => { if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose(); });
      disposables.forEach((d) => d.dispose && d.dispose());
      renderer.dispose();
    },
  };
}

/* ======================================================================= the typical lawn */
function buildTypical({ scene, mat, surfaceMat, foliage, add, flat, W, Dp, cell }, m) {
  const front = Dp / 2;                         /* street side of the lawn */
  const corner = m.shape === "corner";
  const sideW = corner ? m.cornerSideCols * cell : 0;

  /* ground, lawn, sidewalk, city strip, curb, road (as in the aerial view: drive on the right) */
  flat(new THREE.PlaneGeometry(220, 220), surfaceMat(COLORS.grass, 220, 220), { y: -.002 });
  flat(new THREE.PlaneGeometry(W, Dp), surfaceMat(COLORS.lawn, W, Dp), { y: .003 });
  add(new THREE.BoxGeometry(120, .06, 1.5), mat(COLORS.walk), { z: front + .75, y: .03 });
  add(new THREE.BoxGeometry(120, .16, .25), mat(COLORS.curb), { z: front + 1.5 + 1.2 + .12, y: .08 });
  const roadZ = front + 1.5 + 1.2 + .25 + 4;
  flat(new THREE.PlaneGeometry(120, 8), mat(COLORS.road), { z: roadZ, y: .004 });
  const dashMat = mat(COLORS.dash);
  for (let i = -20; i <= 20; i++) flat(new THREE.PlaneGeometry(1.6, .14), dashMat, { x: i * 3, z: roadZ, y: .006 });
  if (!corner) {
    const driveLen = Dp + 6;
    add(new THREE.BoxGeometry(3, .04, driveLen), mat(COLORS.drive), { x: W / 2 + 1.8, z: front - driveLen / 2 + .2, y: .02 });
  } else {   /* side street along the right edge */
    add(new THREE.BoxGeometry(1.5, .06, 60), mat(COLORS.walk), { x: W / 2 + .75, z: front - 30 + 1.5, y: .03 });
    flat(new THREE.PlaneGeometry(8, 60), mat(COLORS.road), { x: W / 2 + 1.5 + 1.2 + 4, z: front - 30 + 1.5, y: .004 });
  }

  /* house: cream walls, ink roof, cobalt door, red chimney; its porch ends where the lawn starts */
  const houseW = corner ? W - sideW : Math.min(Math.max(W * .72, 8), 14);
  const houseD = 9, wallH = 3.1;
  const houseFrontZ = (corner ? -Dp / 2 + m.cornerHouseRows * cell : -Dp / 2) - 2;
  const hx = corner ? -W / 2 + houseW / 2 : 0, hz = houseFrontZ - houseD / 2;
  add(new THREE.BoxGeometry(houseW, wallH, houseD), mat(COLORS.wall), { x: hx, y: wallH / 2, z: hz, cast: true });
  const roofShape = new THREE.Shape(); roofShape.moveTo(-houseD / 2 - .4, 0); roofShape.lineTo(houseD / 2 + .4, 0); roofShape.lineTo(0, 2.2); roofShape.closePath();
  add(new THREE.ExtrudeGeometry(roofShape, { depth: houseW + .6, bevelEnabled: false }), mat(COLORS.roof), { x: hx - houseW / 2 - .3, y: wallH, z: hz, cast: true, ry: Math.PI / 2 });
  add(new THREE.BoxGeometry(.7, 1.6, .7), mat(COLORS.chimney), { x: hx + houseW * .28, y: wallH + 1.6, z: hz - 1.2, cast: true });
  add(new THREE.BoxGeometry(1.0, 2.1, .08), mat(COLORS.door), { x: hx, y: 1.05, z: houseFrontZ + .04 });
  const windowMat = mat(COLORS.glass, { emissive: new THREE.Color(0xffd27a), emissiveIntensity: 0 });
  [-1, 1].forEach((s) => {
    const wx = hx + s * Math.min(houseW / 3.2, 3.4);
    add(new THREE.BoxGeometry(1.5, 1.2, .06), windowMat, { x: wx, y: 1.7, z: houseFrontZ + .04 });
    add(new THREE.BoxGeometry(1.75, 1.45, .04), mat(COLORS.trim), { x: wx, y: 1.7, z: houseFrontZ + .02 });
  });
  add(new THREE.BoxGeometry(3.2, .25, 1.8), mat(COLORS.drive), { x: hx, y: .12, z: houseFrontZ + .9 });
  add(new THREE.BoxGeometry(3.6, .14, 2.0), mat(COLORS.roof), { x: hx, y: 2.65, z: houseFrontZ + 1, cast: true });
  [-1.5, 1.5].forEach((dx) => add(new THREE.CylinderGeometry(.08, .08, 2.5, 12), mat(COLORS.trim), { x: hx + dx, y: 1.25, z: houseFrontZ + 1.8, cast: true }));
  const bulbMat = mat(0xffffff, { emissive: new THREE.Color(0xffd27a), emissiveIntensity: 0 });
  add(new THREE.SphereGeometry(.09, 12, 8), bulbMat, { x: hx + .8, y: 2.15, z: houseFrontZ + .12 });
  const porchLight = new THREE.PointLight(0xffc77a, 0, 12, 2); porchLight.position.set(hx + .8, 2.1, houseFrontZ + .6); scene.add(porchLight);

  /* round trees and a street lamp (left side, in the city strip) */
  const trunkMat = mat(COLORS.trunk);
  const tree = (x, z, s = 1) => {
    add(new THREE.CylinderGeometry(.18 * s, .24 * s, 2.4 * s, 12), trunkMat, { x, y: 1.2 * s, z, cast: true });
    const crown = foliage(1.9 * s, 3.2 * s, Math.floor(Math.abs(x * 713 + z * 921)));
    crown.position.set(x, 3.3 * s, z); scene.add(crown);
  };
  tree(-W / 2 - 4.6, -Dp / 2 - 2.5, .95);
  if (!corner) tree(W / 2 + 6.2, -Dp / 2 - 1, 1.1); else tree(-W / 2 - 8, -Dp / 2 - 9, 1.2);
  const lampX = -W / 2 - 1.2, lampZ = front + 2.1;
  add(new THREE.CylinderGeometry(.07, .09, 5, 12), mat(COLORS.pole), { x: lampX, y: 2.5, z: lampZ, cast: true });
  add(new THREE.BoxGeometry(1.1, .1, .12), mat(COLORS.pole), { x: lampX + .5, y: 4.95, z: lampZ });
  const lampHeadMat = mat(0xffffff, { emissive: new THREE.Color(0xffe2a8), emissiveIntensity: 0 });
  add(new THREE.BoxGeometry(.5, .16, .3), lampHeadMat, { x: lampX + 1, y: 4.9, z: lampZ });

  return {
    groundAt: () => 0,
    lampPos: new THREE.Vector3(lampX + 1, 4.85, lampZ),
    setNight: (w, porch) => { windowMat.emissiveIntensity = w * .9; bulbMat.emissiveIntensity = w * 2; lampHeadMat.emissiveIntensity = w * 2; porchLight.intensity = porch; },
  };
}

/* ======================================================================= the surveyed yard */
function buildSurveyed({ scene, mat, surfaces, foliage, add, disposables, W, Dp, cell }, m, opts) {
  const { site, yard } = m.survey;
  const F = yard.frame;
  /* yard frame <-> survey (east, north) */
  const toE = (x, z) => F.ox + F.rx * x + F.nx * z, toN = (x, z) => F.oy + F.ry * x + F.ny * z;
  const toX = (e, n) => (e - F.ox) * F.rx + (n - F.oy) * F.ry, toZ = (e, n) => (e - F.ox) * F.nx + (n - F.oy) * F.ny;
  const groundAt = (x, z) => demSample(site, toE(x, z), toN(x, z)) - F.base;
  const angOf = (a) => { const c = Math.cos(a), s = Math.sin(a); return Math.atan2(-(c * F.nx + s * F.ny), c * F.rx + s * F.ry); };   /* rect angle -> rotation.y */
  const R = 44, gridX0 = -W / 2;
  const root = new THREE.Group(); scene.add(root);
  const layers = { ground: new THREE.Group(), buildings: new THREE.Group(), trees: new THREE.Group() };
  Object.values(layers).forEach((g) => root.add(g));

  /* ---------------- ground: the real terrain, painted from the survey's vector shapes ---------------- */
  const H = site.half, TEX = 2048, PXM = TEX / (2 * R);
  const walk = yard.walk && !yard.walk.guessed ? yard.walk : null;
  /* their lot, as a quad in this scene's yard frame plus the stripe axis; another house's yard
     (picked in the preview) brings its own frame, so convert through east/north */
  const lotFor = (y) => {
    const f = y.frame, wk = y.walk && !y.walk.guessed ? y.walk : null;
    const z0 = y.house.frontZ - 22, z1 = wk ? wk.z0 : y.road.curbZ;
    const toScene = (lx, lz) => { const e = f.ox + f.rx * lx + f.nx * lz, n = f.oy + f.ry * lx + f.ny * lz; return [toX(e, n), toZ(e, n)]; };
    const gx0 = -y.cols * y.cellM / 2;
    return { quad: [[y.lot.x0, z0], [y.lot.x1, z0], [y.lot.x1, z1], [y.lot.x0, z1]].map(([a2, b2]) => toScene(a2, b2)), stripe: (k) => [toScene(gx0 + k * 2 * y.cellM, -60), toScene(gx0 + (k + 1) * 2 * y.cellM, -60), toScene(gx0 + (k + 1) * 2 * y.cellM, 60), toScene(gx0 + k * 2 * y.cellM, 60)], k0: Math.floor((y.lot.x0 - gx0) / (2 * y.cellM)) - 1, k1: Math.ceil((y.lot.x1 - gx0) / (2 * y.cellM)) + 1 };
  };
  let lot = lotFor(yard);
  const groundCanvas = document.createElement("canvas"); groundCanvas.width = groundCanvas.height = TEX;
  const paintGround = (x) => {
    const P = (e, n) => [(toX(e, n) + R) * PXM, (toZ(e, n) + R) * PXM];
    const Y = (gx, gz) => [(gx + R) * PXM, (gz + R) * PXM];
    const poly = (pts) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); };
    const rectPts = (r) => { const c = Math.cos(r.ang), s2 = Math.sin(r.ang); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => P(r.cx + c * u * r.len / 2 - s2 * v * r.wid / 2, r.cy + s2 * u * r.len / 2 + c * v * r.wid / 2)); };
    /* grass everywhere, then their lot mown in stripes two squares wide (as on the aerial grid) */
    x.fillStyle = HEX(COLORS.grass); x.fillRect(0, 0, TEX, TEX);
    x.save(); poly(lot.quad.map(([a2, b2]) => Y(a2, b2))); x.clip();
    for (let k = lot.k0; k <= lot.k1; k++) { x.fillStyle = HEX(((k % 2) + 2) % 2 ? COLORS.lawn2 : COLORS.lawn); poly(lot.stripe(k).map(([a2, b2]) => Y(a2, b2))); x.fill(); }
    x.restore();
    /* driveways, walks and patios; long strips along the street are sidewalk, with joints */
    for (const r of site.paving) {
      const sidewalk = r.along && r.len > 6 && r.wid < 2.8;
      x.fillStyle = HEX(sidewalk ? COLORS.walk : COLORS.drive); poly(rectPts(r)); x.fill();
      if (sidewalk) {
        x.save(); poly(rectPts(r)); x.clip(); x.strokeStyle = HEX(COLORS.joint); x.lineWidth = Math.max(1, .05 * PXM);
        const c = Math.cos(r.ang), s2 = Math.sin(r.ang);
        for (let u = -r.len / 2; u <= r.len / 2; u += 1.5) {
          const [a1, b1] = P(r.cx + c * u + s2 * r.wid, r.cy + s2 * u - c * r.wid), [a2, b2] = P(r.cx + c * u - s2 * r.wid, r.cy + s2 * u + c * r.wid);
          x.beginPath(); x.moveTo(a1, b1); x.lineTo(a2, b2); x.stroke();
        }
        x.restore();
      }
    }
    /* streets: ink, with a pale curb line at each edge */
    x.lineJoin = "round"; x.lineCap = "butt";
    for (const r of site.roads) {
      const pts = r.pts.map(([e, n]) => P(e, n));
      x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
      x.strokeStyle = HEX(COLORS.curbTop); x.lineWidth = (2 * r.half + .36) * PXM; x.stroke();
      x.strokeStyle = HEX(COLORS.road); x.lineWidth = 2 * r.half * PXM; x.stroke();
    }
    x.save(); x.globalCompositeOperation = "multiply"; x.globalAlpha = .28;
    const grain = surfaces.get("grass").map.image;
    x.fillStyle = x.createPattern(grain, "repeat"); x.fillRect(0, 0, TEX, TEX); x.restore();
  };
  paintGround(groundCanvas.getContext("2d"));
  const groundTex = new THREE.CanvasTexture(groundCanvas); groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.anisotropy = 8; disposables.push(groundTex);
  const SEG = 176;
  const tg = new THREE.PlaneGeometry(2 * R, 2 * R, SEG, SEG); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, groundAt(tp.getX(i), tp.getZ(i)));
  tg.computeVertexNormals();
  add(tg, mat(0xffffff, { map: groundTex }), { parent: layers.ground });
  let minY = Infinity; for (let i = 0; i < tp.count; i++) minY = Math.min(minY, tp.getY(i));
  add(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), mat(COLORS.grass), { y: minY - .08, parent: layers.ground });

  /* the curb along their street: a low cast-concrete lip on both sides */
  const streetLines = site.roads.filter((r) => r.named && r.name === yard.street);
  const curbMat = mat(COLORS.curb, { side: THREE.DoubleSide });
  const ribbon = (pts, off, width, h) => {
    /* offset polyline (yard coords) by `off` to its left, `width` wide, `h` tall */
    const pos = [], idx = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      const nx = -tz, nz = tx;
      for (const k of [off, off + width]) {
        const x = pts[i][0] + nx * k, z = pts[i][1] + nz * k, y = groundAt(x, z);
        pos.push(x, y - .05, z, x, y + h, z);
      }
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = i * 4, b = (i + 1) * 4;
      /* top face, then the face toward the road */
      idx.push(a + 1, b + 1, a + 3, a + 3, b + 1, b + 3);
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  for (const r of streetLines) {
    const pts = r.pts.map(([e, n]) => [toX(e, n), toZ(e, n)]).filter(([x, z]) => Math.abs(x) < R + 10 && Math.abs(z) < R + 10);
    if (pts.length < 2) continue;
    for (const sg of [1, -1]) add(ribbon(sg > 0 ? pts : [...pts].reverse(), r.half - .02, .18, .13), curbMat, { parent: layers.ground, cast: false });
  }

  /* ---------------- buildings: lidar footprints and roofs ---------------- */
  const roofGeo = (r, ridgeAlongLen) => {
    /* a pitched roof over len x wid (local u along len), eave at 0, rising `rise`; overhang .3 m */
    const o = .3, L = r.len / 2 + o, Wd = r.wid / 2 + o, rise = r.ridge - r.eave;
    const v = [];
    const tri = (a, b, c) => v.push(...a, ...b, ...c);
    const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
    if (r.roof === "flat" || rise < .3) {
      const g = new THREE.BoxGeometry(r.len + .3, .22, r.wid + .3); g.translate(0, .11, 0); return g;
    }
    const along = r.roof === "gable-cross" ? !ridgeAlongLen : ridgeAlongLen;
    const A = along ? L : Wd, B = along ? Wd : L;          /* A: half-length along the ridge, B: half-span across it */
    const P = (a, b, y) => (along ? [a, y, b] : [b, y, a]);
    if (r.roof === "hip" && A > B) {
      const rl = A - B;
      quad(P(-A, -B, 0), P(A, -B, 0), P(rl, 0, rise), P(-rl, 0, rise));
      quad(P(A, B, 0), P(-A, B, 0), P(-rl, 0, rise), P(rl, 0, rise));
      tri(P(A, -B, 0), P(A, B, 0), P(rl, 0, rise));
      tri(P(-A, B, 0), P(-A, -B, 0), P(-rl, 0, rise));
    } else {
      quad(P(-A, -B, 0), P(A, -B, 0), P(A, 0, rise), P(-A, 0, rise));
      quad(P(A, B, 0), P(-A, B, 0), P(-A, 0, rise), P(A, 0, rise));
      tri(P(A, -B, 0), P(A, B, 0), P(A, 0, rise));
      tri(P(-A, B, 0), P(-A, -B, 0), P(-A, 0, rise));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    const uv = []; for (let i = 0; i < v.length; i += 3) uv.push(v[i] / 3, (v[i + 2] + v[i + 1]) / 3);
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    /* both windings: the roof is seen from above and its gable ends from the street */
    g.computeVertexNormals(); return g;
  };
  const wallMat = mat(COLORS.wall), roofMat = mat(COLORS.roof, { side: THREE.DoubleSide });
  const nWallMat = mat(COLORS.nWall), nRoofMat = mat(COLORS.nRoof, { side: THREE.DoubleSide });
  const windowMat = mat(COLORS.glass, { emissive: new THREE.Color(0xffd27a), emissiveIntensity: 0 });
  const nWindowMat = mat(COLORS.glass, { emissive: new THREE.Color(0xffc56b), emissiveIntensity: 0 });
  const trimMat = mat(COLORS.trim), doorMat = mat(COLORS.door);
  const bulbMat = mat(0xffffff, { emissive: new THREE.Color(0xffd27a), emissiveIntensity: 0 });
  const houseMeshes = [], buildingGroups = new Map();
  let porchLight = null, markerPoint = null;
  const buildHouse = (b, isTarget) => {
    const g = new THREE.Group(); g.userData.houseId = b.id;
    let top = 0;
    for (const r of b.rects) {
      const cx = toX(r.cx, r.cy), cz = toZ(r.cx, r.cy), ry = angOf(r.ang);
      const cc = Math.cos(r.ang), ss = Math.sin(r.ang);
      const ground = Math.min(...[[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].map(([u, v]) => { const e = r.cx + cc * u * r.len / 2 - ss * v * r.wid / 2, n = r.cy + ss * u * r.len / 2 + cc * v * r.wid / 2; return demSample(site, e, n) - F.base; }));
      const gc = demSample(site, r.cx, r.cy) - F.base;
      const base = ground - .15, eaveY = gc + r.eave, wallH = eaveY - base;
      const walls = add(new THREE.BoxGeometry(r.len, wallH, r.wid), isTarget ? wallMat : nWallMat, { x: cx, y: base + wallH / 2, z: cz, ry, cast: true, parent: g });
      walls.userData.houseId = b.id; houseMeshes.push(walls);
      const roof = add(roofGeo(r, true), isTarget ? roofMat : nRoofMat, { x: cx, y: eaveY, z: cz, ry, cast: true, parent: g });
      roof.userData.houseId = b.id; houseMeshes.push(roof);
      // A low foundation and fascia anchor the measured building without changing its footprint.
      add(new THREE.BoxGeometry(r.len + .04, .24, r.wid + .04), mat(COLORS.curb), { x: cx, y: ground + .02, z: cz, ry, parent: g });
      for (const sign of [-1, 1]) {
        const ex = cx + Math.sin(ry) * sign * (r.wid / 2 + .15), ez = cz + Math.cos(ry) * sign * (r.wid / 2 + .15);
        add(new THREE.BoxGeometry(r.len + .5, .14, .1), trimMat, { x: ex, y: eaveY - .05, z: ez, ry, cast: true, parent: g });
      }
      top = Math.max(top, gc + r.ridge);
      /* windows on the face toward the street */
      const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([u, v]) => {
        const nxE = cc * u - ss * v, nyN = ss * u + cc * v;          /* outward normal in (east, north) */
        const toward = nxE * F.nx + nyN * F.ny;                       /* +1 faces the street */
        /* rotation.y that turns a plane's +z to face outward */
        const face = Math.atan2(nxE * F.rx + nyN * F.ry, toward);
        return { u, v, toward, face, half: u ? r.wid / 2 : r.len / 2, depth: u ? r.len / 2 : r.wid / 2 };
      }).sort((a, b2) => b2.toward - a.toward);
      const f = faces[0];
      if (f.toward > .7 && f.half > 2) {
        const fx = (lu, lv) => [cx + (cc * lu - ss * lv) * F.rx + (ss * lu + cc * lv) * F.ry, cz + (cc * lu - ss * lv) * F.nx + (ss * lu + cc * lv) * F.ny];
        /* local face frame: out along (u, v), across along (-v, u) */
        const at = (across, out) => fx(f.u * (f.depth + out) + -f.v * across, f.v * (f.depth + out) + f.u * across);
        const wins = f.half > 4.5 ? [-f.half * .55, f.half * .55] : [-f.half * .5, f.half * .5];
        const winY = Math.min(gc + 1.7, eaveY - .9);
        for (const a of wins) {
          const [wx, wz] = at(a, .04);
          add(new THREE.BoxGeometry(1.25, 1.1, .06), isTarget ? windowMat : nWindowMat, { x: wx, y: winY, z: wz, ry: f.face, parent: g });
          if (isTarget) {
            const [tx2, tz2] = at(a, .09);
            for (const sign of [-1, 1]) {
              add(new THREE.BoxGeometry(1.45, .07, .1), trimMat, { x: tx2, y: winY + sign * .59, z: tz2, ry: f.face, cast: true, parent: g });
              const [vx, vz] = at(a + sign * .69, .09);
              add(new THREE.BoxGeometry(.07, 1.25, .1), trimMat, { x: vx, y: winY, z: vz, ry: f.face, cast: true, parent: g });
            }
            add(new THREE.BoxGeometry(.04, 1.1, .08), trimMat, { x: tx2, y: winY, z: tz2, ry: f.face, parent: g });
            add(new THREE.BoxGeometry(1.25, .04, .08), trimMat, { x: tx2, y: winY, z: tz2, ry: f.face, parent: g });
          }
        }
        if (isTarget) {
          const [dx, dz] = at(0, .05);
          add(new THREE.BoxGeometry(1.0, 2.1, .08), doorMat, { x: dx, y: gc + 1.05, z: dz, ry: f.face, parent: g });
          const [lx, lz] = at(.85, .12);
          add(new THREE.SphereGeometry(.09, 12, 8), bulbMat, { x: lx, y: gc + 2.15, z: lz, parent: g });
          const [px, pz] = at(.85, .7);
          porchLight = new THREE.PointLight(0xffc77a, 0, 12, 2); porchLight.position.set(px, gc + 2.1, pz); g.add(porchLight);
        }
      }
    }
    if (isTarget) markerPoint = new THREE.Vector3(toX(b.cx, b.cy), top + 1.2, toZ(b.cx, b.cy));
    return g;
  };
  let targetId = yard.targetId;
  for (const b of site.buildings) { const g = buildHouse(b, b.id === targetId); layers.buildings.add(g); buildingGroups.set(b.id, g); }
  const setTarget = (id, newYard) => {
    if (!buildingGroups.has(id) || id === targetId) return;
    if (newYard && newYard.frame) { lot = lotFor(newYard); paintGround(groundCanvas.getContext("2d")); groundTex.needsUpdate = true; }
    for (const old of [targetId, id]) {
      const g = buildingGroups.get(old); layers.buildings.remove(g);
      g.traverse((o) => { if (o.isMesh) { const k = houseMeshes.indexOf(o); if (k >= 0) houseMeshes.splice(k, 1); } if (o.isPointLight && o === porchLight) porchLight = null; });
    }
    const prev = targetId; targetId = id;
    for (const bid of [prev, id]) { const b = site.buildings.find((x) => x.id === bid); const g = buildHouse(b, bid === id); layers.buildings.add(g); buildingGroups.set(bid, g); }
  };

  /* ---------------- trees and shrubs from the lidar canopy ---------------- */
  const trunkMat = mat(COLORS.trunk);
  const crowns = [];
  for (const t of site.trees) {
    const x = toX(t.x, t.y), z = toZ(t.x, t.y);
    if (Math.abs(x) > R || Math.abs(z) > R) continue;
    const gy = groundAt(x, z), h = Math.max(3.5, t.h), r = Math.min(t.r, h * .55);
    const crownY = gy + h - r * .85, trunkH = Math.max(1.6, crownY - gy);
    const tg2 = new THREE.Group(); tg2.position.set(x, gy, z); layers.trees.add(tg2);
    add(new THREE.CylinderGeometry(.1 + h * .012, .16 + h * .016, trunkH, 10), trunkMat, { y: trunkH / 2, cast: true, parent: tg2 });
    const seed = Math.abs(Math.sin(t.x * 12.9898 + t.y * 78.233)) * 43758.5453 % 1;
    const crown = new THREE.Group(); crown.position.y = crownY - gy; tg2.add(crown);
    crown.add(foliage(r, r * 1.8, Math.floor(seed * 100000), 850));
    crowns.push({ group: crown, tree: tg2, center: new THREE.Vector3(x, crownY, z), r });
  }
  for (const sb of site.shrubs) {
    const x = toX(sb.x, sb.y), z = toZ(sb.x, sb.y);
    if (Math.abs(x) > R || Math.abs(z) > R) continue;
    const mesh = foliage(sb.r, sb.h, Math.floor(Math.abs(x * 123 + z * 829)), 280); mesh.position.set(x, groundAt(x, z) + sb.h * .45, z);
    mesh.castShadow = true; mesh.receiveShadow = true; layers.trees.add(mesh);
  }
  /* crowns between the camera and the display turn to a ghost so the letters stay visible;
     while decorating every crown is a ghost, so the lawn under the trees can be planned */
  const setCrownOpacity = (c, a) => c.group.children.forEach((mesh) => {
    mesh.material.transparent = a < 1; mesh.material.opacity = a; mesh.material.depthWrite = a >= 1;
    mesh.material.alphaTest = .45 * a;
  });
  const seg = new THREE.Line3(), closest = new THREE.Vector3();
  const tick = (camera, target) => {
    let changed = false;
    seg.set(camera.position, target);
    for (const c of crowns) {
      seg.closestPointToPoint(c.center, true, closest);
      const blocks = opts.edit || closest.distanceTo(c.center) < c.r * 1.05;
      const a = blocks ? (opts.edit ? .3 : .18) : 1;
      if (c.a !== a) { setCrownOpacity(c, a); c.a = a; changed = true; }
    }
    return changed;
  };

  /* ---------------- the decorating grid, draped over the real lawn ---------------- */
  const cellType = (c, r) => yard.types[r * yard.cols + c];
  let grid = null;
  if (opts.edit) {
    const atlas = canvasTex(512, 128, (x, w, h) => {
      /* 0: open lawn square, 1: the 5-ft setback, 2: hover, 3: keyboard focus */
      x.clearRect(0, 0, w, h);
      x.strokeStyle = "rgba(255,255,255,.78)"; x.lineWidth = 6; x.strokeRect(3, 3, 122, 122);
      x.save(); x.beginPath(); x.rect(128, 0, 128, 128); x.clip();
      x.strokeStyle = "rgba(47,49,48,.26)"; x.lineWidth = 9;
      for (let k = -128; k < 256; k += 26) { x.beginPath(); x.moveTo(128 + k, 128); x.lineTo(128 + k + 128, 0); x.stroke(); }
      x.restore();
      x.fillStyle = "rgba(255,255,255,.42)"; x.fillRect(256, 0, 128, 128); x.strokeStyle = "#ffffff"; x.lineWidth = 12; x.strokeRect(262, 6, 116, 116);
      x.strokeStyle = "#2f3130"; x.lineWidth = 14; x.strokeRect(391, 7, 114, 114); x.strokeStyle = "#ffffff"; x.lineWidth = 7; x.strokeRect(401, 17, 94, 94);
    });
    atlas.anisotropy = 8; disposables.push(atlas);
    const pos = [], uvs = [], idx = [], pick = [], pidx = [];
    const tile = (k) => [k * .25 + .002, k * .25 + .248];
    for (let r = 0; r < yard.rows; r++) for (let c = 0; c < yard.cols; c++) {
      const t = cellType(c, r);
      const x0 = c * cell - W / 2, x1 = x0 + cell, z0 = r * cell - Dp / 2, z1 = z0 + cell;
      const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [x, groundAt(x, z) + .03, z]);
      const b = pick.length / 3; corners.forEach((p) => pick.push(...p)); pidx.push(b, b + 2, b + 1, b, b + 3, b + 2);
      if (t !== CELL.ok && t !== CELL.setback) continue;
      const [u0, u1] = tile(t === CELL.ok ? 0 : 1), a = pos.length / 3;
      corners.forEach((p) => pos.push(...p)); uvs.push(u0, 1, u1, 1, u1, 0, u0, 0);
      idx.push(a, a + 2, a + 1, a, a + 3, a + 2);
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); gg.setIndex(idx);
    const gm = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    disposables.push(gg, gm);
    const gridMesh = new THREE.Mesh(gg, gm); gridMesh.renderOrder = 2; root.add(gridMesh);
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.Float32BufferAttribute(pick, 3)); pg.setIndex(pidx); disposables.push(pg);
    const pickMesh = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ visible: false })); root.add(pickMesh);
    /* hover and focus squares */
    const marker = (k) => {
      const [u0, u1] = tile(k);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(new Array(12).fill(0), 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute([u0, 1, u1, 1, u1, 0, u0, 0], 2)); g.setIndex([0, 2, 1, 0, 3, 2]);
      const mm = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false, depthTest: false, polygonOffset: true, polygonOffsetFactor: -4 });
      disposables.push(g, mm);
      const mesh = new THREE.Mesh(g, mm); mesh.renderOrder = 3; mesh.visible = false; root.add(mesh);
      return (at) => {
        if (!at) { mesh.visible = false; return; }
        const x0 = at.c * cell - W / 2, z0 = at.r * cell - Dp / 2, p = g.attributes.position;
        [[x0, z0], [x0 + cell, z0], [x0 + cell, z0 + cell], [x0, z0 + cell]].forEach(([x, z], i) => p.setXYZ(i, x, groundAt(x, z) + .05, z));
        p.needsUpdate = true; g.computeBoundingSphere(); mesh.visible = true;
      };
    };
    const hoverM = marker(2), focusM = marker(3);
    grid = {
      pickMesh,
      hover: (at, dragging) => hoverM(at && (dragging || at.piece || cellType(at.c, at.r) === CELL.ok) ? at : null),
      focus: (at) => focusM(at),
    };
  }

  /* ---------------- the reveal: ground, then houses rise, then trees grow ---------------- */
  const intro = (G) => {
    if (!opts.reveal) return;
    const kids = layers.buildings.children, trees = layers.trees.children;
    const dist = (o) => { const b = new THREE.Box3().setFromObject(o); const c = b.getCenter(new THREE.Vector3()); return Math.hypot(c.x, c.z); };
    kids.forEach((g) => { g.scale.y = .001; });
    trees.forEach((t) => t.scale.setScalar(.001));
    const timeline = G.timeline()
      .from(layers.ground.position, { y: -1.2, duration: .7, ease: "expo.out" })
      .to(kids.map((g) => g.scale), { y: 1, duration: .55, ease: "back.out(1.6)", stagger: { each: .04, from: 0 } }, .25)
      .to(trees.map((t) => t.scale), { x: 1, y: 1, z: 1, duration: .5, ease: "back.out(1.8)", stagger: .025 }, .55);
    void dist;
    return timeline.duration() * 1000;
  };

  /* the street lamp's light (no post: we don't know where theirs stands) */
  const lampPos = new THREE.Vector3(W / 2 + 1.5, groundAt(W / 2, yard.road.curbZ) + 5.2, yard.road.curbZ + .8);
  return {
    groundAt, lampPos, shadowHalf: 30, fogScale: 1.15, houseMeshes, grid, cellType, tick, intro, setTarget,
    markerAt: () => markerPoint,
    surveyView: (reach) => {
      /* their house and its neighbours from above the far side of the street */
      const hx = markerPoint ? markerPoint.x : 0, hz = markerPoint ? markerPoint.z : yard.house.frontZ - 4;
      const fz = hz * .55 + yard.road.curbZ * .45;
      const c = new THREE.Vector3(hx, groundAt(hx, fz) + 2, fz);
      const dist = Math.max(reach(30), 24);
      const p = THREE.MathUtils.degToRad(48);
      return { pos: [c.x, c.y + Math.sin(p) * dist, c.z + Math.cos(p) * dist], target: [c.x, c.y, c.z] };
    },
    setNight: (w, porch) => {
      windowMat.emissiveIntensity = w * .9; nWindowMat.emissiveIntensity = w * .55; bulbMat.emissiveIntensity = w * 2;
      if (porchLight) porchLight.intensity = porch;
    },
  };
}
