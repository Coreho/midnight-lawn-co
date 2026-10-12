/* Midnight Lawn Co. mockup — sign rendering, letter math, booking flow, crew view.
   Everything runs in the browser with sample data; nothing is sent anywhere. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const G = window.gsap || null;
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const money = (n) => "$" + n.toLocaleString("en-US");
  const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  /* ---------------- dates (local, day-precision) ---------------- */
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const TODAY = startOfDay(new Date());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fromISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const dayOffset = (d) => Math.round((startOfDay(d) - TODAY) / 864e5);
  const fmtDay = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const nextWeekday = (wd) => { const off = ((wd - TODAY.getDay() + 7) % 7) || 7; return addDays(TODAY, off); };
  const hoursUntilSetup = (d) => (new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23) - new Date()) / 36e5;
  const isWinter = (d) => [10, 11, 0, 1, 2].includes(d.getMonth());

  /* ---------------- business rules (from the startup guide) ---------------- */
  const PACKAGES = {
    classic: { name: "Classic", price: 95, nights: 1, maxLetters: 22, graphics: 2, label: "Classic, 24 hours" },
    deluxe: { name: "Deluxe", price: 145, nights: 2, maxLetters: 32, graphics: 5, label: "Deluxe, 48 hours" },
    flock: { name: "Flocking", price: 75, nights: 1, maxLetters: 0, graphics: 24, label: "Flocking, 24 hours" },
  };
  const EXTRA_DAY = 25, RUSH = 20;
  const ZONES = [
    { fee: 0, label: "Zone 1, within 10 miles", cities: ["Lincoln Park", "Allen Park", "Southgate", "Wyandotte", "Ecorse", "River Rouge", "Melvindale", "Dearborn", "Taylor", "Riverview", "Detroit: Southwest or Downtown"] },
    { fee: 15, label: "Zone 2, within 20 miles", cities: ["Detroit: other neighborhoods", "Dearborn Heights", "Inkster", "Romulus", "Westland", "Garden City", "Redford", "Livonia", "Wayne", "Trenton", "Grosse Ile", "Woodhaven", "Brownstown", "Flat Rock", "Hamtramck", "Highland Park", "Harper Woods", "Grosse Pointe (any)"] },
    { fee: 30, label: "Zone 3, rest of Wayne County", cities: ["Canton", "Plymouth", "Northville", "Belleville", "Van Buren Township", "Sumpter Township", "Huron Township", "Rockwood"] },
  ];
  const zoneOf = (city) => ZONES.find((z) => z.cities.includes(city)) || null;

  /* Letter stock: two 84-piece 18-inch sets plus about 20 extra common letters (sample split). */
  const INVENTORY = (() => {
    const inv = {};
    const set = (chars, n) => [...chars].forEach((c) => (inv[c] = n));
    set("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2);
    set("BCGLMUW", 4);
    set("DHINORSTPY", 6);
    inv.A = 10; inv.E = 12;
    set("0123456789", 4);
    inv["!"] = 4; inv["&"] = 2; inv["?"] = 2;
    return inv;
  })();
  const ALLOWED = /[A-Z0-9!&?]/;

  /* Sample bookings already on the calendar (offset = setup night relative to today). */
  const BOOKINGS = (() => {
    const list = [
      { id: "ML-1042", off: 0, pkg: "classic", msg: "HAPPY BIRTHDAY JAYDEN" },
      { id: "ML-1043", off: 0, pkg: "deluxe", msg: "CONGRATS AVERY 2027" },
      { id: "ML-1045", off: 0, pkg: "flock", msg: "" },
      { id: "ML-1046", off: 0, pkg: "classic", msg: "HAPPY 40TH DENISE" },
      { id: "ML-1047", off: 1, pkg: "classic", msg: "HAPPY BIRTHDAY SOFIA" },
    ];
    for (let off = 2; off <= 70; off++) {
      const wd = addDays(TODAY, off).getDay();
      if (wd === 4) list.push({ off, pkg: "classic", msg: "HAPPY 7TH BIRTHDAY LEO" });
      if (wd === 5) list.push({ off, pkg: "classic", msg: "HAPPY BIRTHDAY EMMA" }, { off, pkg: "classic", msg: "CONGRATS CLASS OF 2027" });
      if (wd === 6) list.push({ off, pkg: "classic", msg: "HAPPY RETIREMENT STEVE" }, { off, pkg: "deluxe", msg: "HAPPY BIRTHDAY ELLIE" }, { off, pkg: "classic", msg: "WELCOME HOME BREE" });
    }
    return list;
  })();

  const countLetters = (msg) => {
    const need = {};
    for (const c of msg.toUpperCase()) if (ALLOWED.test(c)) need[c] = (need[c] || 0) + 1;
    return need;
  };
  const letterTotal = (need) => Object.values(need).reduce((a, b) => a + b, 0);

  /* Letters free on every night of [off, off + nights): stock minus the busiest overlapping night. */
  const freeLetters = (off, nights, ignoreId) => {
    const worst = {};
    for (let n = off; n < off + nights; n++) {
      const used = {};
      for (const b of BOOKINGS) {
        if (b.id && b.id === ignoreId) continue;
        const span = PACKAGES[b.pkg].nights;
        if (n >= b.off && n < b.off + span) for (const [c, k] of Object.entries(countLetters(b.msg))) used[c] = (used[c] || 0) + k;
      }
      for (const [c, k] of Object.entries(used)) worst[c] = Math.max(worst[c] || 0, k);
    }
    const free = {};
    for (const c of Object.keys(INVENTORY)) free[c] = Math.max(0, INVENTORY[c] - (worst[c] || 0));
    return free;
  };

  const checkStock = (msg, off, nights) => {
    const need = countLetters(msg);
    const free = freeLetters(off, nights);
    const short = Object.keys(need).filter((c) => need[c] > (free[c] || 0));
    return { need, free, short };
  };

  /* ---------------- spelling ---------------- */
  const WORDS = new Set(("HAPPY BIRTHDAY BDAY CONGRATS CONGRATULATIONS GRAD GRADUATE GRADUATION CLASS OF WELCOME HOME BABY BOY GIRL ITS IT'S " +
    "THE AND YOU YOUR YOU'RE LOVE MOM DAD MOMMY DADDY GRANDMA GRANDPA NANA PAPA ANNIVERSARY RETIREMENT RETIRED SWEET SIXTEEN GET WELL SOON " +
    "THANK THANKS TEACHER NURSE HERO CHAMPS CHAMPION CHAMPIONS STATE TEAM SENIOR SENIORS BEST FRIEND FRIENDS ENGAGED MARRY WILL JUST MARRIED " +
    "NEW PROUD PROUDOF OLD YEARS YEAR BIRTHDAY GIRL KING QUEEN PRINCESS PRINCE FINALLY FOREVER CONGRADS ADOPTION GOTCHA DAY WAY GO NUMBER ONE " +
    "SURPRISE CELEBRATE WE MISS YOU MISSED BACK WELCOMEHOME FIRST LAST TURNING TURNS OVER HILL BLESSED SCHOOL COLLEGE HIGH " +
    "HALLOWEEN TRICK TRICKS TREAT TREATS BOO SPOOKY SCARY CREEP REAL HOCUS POCUS STAY CREW SEASON HAUNTING HAUNTED GHOST GHOSTS GHOUL GHOULS " +
    "WITCH WITCHES PUMPKIN SMELL FEET EAT DRINK BEWARE GREETINGS").split(/\s+/));
  const osa = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  };
  const spellSuggestions = (msg) => {
    const out = [];
    for (const word of msg.toUpperCase().split(/\s+/).filter(Boolean)) {
      const bare = word.replace(/[^A-Z]/g, "");
      if (bare.length < 4 || WORDS.has(bare)) continue;
      const limit = bare.length >= 7 ? 2 : 1;
      let best = null, bestD = 99;
      for (const w of WORDS) { if (Math.abs(w.length - bare.length) > limit) continue; const dist = osa(bare, w); if (dist < bestD) { bestD = dist; best = w; } }
      if (best && bestD > 0 && bestD <= limit) out.push({ word: bare, fix: best });
    }
    return out;
  };

  /* ---------------- the sign ---------------- */
  const crook = (i) => { const r = [-4, 3, -2, 4, -3, 1.5, 3.5, -2.5][i % 8]; const dy = [0, -2, 2, 0, -3, 1, 0, -1][i % 8]; return `--r:${r}deg;--dy:${dy}px`; };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* Renders `msg` onto a panel. redFrom: index where red letters start. Animates letters from the first changed index. */
  /* A panel shows exactly the tracks its message uses, so no sign carries a bare track. */
  const fitRows = (panel) => {
    if (!panel.offsetParent) return;
    const tops = new Set($$(".word", panel).map((w) => w.offsetTop));
    panel.style.setProperty("--rows", String(Math.max(1, tops.size)));
  };
  const renderSign = (panel, msg, { redFrom = Infinity, short = [], animate = true, label, breakAt = -1 } = {}) => {
    const text = msg.toUpperCase().replace(/\s+/g, " ").trim();
    const prev = panel.dataset.text || "";
    let firstChange = 0;
    while (firstChange < text.length && text[firstChange] === prev[firstChange]) firstChange++;
    let html = "", idx = 0;
    for (const word of text.split(" ").filter(Boolean)) {
      if (idx === breakAt && idx > 0) html += '<span class="br" aria-hidden="true"></span>';
      html += '<span class="word">';
      for (const ch of word) {
        const cls = ["ltr"];
        if (idx >= redFrom) cls.push("red");
        if (short.includes(ch)) cls.push("short");
        html += `<span class="${cls.join(" ")}" data-i="${idx}" style="${crook(idx)}">${esc(ch)}</span>`;
        idx++;
      }
      idx++;
      html += "</span>";
    }
    panel.innerHTML = html;
    panel.classList.toggle("empty", !text);
    panel.dataset.text = text;
    fitRows(panel);
    if (label !== false) panel.setAttribute("aria-label", text ? `Sign preview: ${text}` : (panel.dataset.empty || "Empty sign"));
    if (animate && G && !reduceMotion() && text !== prev) {
      const fresh = $$(".ltr", panel).filter((el) => Number(el.dataset.i) >= firstChange);
      if (fresh.length) G.from(fresh, { y: -80, autoAlpha: 0, duration: .5, ease: "back.out(1.8)", stagger: .035, overwrite: true });
    }
  };

  /* Customer-facing tray: each box is "needed/free that night"; only a real shortage is flagged. */
  /* Balanced rows: as many columns as fit, then even them out so no letter sits alone on a row. */
  const layoutTray = (tray) => {
    const n = tray.children.length, width = tray.parentElement ? tray.parentElement.clientWidth : 0;
    if (!n || !width) return;
    const fit = Math.max(1, Math.floor((width + 8) / (112 + 8)));
    let cols = Math.min(fit, n);
    while (cols > 2 && n > cols && n % cols === 1) cols--;   /* never leave one letter alone on the last row */
    tray.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  };
  const trayObserver = window.ResizeObserver ? new ResizeObserver((entries) => entries.forEach((e) => $$(".tray", e.target).forEach(layoutTray))) : null;
  const renderTray = (tray, need, free) => {
    if (trayObserver && !tray.dataset.observed) { trayObserver.observe(tray.parentElement); tray.dataset.observed = "1"; }
    tray.setAttribute("role", "list");
    let before = {};
    try { before = JSON.parse(tray.dataset.counts || "{}"); } catch (e) { before = {}; }
    const after = {};
    tray.innerHTML = Object.keys(need).map((c) => {
      const n = need[c], f = free[c] || 0, short = n > f;
      const name = c === "&" ? "ampersand" : c;
      after[c] = `${n}/${f}`;
      return `<div class="slot${short ? " short" : ""}" data-c="${esc(c)}" role="listitem" aria-label="${name}: needs ${n}, ${f} free that night${short ? `, short by ${n - f}` : ""}"><b aria-hidden="true">${esc(c)}</b><small aria-hidden="true">${short ? icon("x") : ""}${n} of ${f}</small></div>`;
    }).join("");
    tray.dataset.counts = JSON.stringify(after);
    layoutTray(tray);
    if (G && !reduceMotion() && Object.keys(before).length) {
      const ticked = $$(".slot", tray).filter((el) => before[el.dataset.c] !== after[el.dataset.c]).map((el) => el.querySelector("small"));
      if (ticked.length) G.from(ticked, { yPercent: 80, autoAlpha: 0, duration: .3, ease: "back.out(2)", stagger: .02 });
    }
  };

  /* ---------------- toast + copy ---------------- */
  const toast = (msg) => {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 3500);
  };
  $$(".copy-btn").forEach((btn) => btn.addEventListener("click", () => {
    const text = btn.dataset.copy;
    const done = () => toast(`Copied ${text}`);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => selectText(btn.previousElementSibling));
    else selectText(btn.previousElementSibling);
  }));
  const selectText = (el) => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Selected. Press Ctrl+C to copy."); };

  /* ================= HERO: the working sign ================= */
  const hero = {
    name: $("#startName"), occasion: $("#startOccasion"), night: $("#startNight"),
    panel: $("#heroPanel"), tray: $("#heroTray"), note: $("#heroTrayNote"),
    price: $("#startPrice"), pkg: $("#startPkg"), status: $("#startStatus"),
  };
  const cleanName = (s) => s.toUpperCase().replace(/[^A-Z0-9!&? ]/g, "").replace(/\s+/g, " ").trim().slice(0, 12);
  /* it's Halloween season: the hero opens on a random Halloween greeting */
  const HALLOWEEN = ["HAPPY HALLOWEEN", "TRICK OR TREAT", "HAPPY HAUNTING", "STAY SPOOKY", "BOO TO YOU"][Math.floor(Math.random() * 5)];
  hero.occasion.insertAdjacentHTML("afterbegin", `<option value="${HALLOWEEN}">Halloween</option>`);
  hero.occasion.value = HALLOWEEN;
  hero.night.min = toISO(TODAY);
  hero.night.value = toISO(nextWeekday(6));
  const heroMessage = () => { const n = cleanName(hero.name.value); return n ? `${hero.occasion.value} ${n}` : hero.occasion.value; };

  const showStock = (open) => {
    $("#heroStock").hidden = !open;
    $("#stockToggle").setAttribute("aria-expanded", String(open));
    $("#stockToggle").textContent = open ? "Hide the letter count" : "See each letter";
  };
  $("#stockToggle").addEventListener("click", () => showStock($("#heroStock").hidden));
  const updateHero = (animate = true) => {
    const msg = heroMessage();
    const night = hero.night.value ? fromISO(hero.night.value) : nextWeekday(6);
    const off = dayOffset(night);
    const need = countLetters(msg);
    const total = letterTotal(need);
    const pkgKey = total > PACKAGES.classic.maxLetters ? "deluxe" : "classic";
    const pkg = PACKAGES[pkgKey];
    const { free, short } = checkStock(msg, off, pkg.nights);
    renderSign(hero.panel, msg, { redFrom: hero.occasion.value.length + 1, breakAt: hero.occasion.value.length + 1, short, animate });
    renderTray(hero.tray, need, free);
    hero.note.textContent = `Each box: letters needed / letters free on ${fmtDay(night)}.`;
    const rush = off >= 0 && hoursUntilSetup(night) < 48;
    hero.price.textContent = money(pkg.price + (rush ? RUSH : 0));
    hero.pkg.textContent = `${pkg.label}${rush ? ", plus $20 rush" : ""}, travel from $0`;
    if (off < 0) hero.status.className = "status bad", hero.status.innerHTML = `${icon("x")}<span>That night has passed. Pick tonight or later.</span>`;
    else if (short.length) {
      const list = short.map((c) => `${c} (${need[c] - free[c]})`).join(", ");
      hero.status.className = "status bad";
      hero.status.innerHTML = `${icon("x")}<span><b>We're short on ${fmtDay(night)}:</b> ${list}. Try another night or a shorter message.</span>`;
      showStock(true);   /* a shortage opens the per-letter view */
    } else {
      hero.status.className = "status ok";
      hero.status.innerHTML = `${icon("check")}<span>All ${total} letters are free on ${fmtDay(night)}.</span>`;
    }
  };
  ["input", "change"].forEach((ev) => [hero.name, hero.occasion, hero.night].forEach((el) => el.addEventListener(ev, () => updateHero())));
  const heroGrid = $(".hero-grid");
  hero.name.addEventListener("focus", () => heroGrid.classList.add("typing"));
  hero.name.addEventListener("blur", () => heroGrid.classList.remove("typing"));
  $("#startForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const occMap = { [HALLOWEEN]: "Halloween", "HAPPY BIRTHDAY": "Birthday", CONGRATS: "Graduation", "WELCOME HOME": "Welcome home", "HAPPY ANNIVERSARY": "Anniversary", "HAPPY RETIREMENT": "Retirement" };
    booking.prefill({ msg: heroMessage(), night: hero.night.value, occasion: occMap[hero.occasion.value] });
    location.hash = "#book";
  });

  /* ================= BOOKING ================= */
  const f = (id) => document.getElementById(id);
  const booking = (() => {
    const form = f("bookForm");
    const steps = $$("[data-step]", form);
    let current = 1;
    const citySel = f("city");
    citySel.innerHTML = '<option value="">Choose one</option>' + ZONES.map((z) => `<optgroup label="${z.label}${z.fee ? `, +$${z.fee}` : ", free"}">${z.cities.map((c) => `<option>${c}</option>`).join("")}</optgroup>`).join("");
    f("night").min = toISO(TODAY);
    f("night").value = toISO(nextWeekday(6));

    const pkgKey = () => form.querySelector('input[name="pkg"]:checked').value;
    const message = () => (pkgKey() === "flock" ? "" : f("msg").value.toUpperCase().replace(/\s+/g, " ").trim());
    const fullMessage = () => { const age = pkgKey() === "deluxe" ? f("age").value.replace(/\D/g, "") : ""; return [message(), age].filter(Boolean).join(" "); };
    const nightDate = () => (f("night").value ? fromISO(f("night").value) : null);

    const quote = () => {
      const pkg = PACKAGES[pkgKey()];
      const extra = Number(f("extra").value);
      const zone = zoneOf(citySel.value);
      const night = nightDate();
      const rush = night && dayOffset(night) >= 0 && hoursUntilSetup(night) < 48;
      const total = pkg.price + extra * EXTRA_DAY + (zone ? zone.fee : 0) + (rush ? RUSH : 0);
      return { pkg, extra, zone, night, rush, total, nights: pkg.nights + extra };
    };

    const badChars = () => [...new Set([...message().replace(/\s/g, "")].filter((c) => !ALLOWED.test(c)))];

    const refresh = (animate = true) => {
      const key = pkgKey();
      const isFlock = key === "flock";
      f("msgField").hidden = isFlock;
      f("themeField").hidden = isFlock;
      f("ageField").hidden = key !== "deluxe";
      const q = quote();
      const msg = fullMessage();
      const need = countLetters(msg);
      const total = letterTotal(need);
      const off = q.night ? dayOffset(q.night) : null;
      const stock = q.night && off >= 0 ? checkStock(msg, off, q.nights) : null;
      const short = stock ? stock.short : [];
      renderSign(f("bookPanel"), msg, { short, animate });
      renderSign(f("sumPanel"), msg, { animate: false, label: false });
      f("msgCount").textContent = isFlock ? "" : `${total} of ${q.pkg.maxLetters} letters used.`;
      f("bookTray").hidden = isFlock || !total;
      if (stock) renderTray(f("bookTray"), need, stock.free); else f("bookTray").innerHTML = "";

      const checks = [];
      if (!isFlock) {
        for (const s of spellSuggestions(message())) checks.push(`<p class="status warn">${icon("alert")}<span>Did you mean <b>${s.fix}</b> instead of ${esc(s.word)}? <button type="button" data-fix="${esc(s.word)}" data-to="${s.fix}">Use ${s.fix}</button></span></p>`);
        const bad = badChars();
        if (bad.length) checks.push(`<p class="status bad">${icon("x")}<span>We don't stock ${bad.map(esc).join(" ")}. Use letters, numbers, or ! &amp; ?</span></p>`);
        if (total > q.pkg.maxLetters) checks.push(`<p class="status bad">${icon("x")}<span>${q.pkg.name} fits ${q.pkg.maxLetters} letters and this uses ${total}. Shorten it${key === "classic" ? " or switch to Deluxe" : ""}.</span></p>`);
        if (!q.night) checks.push(`<p class="status info">${icon("info")}<span>Pick a night in step 2 and we'll check our letters for it.</span></p>`);
        else if (short.length) checks.push(`<p class="status bad">${icon("x")}<span><b>Short on ${fmtDay(q.night)}:</b> ${short.map((c) => `${c} (${need[c] - stock.free[c]})`).join(", ")}. Try another night or change the message.</span></p>`);
        else if (total) checks.push(`<p class="status ok">${icon("check")}<span>All ${total} letters are free for ${fmtDay(q.night)}${q.nights > 1 ? ` through ${fmtDay(addDays(q.night, q.nights - 1))}` : ""}.</span></p>`);
      }
      f("checks").innerHTML = checks.join("");

      if (q.night) {
        const takedown = addDays(q.night, q.nights);
        const st = f("nightStatus");
        st.className = "status info full";
        st.innerHTML = `${icon("info")}<span>Setup ${fmtDay(q.night)}, 11 PM to 3 AM. Takedown ${fmtDay(takedown)}, 6 to 9 PM.${q.rush ? " Under 48 hours' notice adds the $20 rush fee." : ""}</span>`;
      }
      const rows = [[q.pkg.label, money(q.pkg.price)]];
      if (!isFlock) rows.push(["Letters", String(total)]);
      if (q.night) rows.push(["Setup night", fmtDay(q.night)]);
      if (q.extra) rows.push([`${q.extra} extra day${q.extra > 1 ? "s" : ""}`, money(q.extra * EXTRA_DAY)]);
      rows.push(["Travel", q.zone ? (q.zone.fee ? money(q.zone.fee) : "Free") : "Pick a city"]);
      if (q.rush) rows.push(["Rush", money(RUSH)]);
      f("sumList").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
      f("sumTotal").textContent = money(q.total);
      const sl = f("sumLetters");
      if (isFlock) { sl.className = "status info"; sl.innerHTML = `${icon("info")}<span>24 flamingos, no letters needed.</span>`; }
      else if (short.length) { sl.className = "status bad"; sl.innerHTML = `${icon("x")}<span>Short on ${short.length} letter${short.length > 1 ? "s" : ""} that night.</span>`; }
      else if (stock && total) { sl.className = "status ok"; sl.innerHTML = `${icon("check")}<span>Letters reserved when you check out.</span>`; }
      else { sl.className = "status info"; sl.innerHTML = ""; }
    };

    /* validation */
    const setErr = (id, msg) => {
      const input = f(id), err = f(id + "Err");
      if (err) err.innerHTML = msg ? `${icon("x")}<span>${msg}</span>` : "";
      if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
      return msg ? { id, msg } : null;
    };
    const validators = {
      1: () => {
        if (pkgKey() === "flock") return [];
        const q = quote(), total = letterTotal(countLetters(fullMessage()));
        let m = "";
        if (!message()) m = "Type the message for the sign.";
        else if (badChars().length) m = `Remove ${badChars().join(" ")}. We only stock letters, numbers, and ! & ?`;
        else if (total > q.pkg.maxLetters) m = `Shorten the message to ${q.pkg.maxLetters} letters or fewer.`;
        else if (q.night && dayOffset(q.night) >= 0 && checkStock(fullMessage(), dayOffset(q.night), q.nights).short.length) m = "We're short on letters that night. Change the message or pick another night in step 2.";
        return [setErr("msg", m)].filter(Boolean);
      },
      2: () => {
        const errs = [];
        const night = nightDate();
        errs.push(setErr("night", !night ? "Pick a setup night." : dayOffset(night) < 0 ? "That night has passed. Pick tonight or later." : ""));
        errs.push(setErr("city", citySel.value ? "" : "Choose the city so we can plan the route."));
        errs.push(setErr("street", f("street").value.trim().length > 3 ? "" : "Enter the street address for the display."));
        const needsOk = form.querySelector('input[name="home"]:checked').value !== "house";
        errs.push(setErr("landlord", needsOk && !f("landlord").checked ? "Confirm the landlord or HOA has okayed it." : ""));
        if (!errs.some(Boolean) && pkgKey() !== "flock") {
          const q = quote();
          if (checkStock(fullMessage(), dayOffset(q.night), q.nights).short.length) errs.push(setErr("night", "We're short on letters that night. Pick another night or go back and change the message."));
        }
        return errs.filter(Boolean);
      },
      3: () => {
        const errs = [];
        const resident = form.querySelector('input[name="resident"]:checked').value === "yes";
        if (!resident) {
          errs.push(setErr("accName", f("accName").value.trim() ? "" : "Enter the name of the adult at the house who's in on it."));
          const digits = f("accPhone").value.replace(/\D/g, "");
          errs.push(setErr("accPhone", digits.length === 10 || (digits.length === 11 && digits[0] === "1") ? "" : "Enter a 10-digit cell number so we can text them before setup."));
          errs.push(setErr("accAgreed", f("accAgreed").checked ? "" : "Confirm they live there and agreed. We can't set up without it."));
        } else ["accName", "accPhone", "accAgreed"].forEach((id) => setErr(id, ""));
        errs.push(setErr("buyerName", f("buyerName").value.trim() ? "" : "Enter your name."));
        errs.push(setErr("buyerEmail", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f("buyerEmail").value.trim()) ? "" : "Enter an email like name@example.com so we can send the morning photo."));
        errs.push(setErr("ruleRemove", f("ruleRemove").checked ? "" : "Agree to removal on request to continue."));
        errs.push(setErr("ruleContent", f("ruleContent").checked ? "" : "Confirm the message follows our content rules."));
        errs.push(setErr("ruleRefund", f("ruleRefund").checked ? "" : "Confirm you've read the refund rule."));
        return errs.filter(Boolean);
      },
    };
    const showSummary = (errs) => {
      const box = f("errSummary");
      if (!errs.length) { box.hidden = true; return; }
      f("errList").innerHTML = errs.map((e) => `<li><a href="#${e.id}" data-focus="${e.id}">${e.msg}</a></li>`).join("");
      box.hidden = false;
      box.focus();
    };
    f("errList").addEventListener("click", (e) => {
      const a = e.target.closest("a[data-focus]"); if (!a) return;
      e.preventDefault(); const el = f(a.dataset.focus); el.focus(); el.scrollIntoView({ block: "center" });
    });

    const go = (n) => {
      current = n;
      steps.forEach((s) => (s.hidden = s.dataset.step !== String(n)));
      const items = $$("#stepper li");
      items.forEach((li, i) => {
        li.classList.toggle("done", n === "done" || i + 1 < n);
        if (i + 1 === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      const shown = steps.find((s) => !s.hidden);
      if (G && !reduceMotion()) G.from(shown, { autoAlpha: 0, y: 14, duration: .4, ease: "expo.out", clearProps: "all" });
      const heading = shown.querySelector("h2");
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      f("stepper").scrollIntoView({ block: "start", behavior: reduceMotion() ? "auto" : "smooth" });
    };
    form.addEventListener("click", (e) => {
      const next = e.target.closest("[data-next]"), prev = e.target.closest("[data-prev]"), fix = e.target.closest("[data-fix]");
      if (next) { const errs = validators[current](); showSummary(errs); if (!errs.length) go(Number(next.dataset.next)); }
      if (prev) { showSummary([]); go(Number(prev.dataset.prev)); }
      if (fix) { const re = new RegExp(`\\b${fix.dataset.fix}\\b`, "i"); f("msg").value = f("msg").value.replace(re, fix.dataset.to); refresh(); f("msg").focus(); }
    });
    form.addEventListener("input", () => refresh());
    form.addEventListener("change", (e) => {
      if (e.target.name === "home") f("landlordField").hidden = e.target.value === "house";
      if (e.target.name === "resident") f("accFields").hidden = e.target.value === "yes";
      refresh();
    });
    ["msg", "night", "city", "street", "accName", "accPhone", "buyerName", "buyerEmail"].forEach((id) => f(id).addEventListener("blur", () => {
      if (f(id).getAttribute("aria-invalid") === "true") validators[current]();
    }));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const errs = validators[3]();
      showSummary(errs);
      if (errs.length) return;
      const btn = f("payBtn");
      btn.disabled = true; btn.textContent = "Opening checkout…";
      setTimeout(() => {
        btn.disabled = false; btn.textContent = "Continue to secure checkout";
        const q = quote();
        const resident = form.querySelector('input[name="resident"]:checked').value === "yes";
        const takedown = addDays(q.night, q.nights);
        f("orderNo").textContent = `Order ML-${1050 + Math.floor(Math.random() * 900)} · ${money(q.total)}`;
        const items = [
          [`${fmtDay(q.night)}, 6 PM`, resident ? "We text you to confirm setup." : `We text ${esc(f("accName").value.trim())} to confirm.`],
          [`${fmtDay(q.night)}, 11 PM–3 AM`, pkgKey() === "flock" ? "We set out 24 flamingos." : `We put up ${esc(fullMessage())}.`],
          [`${fmtDay(addDays(q.night, 1))}, morning`, `The photo goes to ${esc(f("buyerEmail").value.trim())}.`],
          [`${fmtDay(takedown)}, 6–9 PM`, "We take it down, and Stripe emails your receipt."],
        ];
        if (f("remind").checked) items.push([fmtDay(addDays(new Date(q.night.getFullYear() + 1, q.night.getMonth(), q.night.getDate()), -21)), "We remind you to book it again."]);
        f("doneTimeline").innerHTML = items.map(([w, t]) => `<li><span class="when">${w}</span><span>${t}</span></li>`).join("");
        go("done");
        f("doneTitle").focus();
      }, 900);
    });
    f("bookAnother").addEventListener("click", () => { form.reset(); f("night").value = toISO(nextWeekday(6)); f("landlordField").hidden = true; f("accFields").hidden = false; $$("[aria-invalid]", form).forEach((el) => el.removeAttribute("aria-invalid")); $$(".err", form).forEach((el) => (el.innerHTML = "")); refresh(false); go(1); });

    return {
      refresh,
      prefill: ({ msg, night, occasion, pkg, street, city }) => {
        /* the Lawn Builder's surveyed yard carries its address over */
        if (street) f("street").value = street;
        if (city) {
          const want = city.toLowerCase(), opt = [...citySel.options].find((o) => o.value && (o.value.toLowerCase() === want || (want.startsWith("grosse pointe") && o.value.startsWith("Grosse Pointe"))));
          if (opt) citySel.value = opt.value;
        }
        if (pkg && PACKAGES[pkg]) form.querySelector(`input[name="pkg"][value="${pkg}"]`).checked = true;
        else {
          form.querySelector('input[name="pkg"][value="classic"]').checked = letterTotal(countLetters(msg)) <= PACKAGES.classic.maxLetters;
          if (!form.querySelector('input[name="pkg"]:checked')) form.querySelector('input[name="pkg"][value="deluxe"]').checked = true;
        }
        f("msg").value = msg;
        if (night) f("night").value = night;
        if (occasion) f("occasion").value = occasion;
        showSummary([]);
        go(1);
        refresh(false);
      },
      packageFromLink: (key) => { form.querySelector(`input[name="pkg"][value="${key}"]`).checked = true; refresh(false); },
    };
  })();

  /* shared with the Lawn Builder (js/builder.js) */
  window.MLC = { prefill: booking.prefill, checkStock, countLetters, PACKAGES, toISO, fromISO, dayOffset, fmtDay, nextWeekday };

  /* ================= GROUPS + small forms ================= */
  const flocks = f("flocks");
  const updateCalc = () => {
    const n = Number(flocks.value), gross = n * 60;
    f("flocksOut").textContent = n;
    f("raise30").textContent = money(Math.round(gross * .3));
    f("raise40").textContent = money(Math.round(gross * .4));
    f("calcGross").textContent = `${n} flockings at $60 is ${money(gross)} in sales.`;
  };
  flocks.addEventListener("input", updateCalc); updateCalc();

  const simpleForm = (formId, fields, doneId) => {
    const form = f(formId);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let first = null;
      for (const [id, test, msg] of fields) {
        const ok = test(f(id).value.trim());
        f(id).setAttribute("aria-invalid", ok ? "false" : "true");
        f(id + "Err").innerHTML = ok ? "" : `${icon("x")}<span>${msg}</span>`;
        if (!ok && !first) first = f(id);
      }
      if (first) { first.focus(); return; }
      f(doneId).hidden = false;
      form.querySelectorAll("input, textarea").forEach((el) => (el.value = ""));
    });
  };
  simpleForm("giveForm", [["giveWho", (v) => v.length > 1, "Enter who you're nominating."], ["giveWhy", (v) => v.length > 5, "Tell us the occasion in a sentence or two."]], "giveDone");
  simpleForm("groupForm", [["gEmail", (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter an email like name@school.org so we can reply."]], "gDone");

  /* ================= CREW (sample) ================= */
  const renderCrew = () => {
    const tonight = TODAY;
    f("crewTitle").textContent = `Tonight's route, ${fmtDay(tonight)}`;
    const stakesPer = isWinter(tonight) ? 2 : 1;
    const setups = [
      { id: "ML-1042", eta: "11:02", ampm: "PM", city: "Allen Park", zone: 1, b: BOOKINGS[0], theme: "Balloons and stars", acc: { ok: true, text: "Dana confirmed at 7:12 PM" }, note: "Sprinkler line along the driveway. Keep left of the walk." },
      { id: "ML-1043", eta: "11:26", ampm: "PM", city: "Southgate", zone: 1, b: BOOKINGS[1], theme: "Graduation caps, navy and gold", acc: { ok: true, text: "Buyer lives here" }, note: "Deluxe, stays up 2 nights." },
      { id: "ML-1045", eta: "12:02", ampm: "AM", city: "Dearborn", zone: 1, b: BOOKINGS[2], theme: "Flamingo tote, 24 birds", acc: { ok: false, text: "No reply yet. Text again at 10:30 PM and skip the stop if there's still no answer" }, note: "Flocking takes about 18 minutes." },
      { id: "ML-1046", eta: "12:36", ampm: "AM", city: "Detroit, Southwest", zone: 1, b: BOOKINGS[3], theme: "Confetti", acc: { ok: true, text: "Marcus confirmed at 8:40 PM" }, note: "Rental. Landlord okay is on file." },
    ];
    let stakes = 0;
    const pick = (s) => {
      const need = countLetters(s.b.msg);
      const pieces = letterTotal(need) + PACKAGES[s.b.pkg].graphics;
      stakes += pieces * stakesPer;
      const letters = Object.entries(need).sort(([a], [b]) => a.localeCompare(b)).map(([c, n]) => (n > 1 ? `${c}×${n}` : c)).join(" ");
      return `${letters ? `Letters ${letters}. ` : ""}Tote: ${s.theme}. Stakes: ${pieces * stakesPer}.`;
    };
    const stopsHtml = setups.map((s) => `
      <li class="stop setup${s.acc.ok ? "" : " attn"}">
        <span class="eta">${s.eta}<small>${s.ampm}</small></span>
        <div class="stop-body">
          <div class="stop-head"><h3>${s.city}</h3><span class="stop-meta">${s.id}, Zone ${s.zone}, ${PACKAGES[s.b.pkg].name}</span></div>
          ${s.b.msg ? `<div class="cabinet tiny plot"><div class="panel" data-msg="${esc(s.b.msg)}"></div></div>` : ""}
          <p class="pick">${pick(s)}</p>
          <p><span class="pill"><span class="well${s.acc.ok ? "" : " yellow"}">${icon(s.acc.ok ? "check" : "alert")}</span>${s.acc.ok ? "Accomplice confirmed" : "Waiting on accomplice"}</span></p>
          <p class="stop-meta">${s.acc.text}. ${s.note}</p>
        </div>
      </li>`).join("");
    f("route").innerHTML = `
      <li class="stop"><span class="eta">10:50<small>PM</small></span><div class="stop-body"><h3>Leave home base, Lincoln Park</h3><p class="stop-meta">Takedowns first (6–9 PM), then load tonight's four totes.</p></div></li>
      ${stopsHtml}
      <li class="stop"><span class="eta">1:05<small>AM</small></span><div class="stop-body"><h3>Back at base</h3><p class="stop-meta">Upload the four photos. Wet letters go on the drying rack, not in the totes.</p></div></li>`;
    $$("#route .panel[data-msg]").forEach((p) => renderSign(p, p.dataset.msg, { animate: false, label: false }));

    f("crewSheet").innerHTML = [
      `<span><strong>4</strong>setups, 11 PM to 3 AM, all Zone 1</span>`,
      `<span><strong>2</strong>takedowns first, 6 to 9 PM</span>`,
      `<span><strong>2:15</strong>on the road, out 10:50 PM, back 1:05 AM</span>`,
      `<span><strong>${stakes}</strong>stakes to pack, ${stakesPer === 2 ? "2 per piece for winter" : "1 per piece until November"}</span>`,
    ].join("");

    const free = freeLetters(0, 1);
    const chars = Object.keys(INVENTORY).filter((c) => /[A-Z]/.test(c));
    f("invHint").textContent = "Letters left in the tray once tonight's four displays are out. The garage holds the rest of the numbers and symbols.";
    f("inv").setAttribute("role", "list");
    f("inv").innerHTML = chars.map((c) => {
      const left = free[c];
      const state = left === 0 ? "short" : left <= 1 ? "low" : "";
      const sym = state === "short" ? icon("x") : state === "low" ? icon("alert") : "";
      return `<div class="slot ${state}" role="listitem" aria-label="${c}: ${left} of ${INVENTORY[c]} left${state === "short" ? ", none left" : state === "low" ? ", running low" : ""}"><b aria-hidden="true">${c}</b><small aria-hidden="true">${sym}${left} of ${INVENTORY[c]}</small></div>`;
    }).join("");
    f("takedowns").innerHTML = [
      ["ML-1039", "Wyandotte", "HAPPY BIRTHDAY NOAH"],
      ["ML-1040", "Lincoln Park", "Flocking, 24 birds"],
    ].map(([id, city, what]) => `<li><span class="well">${icon("check")}</span><span><strong>${city}</strong>, ${id}: ${what}. Count the stakes back in.</span></li>`).join("");
  };

  /* ================= ROUTER ================= */
  const VIEWS = ["home", "book", "groups", "faq", "crew", "builder"];
  let crewDone = false;
  const route = () => {
    const raw = (location.hash || "#home").slice(1);
    const id = VIEWS.includes(raw) ? raw : "home";
    const anchor = VIEWS.includes(raw) ? null : document.getElementById(raw);
    const current = $(".view:not([hidden])");
    const changed = !current || current.dataset.view !== id;
    $$(".view").forEach((v) => (v.hidden = v.dataset.view !== id));
    $$(".nav a").forEach((a) => {
      if (a.getAttribute("href").slice(1) === raw) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (id === "crew" && !crewDone) { renderCrew(); crewDone = true; }
    $$(`.view[data-view="${id}"] .panel`).forEach(fitRows);
    if (id === "book") booking.refresh(false);
    if (window.ScrollTrigger) requestAnimationFrame(() => window.ScrollTrigger.refresh());
    $("#siteNav").classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded", "false");
    if (anchor) { anchor.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" }); return; }
    if (changed || raw === "home") {
      window.scrollTo(0, 0);
      const h1 = $(`.view[data-view="${id}"] h1`);
      if (h1 && changed) h1.focus({ preventScroll: true });
    }
  };
  window.addEventListener("hashchange", route);
  let refitFrame = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(refitFrame); refitFrame = requestAnimationFrame(() => $$(".view:not([hidden]) .panel, .closing .panel").forEach(fitRows)); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-package]");
    if (a) booking.packageFromLink(a.dataset.package);
  });
  $("#menuBtn").addEventListener("click", () => {
    const nav = $("#siteNav"); const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open); $("#menuBtn").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !$("#siteNav").classList.contains("open")) return;
    $("#siteNav").classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded", "false"); $("#menuBtn").focus();
  });

  /* ================= example signs ================= */
  $$(".panel[data-msg]").forEach((panel) => {
    const text = panel.dataset.msg.toUpperCase();
    const red = panel.dataset.red ? text.indexOf(panel.dataset.red.toUpperCase()) : -1;
    renderSign(panel, text, { redFrom: red >= 0 ? red : Infinity, animate: false, label: panel.getAttribute("role") === "img" ? undefined : false });
  });

  /* ================= first paint + the one orchestrated moment ================= */
  updateHero(false);
  booking.refresh(false);
  route();

  if (G) {
    const mm = G.matchMedia();
    if (window.ScrollTrigger) G.registerPlugin(window.ScrollTrigger);
    mm.add({ motion: "(prefers-reduced-motion: no-preference)" }, () => {
      if (window.ScrollTrigger) {
        $$(".slab.green .lobe").forEach((lobe) => {
          G.set(lobe, { xPercent: -50, yPercent: -60, x: 0, y: 0 });
          G.fromTo(lobe, { scaleY: .2 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: lobe.parentElement, start: "top bottom", end: "top 40%", scrub: .6 } });
        });
      }
      if ((location.hash || "#home") !== "#home") return;
      G.timeline()
        .from($$(".ltr", hero.panel), { y: -120, autoAlpha: 0, duration: .6, ease: "back.out(1.7)", stagger: .05 }, .15)
        .from($$(".slot", hero.tray), { autoAlpha: 0, y: 10, duration: .3, ease: "power2.out", stagger: .025 }, "-=.35");
    });
  }
})();
