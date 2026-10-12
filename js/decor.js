/* Midnight Lawn Co. — Lawn Builder decoration catalog.
   Every piece is a yard cutout drawn as flat vector art (viewBox 0 0 100 100) in the site palette,
   so it renders the same in the aerial grid and as a texture in the 3D scene.
   h = standing height in metres (letters are 18-inch coroplast, about 0.46 m). */
(() => {
  "use strict";
  const INK = "#2F3130", W = "#FFFFFF", TOM = "#F0574C", COB = "#1B8FF5", YEL = "#F5D42B", GRN = "#82CC5C",
    DGRN = "#4F9A2E", PINK = "#F59AC0", ORG = "#F7943A", BRN = "#9A6233", CRM = "#F2EFE3";
  const st = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  /* the same ink stroke at another weight (a repeated attribute is invalid XML, and breaks the 3D textures) */
  const stw = (w) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const face = `<circle cx="50" cy="50" r="42" fill="${YEL}" ${st}/>`;
  const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

  const ART = {
    /* ---------- seasonal ---------- */
    pumpkin: `<ellipse cx="50" cy="60" rx="40" ry="31" fill="${ORG}" ${st}/><path d="M50 30v61M31 33c-9 17-9 37 0 55M69 33c9 17 9 37 0 55" fill="none" ${st}/><path d="M48 30c0-8 3-15 10-18" fill="none" stroke="${DGRN}" stroke-width="7" stroke-linecap="round"/>`,
    ghost: `<path d="M22 88V44a28 28 0 0 1 56 0v44l-9-8-9 8-10-8-10 8-9-8Z" fill="${W}" ${st}/><circle cx="40" cy="46" r="5" fill="${INK}"/><circle cx="60" cy="46" r="5" fill="${INK}"/><ellipse cx="50" cy="62" rx="6" ry="8" fill="${INK}"/>`,
    snowman: `<circle cx="50" cy="69" r="24" fill="${W}" ${st}/><circle cx="50" cy="33" r="17" fill="${W}" ${st}/><path d="M50 33l15 3-15 3Z" fill="${ORG}"/><circle cx="44" cy="28" r="2.6" fill="${INK}"/><circle cx="56" cy="28" r="2.6" fill="${INK}"/><path d="M33 47h34v7H33Z" fill="${TOM}" ${st}/><circle cx="50" cy="64" r="3" fill="${INK}"/><circle cx="50" cy="76" r="3" fill="${INK}"/>`,
    tree: `<path d="M50 12 83 78H17Z" fill="${DGRN}" ${st}/><rect x="44" y="78" width="12" height="13" fill="${BRN}" ${st}/><circle cx="39" cy="52" r="5" fill="${TOM}"/><circle cx="61" cy="64" r="5" fill="${COB}"/><circle cx="54" cy="40" r="4" fill="${YEL}"/><circle cx="35" cy="70" r="4" fill="${YEL}"/><path d="M50 3l3.5 7 7.5 1-5.5 5 1.5 7.5L50 20l-7 3.5L44.5 16 39 11l7.5-1Z" fill="${YEL}" ${st}/>`,
    candycane: `<path d="M62 92V36a15 15 0 0 0-30 0" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M62 92V36a15 15 0 0 0-30 0" fill="none" stroke="${W}" stroke-width="11" stroke-linecap="round"/><path d="M62 92V36a15 15 0 0 0-30 0" fill="none" stroke="${TOM}" stroke-width="11" stroke-dasharray="7 8"/>`,
    egg: `<ellipse cx="50" cy="54" rx="31" ry="39" fill="${PINK}" ${st}/><path d="M20 48l10-8 10 8 10-8 10 8 10-8 10 8" fill="none" stroke="${YEL}" stroke-width="7"/><circle cx="38" cy="70" r="5" fill="${COB}"/><circle cx="62" cy="70" r="5" fill="${COB}"/><circle cx="50" cy="28" r="4" fill="${W}"/>`,
    shamrock: `<circle cx="50" cy="32" r="16" fill="${GRN}" ${st}/><circle cx="33" cy="54" r="16" fill="${GRN}" ${st}/><circle cx="67" cy="54" r="16" fill="${GRN}" ${st}/><path d="M50 52c0 16 4 26 10 36" fill="none" stroke="${DGRN}" stroke-width="7" stroke-linecap="round"/>`,
    firework: `<g ${stw(6)} fill="none"><path d="M50 50 50 10" stroke="${TOM}"/><path d="M50 50 85 30" stroke="${COB}"/><path d="M50 50 88 62" stroke="${YEL}"/><path d="M50 50 64 90" stroke="${PINK}"/><path d="M50 50 22 86" stroke="${TOM}"/><path d="M50 50 12 58" stroke="${COB}"/><path d="M50 50 18 22" stroke="${YEL}"/></g><circle cx="50" cy="50" r="9" fill="${W}" ${st}/>`,
    snowflake: `<g fill="none" stroke="${COB}" stroke-width="7" stroke-linecap="round"><path d="M50 10v80M15 30l70 40M15 70l70-40"/><path d="M40 16l10 10 10-10M40 84l10-10 10 10" /></g>`,
    valentine: `<path d="M50 86S13 62 13 37a18 18 0 0 1 37-6 18 18 0 0 1 37 6c0 25-37 49-37 49Z" fill="${PINK}" ${st}/><path d="M50 64S34 54 34 43a8 8 0 0 1 16-3 8 8 0 0 1 16 3c0 11-16 21-16 21Z" fill="${TOM}"/>`,
    flag: `<path d="M18 8v86" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><rect x="21" y="14" width="66" height="44" fill="${W}" ${st}/><path d="M21 23h66M21 33h66M21 43h66M21 53h66" stroke="${TOM}" stroke-width="5"/><rect x="21" y="14" width="28" height="22" fill="${COB}" ${st}/><circle cx="29" cy="21" r="2" fill="${W}"/><circle cx="40" cy="21" r="2" fill="${W}"/><circle cx="29" cy="30" r="2" fill="${W}"/><circle cx="40" cy="30" r="2" fill="${W}"/>`,
    leaf: `<path d="M50 90C20 70 14 40 30 14c12 10 22 8 20-6 18 14 30 44 0 82Z" fill="${ORG}" ${st}/><path d="M50 88C46 60 40 38 30 18" fill="none" stroke="${BRN}" stroke-width="4" stroke-linecap="round"/>`,

    /* ---------- emojis (drawn faces, not font glyphs) ---------- */
    smile: `${face}<ellipse cx="36" cy="40" rx="5" ry="7" fill="${INK}"/><ellipse cx="64" cy="40" rx="5" ry="7" fill="${INK}"/><path d="M30 60c10 14 30 14 40 0" fill="none" ${stw(5)}/>`,
    grin: `${face}<path d="M28 42c4-6 10-6 14 0M58 42c4-6 10-6 14 0" fill="none" ${stw(5)}/><path d="M26 56h48c0 18-12 26-24 26S26 74 26 56Z" fill="${INK}"/><path d="M30 57h40v7H30Z" fill="${W}"/>`,
    hearteyes: `${face}<path d="M36 50s-12-7-12-15a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 8-12 15-12 15Z" fill="${TOM}"/><path d="M64 50s-12-7-12-15a6 6 0 0 1 12-2 6 6 0 0 1 12 2c0 8-12 15-12 15Z" fill="${TOM}"/><path d="M32 62c9 12 27 12 36 0" fill="none" ${stw(5)}/>`,
    party: `${face}<path d="M58 14 80 6 74 30Z" fill="${COB}" ${st}/><circle cx="80" cy="6" r="4" fill="${TOM}"/><ellipse cx="38" cy="44" rx="5" ry="7" fill="${INK}"/><ellipse cx="62" cy="44" rx="5" ry="7" fill="${INK}"/><path d="M34 60h32c0 12-8 18-16 18s-16-6-16-18Z" fill="${INK}"/><rect x="14" y="70" width="6" height="6" fill="${TOM}" transform="rotate(20 17 73)"/><rect x="82" y="58" width="6" height="6" fill="${COB}" transform="rotate(-20 85 61)"/>`,
    stareyes: `${face}<path d="M36 30l3.5 7 7.5 1-5.5 5 1.5 7.5L36 47l-7 3.5 1.5-7.5-5.5-5 7.5-1Z" fill="${TOM}"/><path d="M64 30l3.5 7 7.5 1-5.5 5 1.5 7.5L64 47l-7 3.5 1.5-7.5-5.5-5 7.5-1Z" fill="${TOM}"/><ellipse cx="50" cy="68" rx="12" ry="9" fill="${INK}"/>`,
    wink: `${face}<path d="M28 42c4-5 12-5 16 0" fill="none" ${stw(5)}/><ellipse cx="64" cy="40" rx="5" ry="7" fill="${INK}"/><path d="M30 60c10 12 30 12 40 0" fill="none" ${stw(5)}/><path d="M54 66c0 10 10 10 12 2" fill="${TOM}" ${st}/>`,
    cool: `${face}<path d="M16 38h68v6l-6 12H58l-6-12h-4l-6 12H22l-6-12Z" fill="${INK}"/><path d="M36 66c8 4 20 2 28-6" fill="none" ${stw(5)}/>`,
    kiss: `${face}<ellipse cx="36" cy="42" rx="5" ry="7" fill="${INK}"/><path d="M58 42c4-5 10-5 14 0" fill="none" ${stw(5)}/><path d="M46 62c8-2 8 6 0 6 8 0 8 8 0 6" fill="none" ${stw(5)}/><path d="M76 66s-7-4-7-9a3.5 3.5 0 0 1 7-1 3.5 3.5 0 0 1 7 1c0 5-7 9-7 9Z" fill="${TOM}"/>`,

    /* ---------- icons ---------- */
    star: `<path d="M50 8l12 25 27 4-20 19 5 27-24-13-24 13 5-27-20-19 27-4Z" fill="${YEL}" ${st}/>`,
    balloon: `<path d="M50 96c-2-12 4-18 0-30" fill="none" ${st}/><ellipse cx="50" cy="38" rx="27" ry="32" fill="${TOM}" ${st}/><path d="M45 72h10l-5-6Z" fill="${TOM}" ${st}/><ellipse cx="40" cy="26" rx="5" ry="8" fill="${W}" opacity=".6"/>`,
    cake: `<rect x="16" y="54" width="68" height="34" rx="6" fill="${PINK}" ${st}/><rect x="26" y="34" width="48" height="22" rx="5" fill="${W}" ${st}/><path d="M16 66c8 6 14-6 22 0s14-6 22 0 14-6 24 0" fill="none" stroke="${W}" stroke-width="5"/><g ${st}><path d="M38 34V22M50 34V20M62 34V22"/></g><path d="M38 20c-3-4 0-8 0-8s3 4 0 8M50 18c-3-4 0-8 0-8s3 4 0 8M62 20c-3-4 0-8 0-8s3 4 0 8" fill="${YEL}" stroke="${INK}" stroke-width="2"/>`,
    gift: `<rect x="14" y="40" width="72" height="50" rx="4" fill="${COB}" ${st}/><rect x="10" y="30" width="80" height="14" rx="4" fill="${COB}" ${st}/><path d="M44 30h12v60H44Z" fill="${YEL}" ${st}/><path d="M50 30c-14-14-26-6-18 0Zm0 0c14-14 26-6 18 0Z" fill="${YEL}" ${st}/>`,
    gradcap: `<path d="M50 20 94 38 50 56 6 38Z" fill="${INK}" ${st}/><path d="M26 47v18c12 10 36 10 48 0V47L50 56Z" fill="${INK}" ${st}/><path d="M50 38 80 46v24" fill="none" stroke="${YEL}" stroke-width="4"/><path d="M76 70h8v12h-8Z" fill="${YEL}" stroke="${INK}" stroke-width="2"/>`,
    trophy: `<path d="M28 12h44v26c0 16-10 26-22 26S28 54 28 38Z" fill="${YEL}" ${st}/><path d="M28 20H14c0 14 8 20 16 20M72 20h14c0 14-8 20-16 20" fill="none" ${st}/><path d="M44 64h12v12H44Z" fill="${YEL}" ${st}/><rect x="30" y="76" width="40" height="14" rx="3" fill="${BRN}" ${st}/>`,
    football: `<ellipse cx="50" cy="50" rx="40" ry="26" fill="${BRN}" ${st} transform="rotate(-30 50 50)"/><path d="M36 58 64 42" stroke="${W}" stroke-width="4"/><path d="M42 50l4 6M48 46l4 6M54 43l4 6" stroke="${W}" stroke-width="3"/>`,
    baseball: `<circle cx="50" cy="50" r="40" fill="${W}" ${st}/><path d="M24 22c14 16 14 40 0 56M76 22c-14 16-14 40 0 56" fill="none" stroke="${TOM}" stroke-width="4"/><path d="M26 34l6-2M28 46h7M26 58l6 2M74 34l-6-2M72 46h-7M74 58l-6 2" stroke="${TOM}" stroke-width="3"/>`,
    soccer: `<circle cx="50" cy="50" r="40" fill="${W}" ${st}/><path d="M50 32l17 12-6 20H39l-6-20Z" fill="${INK}"/><path d="M50 32V12M67 44l18-6M61 64l12 16M39 64 27 80M33 44l-18-6" stroke="${INK}" stroke-width="3"/>`,
    basketball: `<circle cx="50" cy="50" r="40" fill="${ORG}" ${st}/><path d="M10 50h80M50 10v80M22 22c16 16 16 40 0 56M78 22c-16 16-16 40 0 56" fill="none" ${st}/>`,
    heart: `<path d="M50 86S13 62 13 37a18 18 0 0 1 37-6 18 18 0 0 1 37 6c0 25-37 49-37 49Z" fill="${TOM}" ${st}/>`,
    music: `<path d="M38 74V22l40-10v50" fill="none" ${stw(6)}/><ellipse cx="28" cy="76" rx="13" ry="10" fill="${COB}" ${st}/><ellipse cx="68" cy="66" rx="13" ry="10" fill="${COB}" ${st}/>`,
    house: `<path d="M14 48 50 16l36 32" fill="${TOM}" ${st}/><rect x="22" y="44" width="56" height="44" fill="${W}" ${st}/><rect x="42" y="62" width="16" height="26" fill="${COB}" ${st}/><rect x="28" y="52" width="10" height="10" fill="${YEL}" ${st}/><rect x="62" y="52" width="10" height="10" fill="${YEL}" ${st}/>`,
    key: `<circle cx="30" cy="50" r="18" fill="${YEL}" ${st}/><circle cx="30" cy="50" r="7" fill="${W}" ${st}/><path d="M48 46h40v9h-8v12h-9V55h-6v8h-9V55h-8Z" fill="${YEL}" ${st}/>`,
    crown: `<path d="M12 74 18 26l18 22 14-30 14 30 18-22 6 48Z" fill="${YEL}" ${st}/><rect x="12" y="74" width="76" height="12" rx="3" fill="${YEL}" ${st}/><circle cx="50" cy="56" r="6" fill="${TOM}" ${st}/><circle cx="30" cy="60" r="4" fill="${COB}"/><circle cx="70" cy="60" r="4" fill="${COB}"/>`,

    /* ---------- clip-art ---------- */
    flamingo: `<path d="M58 96V62M66 96 62 64" stroke="${INK}" stroke-width="3"/><ellipse cx="58" cy="54" rx="24" ry="14" fill="${PINK}" ${st}/><path d="M38 52C26 44 30 26 34 18" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M38 52C26 44 30 26 34 18" fill="none" stroke="${PINK}" stroke-width="7" stroke-linecap="round"/><circle cx="36" cy="16" r="8" fill="${PINK}" ${st}/><path d="M42 14l12 6-10 2Z" fill="${INK}"/><circle cx="35" cy="14" r="2" fill="${INK}"/>`,
    rainbow: `<g fill="none" stroke-width="9"><path d="M10 78a40 40 0 0 1 80 0" stroke="${TOM}"/><path d="M19 78a31 31 0 0 1 62 0" stroke="${YEL}"/><path d="M28 78a22 22 0 0 1 44 0" stroke="${GRN}"/><path d="M37 78a13 13 0 0 1 26 0" stroke="${COB}"/></g><path d="M4 86c0-8 10-12 16-6 4-6 14-4 14 4 0 6-30 8-30 2ZM66 86c0-8 10-12 16-6 4-6 14-4 14 4 0 6-30 8-30 2Z" fill="${W}" ${st}/>`,
    dino: `<path d="M18 80c0-22 10-36 32-36h8c4-14 10-24 22-24 8 0 10 8 6 12l-8 2c-4 10-6 22-6 32 0 8-4 14-12 14H24Z" fill="${GRN}" ${st}/><path d="M30 80v12M52 80v12" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M34 44l4-8 4 8M46 42l4-8 4 8" fill="${DGRN}" ${st}/><circle cx="80" cy="26" r="2.5" fill="${INK}"/><path d="M18 76C10 74 6 66 6 60" fill="none" ${stw(6)}/>`,
    rocket: `<path d="M50 6c18 14 22 40 14 64H36C28 46 32 20 50 6Z" fill="${W}" ${st}/><circle cx="50" cy="36" r="9" fill="${COB}" ${st}/><path d="M36 54 20 72l18-2ZM64 54l16 18-18-2Z" fill="${TOM}" ${st}/><path d="M40 72h20l-4 12-6 10-6-10Z" fill="${YEL}" ${st}/>`,
    icecream: `<path d="M30 46h40L50 96Z" fill="${ORG}" ${st}/><path d="M34 54l20 26M46 50l14 20M38 64l16-14" stroke="${BRN}" stroke-width="2"/><circle cx="38" cy="38" r="14" fill="${PINK}" ${st}/><circle cx="62" cy="38" r="14" fill="${W}" ${st}/><circle cx="50" cy="24" r="14" fill="${COB}" ${st}/><circle cx="50" cy="10" r="5" fill="${TOM}" ${st}/>`,
    paw: `<ellipse cx="50" cy="64" rx="22" ry="18" fill="${BRN}" ${st}/><ellipse cx="24" cy="40" rx="9" ry="12" fill="${BRN}" ${st}/><ellipse cx="40" cy="26" rx="9" ry="12" fill="${BRN}" ${st}/><ellipse cx="60" cy="26" rx="9" ry="12" fill="${BRN}" ${st}/><ellipse cx="76" cy="40" rx="9" ry="12" fill="${BRN}" ${st}/>`,
    confetti: `<rect x="14" y="18" width="12" height="12" fill="${TOM}" transform="rotate(20 20 24)"/><rect x="62" y="12" width="12" height="12" fill="${COB}" transform="rotate(-15 68 18)"/><rect x="40" y="44" width="12" height="12" fill="${YEL}" transform="rotate(35 46 50)"/><rect x="72" y="62" width="12" height="12" fill="${PINK}" transform="rotate(10 78 68)"/><rect x="20" y="70" width="12" height="12" fill="${GRN}" transform="rotate(-30 26 76)"/><circle cx="44" cy="20" r="6" fill="${PINK}"/><circle cx="82" cy="38" r="6" fill="${YEL}"/><circle cx="16" cy="48" r="6" fill="${COB}"/><circle cx="52" cy="82" r="6" fill="${TOM}"/>`,
    bouquet: `<path d="M50 96 32 48M50 96 50 44M50 96 68 48" fill="none" stroke="${INK}" stroke-width="2.5"/><ellipse cx="30" cy="34" rx="16" ry="19" fill="${COB}" ${st}/><ellipse cx="70" cy="34" rx="16" ry="19" fill="${YEL}" ${st}/><ellipse cx="50" cy="26" rx="16" ry="19" fill="${TOM}" ${st}/><path d="M44 80h12l-6 6Z" fill="${PINK}" ${st}/>`,
    sunflower: `<path d="M50 60v36" stroke="${DGRN}" stroke-width="7" stroke-linecap="round"/><path d="M50 80c10-10 20-8 22-4-10 6-16 6-22 4Z" fill="${GRN}" ${st}/><g fill="${YEL}" ${st}>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="50" cy="16" rx="9" ry="15" transform="rotate(${a} 50 38)"/>`).join("")}</g><circle cx="50" cy="38" r="14" fill="${BRN}" ${st}/>`,
    sun: `<g stroke="${ORG}" stroke-width="7" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M50 6v12" transform="rotate(${a} 50 50)"/>`).join("")}</g><circle cx="50" cy="50" r="24" fill="${YEL}" ${st}/>`,
  };

  const ITEMS = [
    ["seasonal", "pumpkin", "Pumpkin", .62], ["seasonal", "ghost", "Ghost", .66], ["seasonal", "snowman", "Snowman", .72], ["seasonal", "tree", "Christmas tree", .8],
    ["seasonal", "candycane", "Candy cane", .72], ["seasonal", "snowflake", "Snowflake", .6], ["seasonal", "egg", "Easter egg", .58], ["seasonal", "shamrock", "Shamrock", .58],
    ["seasonal", "valentine", "Valentine heart", .6], ["seasonal", "flag", "Flag", .8], ["seasonal", "firework", "Firework", .7], ["seasonal", "leaf", "Fall leaf", .58],
    ["emojis", "smile", "Smile", .6], ["emojis", "grin", "Big grin", .6], ["emojis", "hearteyes", "Heart eyes", .6], ["emojis", "party", "Party face", .64],
    ["emojis", "stareyes", "Star struck", .6], ["emojis", "wink", "Wink", .6], ["emojis", "cool", "Sunglasses", .6], ["emojis", "kiss", "Kiss", .6],
    ["icons", "star", "Star", .6], ["icons", "balloon", "Balloon", .9], ["icons", "cake", "Cake", .6], ["icons", "gift", "Gift", .58], ["icons", "gradcap", "Grad cap", .56],
    ["icons", "trophy", "Trophy", .62], ["icons", "football", "Football", .5], ["icons", "baseball", "Baseball", .5], ["icons", "soccer", "Soccer ball", .5],
    ["icons", "basketball", "Basketball", .5], ["icons", "heart", "Heart", .58], ["icons", "music", "Music note", .62], ["icons", "house", "House", .62],
    ["icons", "key", "Key", .5], ["icons", "crown", "Crown", .56],
    ["clipart", "flamingo", "Flamingo", .78], ["clipart", "rainbow", "Rainbow", .6], ["clipart", "dino", "Dinosaur", .66], ["clipart", "rocket", "Rocket", .78],
    ["clipart", "icecream", "Ice cream", .7], ["clipart", "paw", "Paw print", .52], ["clipart", "confetti", "Confetti", .6], ["clipart", "bouquet", "Balloon bouquet", 1.0],
    ["clipart", "sunflower", "Sunflower", .8], ["clipart", "sun", "Sunshine", .6],
  ].map(([cat, id, name, h]) => ({ cat, id, name, h, svg: svg(ART[id]) }));

  const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!&?"];
  /* this season's sayings: the builder's example picks one at random */
  const SAYINGS = ["HAPPY HALLOWEEN", "TRICK OR TREAT", "BOO!", "EAT DRINK & BE SCARY", "CREEP IT REAL", "HOCUS POCUS", "STAY SPOOKY",
    "NO TRICKS JUST TREATS", "BOO CREW", "SPOOKY SEASON", "HAPPY HAUNTING", "SMELL MY FEET", "BEWARE!"];
  const MESSAGES = ["HAPPY HALLOWEEN", "TRICK OR TREAT", "EAT DRINK & BE SCARY", "CREEP IT REAL", "STAY SPOOKY", "BOO!",
    "HAPPY BIRTHDAY", "CONGRATS GRAD", "WELCOME HOME", "HAPPY ANNIVERSARY", "WELCOME BABY", "HAPPY RETIREMENT", "GET WELL SOON", "STATE CHAMPS!", "MERRY CHRISTMAS"];
  /* the yard letters' paint: the Halloween set (pumpkin, witch purple, ink, bone). The catalog art keeps the site palette. */
  const PUMPKIN = "#F2711C", WITCH = "#7A3FB0", BONE = "#F4EDE0";
  const LETTER_FILLS = [PUMPKIN, WITCH, INK, BONE];

  const CATEGORIES = [
    { id: "seasonal", name: "Seasonal" }, { id: "letters", name: "Letters" }, { id: "emojis", name: "Emojis" },
    { id: "icons", name: "Icons" }, { id: "messages", name: "Messages" }, { id: "clipart", name: "Clip-art" },
  ];

  const byId = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
  const letterFill = (i) => LETTER_FILLS[i % 4];

  /* WHITE is the light letter colour, the one that takes an ink edge instead of a white one */
  window.DECOR = { ITEMS, LETTERS, MESSAGES, SAYINGS, saying: () => SAYINGS[Math.floor(Math.random() * SAYINGS.length)], CATEGORIES, byId, letterFill, LETTER_HEIGHT: .46, INK, WHITE: BONE };
})();
