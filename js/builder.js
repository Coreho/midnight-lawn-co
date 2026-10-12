/* Midnight Lawn Co. — Lawn Builder.
   Stage 1: either their real yard (an address, modelled in 3D from public survey data by
   js/yard-survey.js) or a typical lawn (a shape and a size). Stage 2: decorate a grid of 2.5-ft
   squares, on the 3D yard or on an aerial street view; place catalog pieces by tapping or
   dragging. Stage 3: a 3D render of the finished lawn by day and by night (js/render3d.js,
   loaded on demand). */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = window.DECOR;
  const G = window.gsap || null;
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const root = $("#builderView");
  if (!root || !D) return;

  /* ---------------- the lawn: shapes, sizes, no-stake squares ---------------- */
  const CELL_FT = 2.5;
  const SHAPES = {
    standard: { name: "Standard front yard", dims: { small: [12, 6], medium: [16, 7], large: [20, 8] } },
    wide: { name: "Wide and shallow", dims: { small: [16, 5], medium: [20, 5], large: [26, 6] } },
    corner: { name: "Corner lot", dims: { small: [12, 9], medium: [16, 10], large: [20, 11] } },
    narrow: { name: "Narrow city lot", dims: { small: [8, 7], medium: [10, 8], large: [12, 9] } },
  };
  const SETBACK_ROWS = 2;          /* 2 rows x 2.5 ft = the 5 ft we keep clear of the sidewalk */
  const CORNER_HOUSE_ROWS = 4, CORNER_SIDE_COLS = 4;
  /* square types in a surveyed yard (CELL in js/yard-survey.js) */
  const YARD_BLOCK = { 1: "setback", 2: "drive", 3: "tree", 4: "bed", 5: "house" };
  const BLOCK_SAY = { setback: "That square is within 5 feet of the sidewalk, where we don't stake.", drive: "That's driveway or walk. Pieces go on the lawn.", tree: "A tree trunk stands there.", bed: "That's a garden bed or bushes. We stay out of those.", house: "That's the house." };

  const S = {
    mode: "address", shape: "standard", size: "medium", cols: 16, rows: 7,
    cells: new Map(),              /* "c,r" -> { kind: "letter", ch, fill } | { kind: "item", id } */
    brush: null,                   /* { kind: "item", id } | { kind: "letter", ch } | { kind: "message", text } | { kind: "erase" } */
    cat: "seasonal", history: [], letterCount: 0, stage: 1,
    survey: null,                  /* { site, yard } once an address is modelled */
    planted: [],                   /* squares just filled, for the plant animation */
  };
  const surveyed = () => S.mode === "address" && S.survey;
  const key = (c, r) => `${c},${r}`;
  const blockedReason = (c, r) => {
    if (surveyed()) { const y = S.survey.yard; return YARD_BLOCK[y.types[r * y.cols + c]] || ""; }
    if (r >= S.rows - SETBACK_ROWS) return "setback";
    if (S.shape === "corner" && r < CORNER_HOUSE_ROWS && c < S.cols - CORNER_SIDE_COLS) return "house";
    const meter = S.shape === "corner" ? [S.cols - CORNER_SIDE_COLS, 0] : [0, 0];
    if (c === meter[0] && r === meter[1]) return "meter";
    return "";
  };
  const dims = () => (surveyed() ? [S.survey.yard.cols, S.survey.yard.rows] : SHAPES[S.shape].dims[S.size]);

  /* ---------------- stage 1: their real yard, or a typical lawn ---------------- */
  const planSvg = (shape) => {
    const p = { standard: "M8 18h64v30H8Z", wide: "M4 24h72v20H4Z", corner: "M8 8h64v40H8Z", narrow: "M24 14h32v34H24Z" }[shape];
    const house = shape === "corner" ? `<rect x="8" y="8" width="44" height="18" rx="2" fill="#f2efe3" stroke="#2f3130" stroke-width="2"/>` : `<rect x="${shape === "narrow" ? 26 : 20}" y="4" width="${shape === "narrow" ? 28 : 40}" height="12" rx="2" fill="#f2efe3" stroke="#2f3130" stroke-width="2"/>`;
    return `<svg viewBox="0 0 80 60" aria-hidden="true"><rect width="80" height="60" rx="6" fill="#dcd6c3"/><path d="${p}" fill="#82cc5c" stroke="#2f3130" stroke-width="2"/>${house}<rect x="0" y="50" width="80" height="10" fill="#2f3130"/></svg>`;
  };
  $("#bShapes").innerHTML = Object.entries(SHAPES).map(([id, s]) => `
    <label class="shape-card"><input type="radio" name="bShape" value="${id}"${id === S.shape ? " checked" : ""}>${planSvg(id)}<strong>${s.name}</strong></label>`).join("");

  const describeSize = () => {
    const [c, r] = SHAPES[S.shape].dims[S.size];
    $("#bSizeNote").textContent = `About ${Math.round(c * CELL_FT)} by ${Math.round(r * CELL_FT)} feet of lawn, a ${c} by ${r} grid of 2.5-foot squares.`;
  };
  const next1 = $("#bNext1");
  const syncNext = () => {
    const ready = S.mode === "typical" || (S.survey && !S.surveyError);
    next1.disabled = !ready;
    next1.firstChild.textContent = S.mode === "address" ? "Next: decorate this yard " : "Next: decorate ";
  };
  const setMode = (mode) => {
    if (S.mode !== mode && S.touched) { S.cells.clear(); S.history = []; S.touched = false; }
    S.mode = mode;
    $$("[data-bmode]", root).forEach((el) => (el.hidden = el.dataset.bmode !== mode));
    syncNext();
  };
  root.addEventListener("change", (e) => {
    if (e.target.name === "bShape") { S.shape = e.target.value; describeSize(); }
    if (e.target.name === "bSize") { S.size = e.target.value; describeSize(); }
    if (e.target.name === "bMode") setMode(e.target.value);
  });
  describeSize();

  /* ---------------- stage 1, address: survey the yard ---------------- */
  let surveyMod = null, preview = null, surveyRun = 0;
  const steps = $("#bSurveySteps"), surveyLive = $("#bSurveyLive"), addrErr = $("#bAddrErr"), addrInput = $("#bAddr");
  const STEP_SAY = { address: "Found the address.", streets: "Street map read.", lidar: "Laser survey downloaded.", photo: "Aerial photo in.", model: "Model built." };
  const setStep = (step, state, note, frac) => {
    const li = $(`[data-step="${step}"]`, steps); if (!li) return;
    if (state === "progress") { li.querySelector(".sv-note").textContent = note || ""; li.style.setProperty("--p", frac || 0); return; }
    li.dataset.state = state;
    const disc = li.querySelector(".sv-disc");
    disc.innerHTML = state === "done" ? icon("check") : state === "fail" ? icon("info") : "";
    if (note !== undefined) li.querySelector(".sv-note").textContent = note;
    if (state === "done" && STEP_SAY[step]) surveyLive.textContent = STEP_SAY[step];
  };
  const titleCase = (t) => t.replace(/\b([A-Z])([A-Z]+)\b/g, (m, x, y) => x + y.toLowerCase()).replace(/\bMi\b/, "MI");
  const showErr = (msg, html = false) => {
    addrErr.innerHTML = msg ? `${icon("x")}<span>${html ? msg : esc(msg)} <button type="button" class="link-btn" data-use-typical>Or use a typical lawn</button></span>` : "";
    addrInput.toggleAttribute("aria-invalid", !!msg);
  };
  addrErr.addEventListener("click", (e) => { if (e.target.closest("[data-use-typical]")) { const r = $('input[name="bMode"][value="typical"]', root); r.checked = true; setMode("typical"); r.focus(); } });

  $("#bAddrForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const address = addrInput.value.replace(/\s+/g, " ").trim();
    if (!/^\d+\s+\S+/.test(address)) { showErr("Start with the house number, then the street and city."); addrInput.focus(); return; }
    showErr("");
    const run = ++surveyRun;
    const go = $("#bAddrGo");
    go.disabled = true; go.setAttribute("aria-busy", "true");
    steps.hidden = false;
    $$("li", steps).forEach((li) => { li.dataset.state = "wait"; li.querySelector(".sv-disc").innerHTML = ""; li.querySelector(".sv-note").textContent = ""; });
    $("#bSurvey").hidden = true;
    S.survey = null; S.surveyError = null; S.cells.clear(); S.touched = false; S.history = [];
    syncNext();
    if (preview) { preview.dispose(); preview = null; }
    surveyLive.textContent = "Modelling their yard. This takes about half a minute.";
    const slow = setTimeout(() => { const li = $('[data-step="photo"]', steps); if (li.dataset.state === "active") li.querySelector(".sv-note").textContent = "USGS can take 30 seconds"; }, 7000);
    try {
      surveyMod = surveyMod || await import("./yard-survey.js");
      const NOTES = { photo: "Unavailable; lawn edges come from the laser survey", streets: "Unavailable; the house faces the address point" };
      const { site, yard } = await surveyMod.survey(address, surveyMod.browserEnv(), (step, state, note, frac) => {
        if (run !== surveyRun) return;
        if (step === "address" && state === "done" && note) note = titleCase(note.replace(/, \d{5}$/, ""));
        setStep(step, state, state === "fail" ? NOTES[step] || "" : note === undefined && state === "done" ? "" : note, frac);
      });
      if (run !== surveyRun) return;
      S.survey = { site, yard };
      await showSurvey(true);
    } catch (err) {
      if (run !== surveyRun) return;
      console.error("Yard survey failed:", err);
      $$("li", steps).forEach((li) => { if (li.dataset.state === "active") { li.dataset.state = "fail"; li.querySelector(".sv-disc").innerHTML = icon("x"); } });
      /* sandboxed previews (claude.ai artifacts) block every outside request: send people to the live site */
      const LIVE = "https://coreho.github.io/midnight-lawn-co/#builder";
      const blocked = (!err || !err.code || err.code === "network" || err.code === "timeout") && !location.href.startsWith(LIVE.split("#")[0]) && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      if (blocked) showErr(`This preview can't reach the public map services it needs. The live site can: <a href="${LIVE}" target="_blank" rel="noopener">open the Lawn Builder there</a>.`, true);
      else showErr(err && err.code ? err.message : "We couldn't build the model just now. Check your connection and try again.");
      surveyLive.textContent = "";
    } finally {
      clearTimeout(slow);
      if (run === surveyRun) { go.disabled = false; go.removeAttribute("aria-busy"); syncNext(); }
    }
  });

  /* houses on the same side of the street, ordered left to right as seen from the street */
  const sameSideHouses = () => {
    const { site, yard } = S.survey, F = yard.frame;
    const z = (b) => (b.cx - F.ox) * F.nx + (b.cy - F.oy) * F.ny, x = (b) => (b.cx - F.ox) * F.rx + (b.cy - F.oy) * F.ry;
    return site.houses.map((id) => site.buildings.find((b) => b.id === id)).filter((b) => z(b) < yard.road.curbZ - 1).sort((a, b) => x(a) - x(b));
  };
  const showSurvey = async (fresh, quiet = false) => {
    const { site, yard } = S.survey;
    const box = $("#bSurvey");
    box.hidden = false;
    $("#bSurveyAddr").textContent = titleCase(yard.address.replace(/, (\d{5})$/, " $1"));
    describeYard(); describeMatch(); drawAerial();
    if (fresh) {
      const canvas = $("#yardPreview");
      try {
        const mod = await import("./render3d.js");
        preview = await mod.createLawnRender(canvas, { cols: yard.cols, rows: yard.rows, cellM: yard.cellM, setbackRows: yard.setbackRows, pieces: [], survey: S.survey }, {
          reduceMotion: reduceMotion(), view: "survey", reveal: !quiet, marker: $("#yardMarker"),
          onPickHouse: (id) => { if (site.houses.includes(id)) pickHouse(id); },
        });
        preview.setTime("day", true); preview.setView("survey", true);
        $("#yardMarker").hidden = false;
      } catch (err) {
        console.error("3D preview failed:", err);
        $("#yardPreviewStage").classList.add("no-3d");
      }
      if (!quiet) {
        if (G && !reduceMotion()) G.from(box, { autoAlpha: 0, y: 14, duration: .45, ease: "expo.out", clearProps: "all" });
        $("#bSurveyAddr").setAttribute("tabindex", "-1"); $("#bSurveyAddr").focus({ preventScroll: true });
        box.scrollIntoView({ block: "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
      }
    }
    const list = sameSideHouses(), i = list.findIndex((b) => b.id === yard.targetId);
    $("#bPrevHouse").disabled = i <= 0; $("#bNextHouse").disabled = i < 0 || i >= list.length - 1;
  };
  /* the aerial photo around the picked house, turned so the street is at the bottom like the model */
  const drawAerial = () => {
    const { site, yard } = S.survey, ph = site.photo, fig = $("#bAerialFig");
    fig.hidden = !ph; if (!ph) return;
    const cv = $("#bAerial"), x = cv.getContext("2d"), W = cv.width, Hh = cv.height, F = yard.frame, H = site.half;
    const house = site.buildings.find((b) => b.id === yard.targetId);
    const toX = (e, n) => (e - F.ox) * F.rx + (n - F.oy) * F.ry, toZ = (e, n) => (e - F.ox) * F.nx + (n - F.oy) * F.ny;
    const cx = house ? toX(house.cx, house.cy) : 0, cz = house ? toZ(house.cx, house.cy) + 5 : 0;
    const spanX = 34, mpp = spanX / W;                       /* metres per canvas pixel */
    const img = x.createImageData(W, Hh), d = img.data;
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
      const gx = cx + (i - W / 2) * mpp, gz = cz + (j - Hh / 2) * mpp;
      const e = F.ox + F.rx * gx + F.nx * gz, n = F.oy + F.ry * gx + F.ny * gz;
      const u = (e + H) / (2 * H) * ph.w - .5, v = (1 - (n + H) / (2 * H)) * ph.h - .5;
      const u0 = Math.max(0, Math.min(ph.w - 2, Math.floor(u))), v0 = Math.max(0, Math.min(ph.h - 2, Math.floor(v))), fu = Math.min(1, Math.max(0, u - u0)), fv = Math.min(1, Math.max(0, v - v0));
      const o = (j * W + i) * 4;
      for (let k = 0; k < 3; k++) {
        const p = (yy, xx) => ph.rgba[((v0 + yy) * ph.w + u0 + xx) * 4 + k];
        d[o + k] = p(0, 0) * (1 - fu) * (1 - fv) + p(0, 1) * fu * (1 - fv) + p(1, 0) * (1 - fu) * fv + p(1, 1) * fu * fv;
      }
      d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    if (!house) return;
    const P = (e, n) => [(toX(e, n) - cx) / mpp + W / 2, (toZ(e, n) - cz) / mpp + Hh / 2];
    x.lineJoin = "round";
    for (const r of house.rects) {
      const c = Math.cos(r.ang), s = Math.sin(r.ang);
      const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => P(r.cx + c * a * r.len / 2 - s * b * r.wid / 2, r.cy + s * a * r.len / 2 + c * b * r.wid / 2));
      x.beginPath(); pts.forEach(([a, b], k) => (k ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath();
      x.strokeStyle = "#2f3130"; x.lineWidth = 7; x.stroke(); x.strokeStyle = "#f5d42b"; x.lineWidth = 4; x.stroke();
    }
    const [px, py] = P(house.cx, house.cy);
    x.beginPath(); x.arc(px, py, 11, 0, Math.PI * 2); x.fillStyle = "#f5d42b"; x.fill(); x.lineWidth = 4; x.strokeStyle = "#2f3130"; x.stroke();
    x.beginPath(); x.arc(px, py, 3.5, 0, Math.PI * 2); x.fillStyle = "#2f3130"; x.fill();
  };
  const describeMatch = () => {
    const { site } = S.survey, el = $("#bSurveyMatch"), num = site.geo.number;
    if (site.geo.matchedBy === "osm") { el.className = "status ok"; el.innerHTML = `${icon("check")}<span>OpenStreetMap has number ${esc(num)} on this house, so the pin should be right.</span>`; }
    else { el.className = "status warn"; el.innerHTML = `${icon("info")}<span>Public records give the block, not the exact house, so this pin is our best guess for number ${esc(num)}. Check it against the aerial photo.</span>`; }
  };
  const describeYard = () => {
    const { site, yard } = S.survey;
    const ft = (m) => Math.round(m / .3048);
    const facts = $("#bSurveyFacts");
    if (S.surveyError) { facts.className = "status bad"; facts.innerHTML = `${icon("x")}<span>${S.surveyError}</span>`; return; }
    const trees = site.trees.filter((t) => { const F = yard.frame, x = (t.x - F.ox) * F.rx + (t.y - F.oy) * F.ry, z = (t.x - F.ox) * F.nx + (t.y - F.oy) * F.ny; return x > yard.lot.x0 && x < yard.lot.x1 && z > yard.house.frontZ && z < yard.road.curbZ + 1; }).length;
    const notes = [`About ${ft(yard.lot.x1 - yard.lot.x0)} feet wide and ${ft(yard.depthM)} feet from the house to the ${yard.walk ? "sidewalk" : "curb"}`, `${yard.lawnCells} squares of open lawn`];
    if (trees) notes.push(`${trees} tree${trees === 1 ? "" : "s"} out front`);
    facts.className = "status ok";
    facts.innerHTML = `${icon("check")}<span>${notes.join(", ")}.${yard.photoOk ? "" : " The aerial photo didn't load, so the driveway's edges are a best guess."}</span>`;
  };
  const pickHouse = (id) => {
    if (!S.survey || id === S.survey.yard.targetId) return;
    try {
      S.survey.yard = surveyMod.buildYard(S.survey.site, id);
      S.surveyError = null;
    } catch (err) {
      S.survey.yard = { ...S.survey.yard, targetId: id };
      S.surveyError = err.code ? err.message : "We couldn't map that yard.";
    }
    S.cells.clear(); S.touched = false; S.history = [];
    if (preview) { preview.setTarget(id, S.surveyError ? null : S.survey.yard); preview.setView("survey"); }
    showSurvey(false); syncNext();
  };
  const stepHouse = (d) => {
    const list = sameSideHouses(), i = list.findIndex((b) => b.id === S.survey.yard.targetId);
    const nb = list[i + d]; if (nb) pickHouse(nb.id);
  };
  $("#bPrevHouse").addEventListener("click", () => stepHouse(-1));
  $("#bNextHouse").addEventListener("click", () => stepHouse(1));

  /* ---------------- stage 2: the lawn grid (aerial view, or the 3D yard) ---------------- */
  const aerial = $("#aerial");
  /* white letters get an ink outline, coloured ones a white one, as on the home page */
  const ltr = (ch, fill, cls = "") => `<span class="pc-letter${fill === D.WHITE ? " w" : ""}${cls}" style="--fill:${fill}">${esc(ch)}</span>`;
  const pieceHtml = (p) => p.kind === "letter" ? ltr(p.ch, p.fill, " pc") : `<span class="pc pc-art">${D.byId[p.id].svg}</span>`;
  const pieceName = (p) => (p.kind === "letter" ? `letter ${p.ch}` : D.byId[p.id].name);

  const buildAerial = () => {
    [S.cols, S.rows] = dims();
    const yard3d = surveyed();
    aerial.className = `aerial shape-${yard3d ? "standard" : S.shape}`;
    aerial.style.setProperty("--cols", S.cols);
    aerial.style.setProperty("--rows", S.rows);
    let cells = "";
    for (let r = 0; r < S.rows; r++) {
      for (let c = 0; c < S.cols; c++) {
        const why = blockedReason(c, r);
        if (why) {
          const label = { setback: "", house: "", meter: "Gas meter", drive: "Driveway or walk", tree: "Tree trunk", bed: "Garden bed" }[why];
          cells += `<span class="cell blocked ${why}"${label ? ` title="${label}"` : ""}>${why === "meter" ? '<span class="meter" aria-hidden="true"></span>' : ""}</span>`;
        } else cells += `<button type="button" class="cell" data-c="${c}" data-r="${r}" tabindex="-1"></button>`;
      }
    }
    const lawnRows = S.rows - SETBACK_ROWS;
    const open = yard3d ? S.survey.yard.lawnCells : null;
    aerial.innerHTML = `
      <div class="a-house" aria-hidden="true"><span class="roof"></span><span class="porch"></span></div>
      <div class="a-drive" aria-hidden="true"></div>
      <div class="a-grid" id="aGrid" role="group" aria-label="${yard3d ? `Their lawn, ${S.cols} squares across and ${S.rows} deep from the house to the sidewalk. ${open} squares are open lawn; the rest are driveway, beds, trunks or the 5 feet by the sidewalk. Arrow keys move between open squares.` : `Lawn grid, ${S.cols} squares across and ${lawnRows} deep you can decorate, plus ${SETBACK_ROWS} rows by the sidewalk we keep clear`}">${cells}
        <span class="setback-label" aria-hidden="true">5 ft from the sidewalk: no stakes</span></div>
      <div class="a-walk" aria-hidden="true"><span>Sidewalk</span></div>
      <div class="a-strip" aria-hidden="true"><span>City strip, never used</span></div>
      <div class="a-road" aria-hidden="true"><span class="lane"></span></div>
      ${!yard3d && S.shape === "corner" ? '<div class="a-side" aria-hidden="true"><span class="lane"></span></div>' : ""}`;
    const first = $(".cell:not(.blocked)", aerial);
    if (first) first.tabIndex = 0;
    S.cells.forEach((p, k) => { const [c, r] = k.split(",").map(Number); if (c >= S.cols || r >= S.rows || blockedReason(c, r)) S.cells.delete(k); });
    $(".aerial-wrap").classList.toggle("is-sr", !!yard3d);
    $("#yardWrap").hidden = !yard3d;
    if (!yard3d) sizeCells();
    paint();
  };
  const sizeCells = () => {
    const wrap = $(".aerial-wrap");
    const avail = wrap.clientWidth - 24;
    const extra = S.shape === "corner" ? 3.6 : 3.4;   /* driveway, or the side street on a corner lot, plus margins, in cells */
    const cell = Math.max(S.fit ? 10 : 32, Math.min(56, Math.floor(avail / (S.cols + extra))));
    aerial.style.setProperty("--cell", cell + "px");
    aerial.classList.toggle("fit", S.fit);
    wrap.classList.toggle("fitting", S.fit);
    wrap.classList.toggle("scrolls", S.fit || aerial.offsetWidth > wrap.clientWidth);
    const fitBtn = $("#bFit");
    fitBtn.setAttribute("aria-pressed", String(S.fit));
    fitBtn.textContent = S.fit ? "Back to full-size squares" : "fit the whole lawn on screen";
  };
  /* view-only overview: the whole lawn at fit-to-width, too small to place on */
  $("#bFit").addEventListener("click", () => { S.fit = !S.fit; sizeCells(); say(S.fit ? "Whole lawn view. Switch back to full-size squares to place pieces." : "Full-size squares. Tap to place pieces."); });
  window.addEventListener("resize", () => { if (S.stage === 2 && !surveyed()) sizeCells(); });

  const cellEl = (c, r) => $(`.cell[data-c="${c}"][data-r="${r}"]`, aerial);
  const paint = () => {
    $$(".cell[data-c]", aerial).forEach((el) => {
      const p = S.cells.get(key(+el.dataset.c, +el.dataset.r));
      el.innerHTML = p ? pieceHtml(p) : "";
      el.classList.toggle("filled", !!p);
      el.draggable = !!p;
      el.setAttribute("aria-label", `Row ${+el.dataset.r + 1}, square ${+el.dataset.c + 1}: ${p ? pieceName(p) : "empty"}`);
    });
    if (editor) editor.setPieces(pieces(), { plant: S.planted });
    S.planted = [];
    summarize();
  };

  /* ---------------- placing, moving, erasing ---------------- */
  const live = $("#bLive");
  const say = (msg, tone = "info") => {
    const extra = S.pkgNote; S.pkgNote = "";
    live.className = `status ${tone}`; live.innerHTML = `${icon(tone === "bad" ? "x" : tone === "ok" ? "check" : "info")}<span>${msg}${extra ? ` ${extra}` : ""}</span>`;
  };
  const snapshot = () => { S.touched = true; S.history.push(JSON.stringify([...S.cells])); if (S.history.length > 60) S.history.shift(); };
  /* the aerial grid plants its pieces here; the 3D yard plants them from S.planted in paint() */
  const plant = (els) => { if (G && !reduceMotion() && els.length && !surveyed()) G.from(els.filter(Boolean).map((e) => e.firstElementChild).filter(Boolean), { y: -18, scale: 1.25, autoAlpha: 0, duration: .4, ease: "back.out(2)", stagger: .03 }); };
  const newLetter = (ch) => ({ kind: "letter", ch, fill: D.letterFill(S.letterCount++) });

  const placeAt = (c, r) => {
    const b = S.brush;
    if (b && b.kind !== "erase" && blockedReason(c, r)) { say(BLOCK_SAY[blockedReason(c, r)] || "Pieces can't go there.", "bad"); return; }
    if (!b) { say(S.cells.has(key(c, r)) ? "Drag a piece to move it, or pick the eraser to remove it." : "Pick something from the catalog first, then tap a square."); return; }
    if (b.kind === "erase") {
      if (!S.cells.has(key(c, r))) return;
      snapshot(); const name = pieceName(S.cells.get(key(c, r))); S.cells.delete(key(c, r)); paint(); say(`Removed the ${name}.`); return;
    }
    if (b.kind === "message") {
      const chars = [...b.text];
      for (let i = 0; i < chars.length; i++) {
        const cc = c + i;
        if (cc >= S.cols || (chars[i] !== " " && blockedReason(cc, r)) || (chars[i] === " " && cc < S.cols && blockedReason(cc, r) === "house")) {
          say(surveyed() ? `"${b.text}" needs ${chars.length} open squares in a row from here, and something's in the way. Try another row or start further left.` : `"${b.text}" needs ${chars.length} squares in a row from here. Start further left or pick a bigger lawn.`, "bad"); return;
        }
      }
      snapshot();
      const touched = [];
      chars.forEach((ch, i) => { if (ch !== " ") { S.cells.set(key(c + i, r), newLetter(ch)); touched.push([c + i, r]); } else S.cells.delete(key(c + i, r)); });
      S.planted = touched.map(([x, y]) => key(x, y));
      const els = touched.map(([x, y]) => cellEl(x, y));
      paint(); plant(els);
      say(`Placed "${b.text}". Tap another spot to place it again, or pick something else.`, "ok");
      return;
    }
    snapshot();
    const piece = b.kind === "letter" ? newLetter(b.ch) : { kind: "item", id: b.id };
    S.cells.set(key(c, r), piece);
    S.planted = [key(c, r)];
    paint(); plant([cellEl(c, r)]);
    say(`Placed a ${pieceName(piece)}.`, "ok");
  };
  const movePiece = (from, c, r) => {
    const [fc, fr] = from.split(",").map(Number);
    if (fc === c && fr === r) return;
    if (blockedReason(c, r)) { say(BLOCK_SAY[blockedReason(c, r)] || "Pieces can't go there.", "bad"); paint(); return; }
    if (S.cells.has(key(c, r))) { say("That square is taken. Drop it on an empty one.", "bad"); paint(); return; }
    snapshot(); S.cells.set(key(c, r), S.cells.get(from)); S.cells.delete(from); S.planted = [key(c, r)]; paint(); plant([cellEl(c, r)]);
  };

  aerial.addEventListener("click", (e) => {
    const el = e.target.closest(".cell[data-c]");
    if (el) placeAt(+el.dataset.c, +el.dataset.r);
  });
  /* drag a placed piece to another square, or a catalog piece onto the lawn (mouse) */
  aerial.addEventListener("dragstart", (e) => { const el = e.target.closest(".cell.filled"); if (el) e.dataTransfer.setData("text/mlc-move", key(+el.dataset.c, +el.dataset.r)); });
  aerial.addEventListener("dragover", (e) => { if (e.target.closest(".cell[data-c]")) e.preventDefault(); });
  aerial.addEventListener("drop", (e) => {
    const el = e.target.closest(".cell[data-c]"); if (!el) return;
    e.preventDefault();
    const c = +el.dataset.c, r = +el.dataset.r;
    const move = e.dataTransfer.getData("text/mlc-move");
    if (move) { movePiece(move, c, r); return; }
    const brush = e.dataTransfer.getData("text/mlc-brush");
    if (brush) { setBrush(JSON.parse(brush)); placeAt(c, r); }
  });
  /* arrow keys move around the grid; Enter or Space places; Delete erases */
  aerial.addEventListener("keydown", (e) => {
    const el = e.target.closest(".cell[data-c]"); if (!el) return;
    let c = +el.dataset.c, r = +el.dataset.r;
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (step) {
      e.preventDefault();
      for (let i = 0; i < 40; i++) {
        c += step[0]; r += step[1];
        if (c < 0 || r < 0 || c >= S.cols || r >= S.rows) return;
        const next = cellEl(c, r);
        if (next) { el.tabIndex = -1; next.tabIndex = 0; next.focus(); return; }
      }
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (S.cells.has(key(c, r))) { snapshot(); S.cells.delete(key(c, r)); paint(); cellEl(c, r).focus(); say("Removed."); }
    }
  });
  /* in the 3D yard the grid buttons are off screen; the focused square is drawn in the model */
  aerial.addEventListener("focusin", (e) => { const el = e.target.closest(".cell[data-c]"); if (el && editor) editor.setFocusCell(+el.dataset.c, +el.dataset.r); });
  aerial.addEventListener("focusout", () => { if (editor) editor.setFocusCell(null); });

  /* ---------------- stage 2, address: decorate the 3D yard ---------------- */
  let editor = null;
  const pieces = () => [...S.cells].map(([k, p]) => { const [c, r] = k.split(",").map(Number); return { c, r, ...p, h: p.kind === "letter" ? D.LETTER_HEIGHT : D.byId[p.id].h, svg: p.kind === "item" ? D.byId[p.id].svg : null }; });
  const startEditor = async () => {
    const msg = $("#yardMsg");
    msg.hidden = false; msg.textContent = "Setting out their lawn…";
    try {
      const mod = await import("./render3d.js");
      if (editor) editor.dispose();
      const y = S.survey.yard;
      editor = await mod.createLawnRender($("#yard3d"), { cols: y.cols, rows: y.rows, cellM: y.cellM, setbackRows: y.setbackRows, pieces: pieces(), survey: S.survey }, {
        reduceMotion: reduceMotion(), edit: true, view: S.yview || "overhead",
        onCellClick: (c, r) => placeAt(c, r),
        onPieceMove: (from, c, r) => movePiece(from, c, r),
      });
      editor.setTime("day", true); setYView(S.yview || "overhead", true);
      msg.hidden = true;
    } catch (err) {
      console.error("3D editor failed:", err);
      msg.textContent = "The 3D yard couldn't start here. It needs WebGL. You can still decorate with the keyboard, or go back and pick a typical lawn.";
    }
  };
  const setYView = (v, instant) => {
    S.yview = v; $$("[data-yview]", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.yview === v)));
    if (editor) editor.setView(v, instant);
  };
  root.addEventListener("click", (e) => { const b = e.target.closest("[data-yview]"); if (b) setYView(b.dataset.yview); });

  /* ---------------- the catalog ---------------- */
  const tabs = $("#bTabs"), shelf = $("#bShelf");
  tabs.innerHTML = D.CATEGORIES.map((c) => `<button type="button" role="tab" class="tab" id="tab-${c.id}" aria-selected="${c.id === S.cat}" aria-controls="bShelf" data-cat="${c.id}">${c.name}</button>`).join("");
  const brushLabel = (b) => !b ? "" : b.kind === "erase" ? "the eraser" : b.kind === "message" ? `"${b.text}"` : b.kind === "letter" ? `the letter ${b.ch}` : D.byId[b.id].name;
  const setBrush = (b) => {
    S.brush = b;
    $$("[data-brush]", root).forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.brush === JSON.stringify(b))));
    $("#bErase").setAttribute("aria-pressed", String(!!b && b.kind === "erase"));
    if (b) say(b.kind === "erase" ? "Eraser on. Tap a piece to remove it." : `Tap ${surveyed() ? "white squares on their lawn" : "squares"} to place ${brushLabel(b)}. Drag pieces on the lawn to move them.`);
  };
  const tile = (b, inner, label) => `<button type="button" class="tile" data-brush='${esc(JSON.stringify(b))}' aria-pressed="false" draggable="true" title="${esc(label)}"><span class="tile-art">${inner}</span><span class="tile-name">${esc(label)}</span></button>`;
  const renderShelf = () => {
    $$(".tab", tabs).forEach((t) => t.setAttribute("aria-selected", String(t.dataset.cat === S.cat)));
    shelf.setAttribute("aria-labelledby", `tab-${S.cat}`);
    if (S.cat === "letters") {
      shelf.innerHTML = `<div class="word-maker"><label for="bWord">Type a word to place</label><div class="word-row"><input type="text" id="bWord" maxlength="20" autocomplete="off" spellcheck="false" placeholder="MAYA"><button type="button" class="btn small ink" id="bWordUse">Use word <span class="disc" aria-hidden="true">${icon("chev")}</span></button></div></div>
        <div class="tiles letters">${D.LETTERS.map((ch, i) => tile({ kind: "letter", ch }, ltr(ch, D.letterFill(i)), ch)).join("")}</div>`;
    } else if (S.cat === "messages") {
      shelf.innerHTML = `<p class="hint">A message fills squares to the right of where you tap.</p><div class="msg-list">${D.MESSAGES.map((m) => `<button type="button" class="msg" data-brush='${esc(JSON.stringify({ kind: "message", text: m }))}' aria-pressed="false" draggable="true">${[...m].map((ch, i) => (ch === " " ? '<span class="gap"></span>' : ltr(ch, D.letterFill(i)))).join("")}<span class="sr-only">${esc(m)}, ${m.replace(/ /g, "").length} letters</span></button>`).join("")}</div>`;
    } else {
      shelf.innerHTML = `<div class="tiles">${D.ITEMS.filter((it) => it.cat === S.cat).map((it) => tile({ kind: "item", id: it.id }, it.svg, it.name)).join("")}</div>`;
    }
    setBrush(S.brush);
  };
  tabs.addEventListener("click", (e) => { const t = e.target.closest(".tab"); if (t) { S.cat = t.dataset.cat; renderShelf(); } });
  tabs.addEventListener("keydown", (e) => {
    const list = $$(".tab", tabs), i = list.indexOf(document.activeElement);
    if (i < 0 || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault(); const n = list[(i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length]; n.focus(); n.click();
  });
  shelf.addEventListener("click", (e) => {
    const t = e.target.closest("[data-brush]");
    if (t) { const b = JSON.parse(t.dataset.brush); setBrush(S.brush && JSON.stringify(S.brush) === t.dataset.brush ? null : b); }
    if (e.target.closest("#bWordUse")) useWord();
  });
  shelf.addEventListener("keydown", (e) => { if (e.target.id === "bWord" && e.key === "Enter") { e.preventDefault(); useWord(); } });
  shelf.addEventListener("dragstart", (e) => { const t = e.target.closest("[data-brush]"); if (t) e.dataTransfer.setData("text/mlc-brush", t.dataset.brush); });
  const useWord = () => {
    const w = $("#bWord").value.toUpperCase().replace(/[^A-Z0-9!&? ]/g, "").replace(/\s+/g, " ").trim();
    if (!w) { say("Type a word first. Letters, numbers, and ! & ? only.", "bad"); return; }
    setBrush({ kind: "message", text: w });
  };
  $("#bErase").addEventListener("click", () => setBrush(S.brush && S.brush.kind === "erase" ? null : { kind: "erase" }));
  $("#bUndo").addEventListener("click", () => {
    const prev = S.history.pop(); if (!prev) { say("Nothing to undo."); return; }
    S.cells = new Map(JSON.parse(prev)); paint(); say("Undone.");
  });
  $("#bClear").addEventListener("click", () => { if (!S.cells.size) return; snapshot(); S.cells.clear(); paint(); say("Lawn cleared. Undo brings it back."); });

  /* ---------------- summary: package, price, letter stock ---------------- */
  const MLC = window.MLC;
  const nightInput = $("#bNight");
  if (MLC) { nightInput.min = MLC.toISO(new Date()); nightInput.value = MLC.toISO(MLC.nextWeekday(6)); }
  nightInput.addEventListener("change", () => summarize());

  /* Reading order: rows from the house to the street, letters left to right; gaps split words. */
  const messageText = () => {
    const rows = [];
    for (let r = 0; r < S.rows; r++) {
      let line = "", gap = false;
      for (let c = 0; c < S.cols; c++) {
        const p = S.cells.get(key(c, r));
        if (p && p.kind === "letter") { if (gap && line) line += " "; line += p.ch; gap = false; } else gap = true;
      }
      if (line) rows.push(line);
    }
    return rows.join(" ");
  };
  const tally = () => {
    let letters = 0, graphics = 0, flamingos = 0;
    S.cells.forEach((p) => { if (p.kind === "letter") letters++; else { graphics++; if (p.id === "flamingo") flamingos++; } });
    return { letters, graphics, flamingos, msg: messageText() };
  };
  const packageFor = (t) => {
    if (!t.letters && !t.graphics) return null;
    if (!t.letters && t.graphics === t.flamingos) return { key: "flock", name: "Flocking, 24 hours", price: 75 };
    if (t.letters <= 22 && t.graphics <= 2) return { key: "classic", name: "Classic, 24 hours", price: 95 };
    return { key: "deluxe", name: "Deluxe, 48 hours", price: 145 };
  };
  const summarize = () => {
    const t = tally(), pkg = packageFor(t);
    const counts = `${t.letters} letter${t.letters === 1 ? "" : "s"}, ${t.graphics} graphic${t.graphics === 1 ? "" : "s"}`;
    $("#bCounts").textContent = $("#bCountsMini").textContent = counts;
    $("#bPkg").textContent = pkg ? pkg.name : "Nothing on the lawn yet";
    $("#bPkgMini").textContent = pkg ? pkg.name.split(",")[0] : "Nothing yet";
    $("#bPrice").textContent = $("#bPriceMini").textContent = pkg ? `$${pkg.price}` : "$0";
    /* say so whenever the package (and so the price) changes, and pop the price */
    const key = pkg ? pkg.key : "";
    if (S.pkgKey !== undefined && key !== S.pkgKey && pkg) {
      S.pkgNote = `That makes it a ${pkg.name.split(",")[0]}, $${pkg.price}.`;
      if (G && !reduceMotion()) G.fromTo(["#bPrice", "#bPriceMini"], { scale: 1.3 }, { scale: 1, duration: .5, ease: "back.out(3)", overwrite: true });
    }
    S.pkgKey = key;
    const notes = [];
    if (pkg && pkg.key === "deluxe") notes.push(["info", t.letters > 22
      ? `${t.letters} letters makes this a Deluxe, $145 for 48 hours. Classic fits 22.`
      : `${t.graphics} graphics makes this a Deluxe, $145 for 48 hours. Take ${t.graphics - 2} off to stay Classic at $95.`]);
    if (t.letters > 32) notes.push(["bad", `That's ${t.letters} letters; Deluxe fits 32. Take a few off.`]);
    if (t.graphics - t.flamingos > 25) notes.push(["bad", `We stock about 25 theme pieces and this uses ${t.graphics - t.flamingos}. Take a few off.`]);
    if (t.flamingos > 24) notes.push(["bad", `Our flock is 24 flamingos and this uses ${t.flamingos}.`]);
    if (MLC && t.letters && nightInput.value) {
      const night = MLC.fromISO(nightInput.value), off = MLC.dayOffset(night);
      const nights = pkg && pkg.key === "deluxe" ? 2 : 1;
      if (off >= 0) {
        const { need, free, short } = MLC.checkStock(t.msg, off, nights);
        notes.push(short.length
          ? ["bad", `We're short on ${MLC.fmtDay(night)}: ${short.map((c) => `${c} (${need[c] - free[c]})`).join(", ")}. Try another night.`]
          : ["ok", `All ${t.letters} letters are free on ${MLC.fmtDay(night)}.`]);
      } else notes.push(["bad", "That night has passed. Pick tonight or later."]);
    }
    $("#bNotes").innerHTML = notes.map(([tone, m]) => `<p class="status ${tone}">${icon({ bad: "x", ok: "check", info: "info" }[tone])}<span>${m}</span></p>`).join("");
    $("#bRenderBtn").disabled = !pkg;
    $("#bBook").toggleAttribute("aria-disabled", !pkg);
    return { t, pkg };
  };

  /* ---------------- stages ---------------- */
  const goStage = (n) => {
    if (n === 2 && S.mode === "address" && !(S.survey && !S.surveyError)) { addrInput.focus(); showErr(S.surveyError || "Model their yard first: type the address and press Model their yard."); return; }
    S.stage = n;
    $$("[data-bstage]", root).forEach((s) => (s.hidden = s.dataset.bstage !== String(n)));
    $$("#bSteps li", root).forEach((li, i) => {
      li.classList.toggle("done", i + 1 < n);
      if (i + 1 === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    const shown = $(`[data-bstage="${n}"]`, root);
    if (G && !reduceMotion()) G.from(shown, { autoAlpha: 0, y: 14, duration: .4, ease: "expo.out", clearProps: "all" });
    const h = $("h2", shown); h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
    $("#bSteps").scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" });
    if (n === 2) {
      const y3 = surveyed();
      $("#b2Title").textContent = y3 ? "Decorate their lawn" : "Decorate it from above";
      $("#b2Lead").textContent = y3
        ? "Their real front yard, modelled from survey data. Pick a piece, then tap a white square. Drag a piece to move it; drag the lawn to turn the view, and pinch or scroll to zoom."
        : "Pick a piece from the catalog, then tap squares on the lawn. Drag pieces to move them. The two rows by the sidewalk stay clear, since we keep stakes 5 feet back.";
      $("#b2Back").textContent = y3 ? "Change the address or the house" : "Change the lawn's shape or size";
      if (!S.touched) seed();
      buildAerial(); renderShelf();
      if (y3) startEditor();
    }
    if (n !== 2 && editor) { editor.dispose(); editor = null; }
    /* one live WebGL scene at a time: the house picker only runs on stage 1 */
    if (n !== 1 && preview) { preview.dispose(); preview = null; }
    if (n === 1 && !preview && S.survey && S.mode === "address") showSurvey(true, true);
    if (n === 3) startRender();
    if (n !== 3 && renderer) { renderer.dispose(); renderer = null; }
  };
  root.addEventListener("click", (e) => {
    const go = e.target.closest("[data-bgo]");
    if (go) goStage(+go.dataset.bgo);
  });

  /* ---------------- stage 3: the render ---------------- */
  let renderer = null;
  const model = () => ({
    cols: S.cols, rows: S.rows, cellM: CELL_FT * .3048, shape: S.shape, setbackRows: SETBACK_ROWS,
    cornerHouseRows: CORNER_HOUSE_ROWS, cornerSideCols: CORNER_SIDE_COLS,
    blocked: (c, r) => blockedReason(c, r),
    pieces: pieces(),
    survey: surveyed() ? S.survey : null,
  });
  const startRender = async () => {
    const stage = $("#renderStage"), msg = $("#renderMsg");
    msg.hidden = false; msg.textContent = surveyed() ? "Setting up their yard…" : "Setting up the lawn…";
    $("#renderChip").textContent = surveyed() ? "Model from public survey data. Real pieces are 18-inch coroplast." : "Illustration. Real pieces are 18-inch coroplast.";
    $("#b3Title").textContent = surveyed() ? "Here's their yard" : "Here's their lawn";
    try {
      const mod = await import("./render3d.js");
      if (renderer) renderer.dispose();
      renderer = await mod.createLawnRender($("#lawn3d"), model(), { reduceMotion: reduceMotion() });
      msg.hidden = true;
      /* small screens open on the walk-up view, where 18-inch letters are big enough to read */
      const firstView = S.view || (stage.clientWidth < 600 ? "close" : "street");
      setTime(S.time || "night", true);
      setView(firstView, true);
      const shots = await renderer.shots();
      $("#bShots").innerHTML = shots.map((s) => `<button type="button" class="shot-btn" data-view="${s.view}" data-time="${s.time}"><img src="${s.url}" alt=""><span>${esc(s.label)}</span></button>`).join("");
      setTime(S.time || "night", true); setView(firstView, true);
    } catch (err) {
      console.error("Lawn Builder 3D view failed:", err);
      msg.hidden = false;
      msg.textContent = "The 3D view couldn't start here. It needs WebGL and an internet connection. Your lawn plan is saved; go back to see it from above.";
      stage.classList.add("no-3d");
    }
  };
  const setView = (v, instant) => {
    S.view = v; $$("[data-angle]", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.angle === v)));
    if (renderer) renderer.setView(v, instant);
  };
  const setTime = (t, instant) => {
    S.time = t; $$("[data-time-set]", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.timeSet === t)));
    $("#renderStage").dataset.time = t;
    if (renderer) renderer.setTime(t, instant);
  };
  root.addEventListener("click", (e) => {
    const a = e.target.closest("[data-angle]"); if (a) setView(a.dataset.angle);
    const t = e.target.closest("[data-time-set]"); if (t) setTime(t.dataset.timeSet);
    const shot = e.target.closest(".shot-btn"); if (shot) { setTime(shot.dataset.time); setView(shot.dataset.view); }
  });

  /* ---------------- hand-off to booking ---------------- */
  $("#bBook").addEventListener("click", (e) => {
    e.preventDefault();
    const { t, pkg } = summarize();
    if (!pkg) { say("Put something on the lawn first.", "bad"); return; }
    let street = "", city = "";
    if (surveyed()) {
      const m = S.survey.yard.address.match(/^(.*?),\s*([^,]+),\s*MI/i);
      if (m) { street = m[1].replace(/\b([A-Z])([A-Z]+)\b/g, (x, a, b) => a + b.toLowerCase()); city = m[2].replace(/\b([A-Z])([A-Z]+)\b/g, (x, a, b) => a + b.toLowerCase()); }
    }
    if (MLC) MLC.prefill({ msg: t.msg || "", night: nightInput.value, pkg: pkg.key, street, city });
    location.hash = "#book";
  });

  /* start: a little example on the lawn so the grid isn't blank when someone arrives. It's a
     random Halloween saying this season, wrapped to the lawn, with a pumpkin and a ghost. */
  const wrap = (text, width) => {
    const lines = [];
    for (const w of text.split(" ")) { const last = lines[lines.length - 1]; if (last && last.length + 1 + w.length <= width) lines[lines.length - 1] = `${last} ${w}`; else lines.push(w); }
    return lines.some((l) => l.length > width) ? null : lines;
  };
  const decorate = (at, len) => {
    const free = (c, r) => c >= 0 && r >= 0 && c < S.cols && r < S.rows && !blockedReason(c, r) && !S.cells.has(key(c, r));
    if (free(at.c - 1, at.r)) S.cells.set(key(at.c - 1, at.r), { kind: "item", id: "pumpkin" });
    if (free(at.c + len, at.r)) S.cells.set(key(at.c + len, at.r), { kind: "item", id: "ghost" });
  };
  const seed = () => {
    S.cells.clear(); S.letterCount = 0;
    [S.cols, S.rows] = dims();
    if (surveyed()) { seedYard(); return; }
    const top = S.shape === "corner" ? CORNER_HOUSE_ROWS : 1, usable = S.rows - SETBACK_ROWS - top;
    let lines = null;
    for (let tries = 0; tries < 12 && !lines; tries++) { const l = wrap(D.saying(), S.cols - 2); if (l && l.length <= usable) lines = l; }
    lines = lines || ["BOO!"];
    const gap = lines.length * 2 - 1 <= usable ? 2 : 1;
    let last = null;
    lines.forEach((text, i) => {
      const r = top + i * gap, c0 = Math.max(0, Math.floor((S.cols - text.length) / 2));
      [...text].forEach((ch, k) => { if (ch !== " ") S.cells.set(key(c0 + k, r), newLetter(ch)); });
      last = { c: c0, r, len: text.length };
    });
    decorate(last, last.len);
  };
  /* on a real yard, find open runs of lawn for the example. Lines read from the house toward the
     street, one empty row apart so each line stands clear of the one behind it. */
  const seedYard = () => {
    const free = (c, r) => c >= 0 && r >= 0 && c < S.cols && r < S.rows && !blockedReason(c, r) && !S.cells.has(key(c, r));
    const runAt = (len, r) => {
      let best = null;
      for (let c = 0; c + len <= S.cols; c++) {
        let ok = true; for (let i = 0; i < len; i++) if (!free(c + i, r)) { ok = false; break; }
        if (ok && (!best || Math.abs(c + len / 2 - S.cols / 2) < Math.abs(best.c + len / 2 - S.cols / 2))) best = { c, r };
      }
      return best;
    };
    const plan = (lines) => {
      /* try every starting row; keep the layout that sits nearest the middle of the open lawn */
      let best = null;
      for (let r0 = 0; r0 < S.rows; r0++) {
        const at = []; let r = r0;
        for (const text of lines) {
          let spot = null;
          for (let rr = r; rr < Math.min(S.rows, r + 3) && !spot; rr++) spot = runAt(text.length, rr);
          if (!spot) break;
          at.push(spot); r = spot.r + 2;
        }
        if (at.length !== lines.length) continue;
        const mid = (at[0].r + at[at.length - 1].r) / 2, score = Math.abs(mid - (S.rows - SETBACK_ROWS) / 2);
        if (!best || score < best.score) best = { at, lines, score };
      }
      return best;
    };
    let layout = null;
    for (let tries = 0; tries < 12 && !layout; tries++) {
      const saying = D.saying();
      for (const width of [S.cols - 2, 12, 9, 6]) { const lines = wrap(saying, width); if (lines && (layout = plan(lines))) break; }
    }
    layout = layout || plan(["BOO!"]);
    if (!layout) return;
    layout.lines.forEach((text, i) => [...text].forEach((ch, k) => { if (ch !== " ") S.cells.set(key(layout.at[i].c + k, layout.at[i].r), newLetter(ch)); }));
    const last = layout.at[layout.at.length - 1];
    decorate(last, layout.lines[layout.lines.length - 1].length);
  };
  setMode(S.mode);
  window.LawnBuilder = { goStage };
})();
