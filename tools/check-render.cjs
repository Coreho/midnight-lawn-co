// Local browser smoke check; pass the path to an installed Playwright package.
const { chromium } = require(process.argv[2] || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto('http://127.0.0.1:8080/#builder');
      await page.locator('.mode-card').filter({ hasText: 'A typical lawn' }).click();
      await page.locator('#bNext1').click();
      await page.locator('[data-bgo="3"]').click();
      await page.locator('#bShots button').first().waitFor({ timeout: 45000 });
      for (const time of ['day', 'night']) {
        await page.locator('#renderStage [data-time-set="' + time + '"]').click();
        await page.locator('#renderStage').screenshot({ path: '.impeccable/review/realism-' + name + '-' + time + '.png' });
      }
      for (const view of ['street', 'close', 'drive', 'next', 'above']) await page.locator('#renderStage [data-angle="' + view + '"]').click();
      const widthOk = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      if (!widthOk) throw new Error(name + ' horizontal overflow');
      console.log(name, 'five camera views, day/night,', await page.locator('#bShots button').count(), 'thumbnails');
      await page.close();
    }
    // Exercise the measured-yard branch with known terrain/footprints, without public API variability.
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:8080/');
    const fixture = (await import('./fixtures/yard.mjs')).makeSite();
    fixture.dem = Array.from(fixture.dem); fixture.surface.cls = Array.from(fixture.surface.cls);
    await page.evaluate(async (site) => {
      const { buildYard } = await import('./js/yard-survey.js');
      const { createLawnRender } = await import('./js/render3d.js');
      site.dem = Float32Array.from(site.dem); site.surface.cls = Uint8Array.from(site.surface.cls);
      const yard = buildYard(site, 0), canvas = document.createElement('canvas');
      document.body.replaceChildren(canvas); canvas.style.cssText = 'width:100vw;height:100vh';
      window.testYard = await createLawnRender(canvas, { cols: yard.cols, rows: yard.rows, cellM: yard.cellM, setbackRows: 2, pieces: [{kind:'letter',ch:'A',fill:'#f2711c',h:.4572,c:4,r:4}], survey: {site, yard} }, {edit: true, reduceMotion: true, view: 'overhead'});
      window.testYard.setTime('day', true); window.testYard.setView('overhead', true);
    }, fixture);
    await page.screenshot({ path: '.impeccable/review/realism-survey.png' });
    const before = await page.screenshot();
    await page.evaluate(async () => {
      testYard.setTime('night', true); testYard.setView('curb', true);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const after = await page.screenshot();
    if (before.equals(after)) throw new Error('Survey failed to redraw after changing light/camera');
    await page.evaluate(async () => { await testYard.setPieces([]); testYard.setTime('night', true); testYard.setTarget(1); testYard.dispose(); });
    console.log('survey: terrain, measured houses, foliage, edit grid, piece updates, selection, disposal');
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('No browser errors.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
