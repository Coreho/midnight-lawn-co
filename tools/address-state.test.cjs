// Fast browser regression checks with controlled survey and renderer completion.
const {chromium}=require(process.argv[2]||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({reducedMotion:'reduce'});
  const fixture=(await import('./fixtures/yard.mjs')).makeSite();
  fixture.dem=Array.from(fixture.dem);fixture.surface.cls=Array.from(fixture.surface.cls);
  await page.addInitScript(site=>{window.__site=site;window.__pending=[];window.__renderCount=0;window.__disposed=0},fixture);
  const source=fs.readFileSync('js/yard-survey.js','utf8').replace('export async function survey(', 'async function liveSurvey(')+`
  export function survey(address){return new Promise(resolve=>window.__pending.push(()=>{
   const site=structuredClone(window.__site);site.dem=Float32Array.from(site.dem);site.surface.cls=Uint8Array.from(site.surface.cls);
   site.geo.matched=address;site.geo.matchedTargetId=0;
   resolve({site,yard:buildYard(site,0)});
  }))}
  `;
  await page.route('**/js/yard-survey.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
  await page.route('**/js/render3d.js',route=>route.fulfill({contentType:'text/javascript',body:`
   export async function createLawnRender(canvas,model){window.__renderCount++;
    if(window.__holdPreview)await new Promise(resolve=>window.__releasePreview=resolve);
    return {setTime(){},setView(){},setTarget(){},dispose(){window.__disposed++},shots:async()=>[]}
   }
  `}));
  await page.goto('http://127.0.0.1:8080/#builder');
  const submit=async address=>{await page.locator('#bAddr').fill(address);await page.locator('#bAddrGo').click();await page.waitForFunction(()=>window.__pending.length>0)};
  const finish=async()=>{await page.evaluate(()=>window.__pending.shift()());await page.waitForFunction(()=>!document.querySelector('#bAddrGo').disabled)};
  await submit('120 Main St, Lincoln Park, MI');await finish();
  assert.equal(await page.locator('#bNext1').isEnabled(),true);
  await page.locator('#bAddr').fill('2221 Schultz St, Lincoln Park, MI');
  assert.equal(await page.locator('#bSurvey').isHidden(),true,'Editing the address must hide the previous map');
  assert.equal(await page.locator('#bNext1').isDisabled(),true,'Next must not reuse the previous address');
  console.log('PASS: editing an address invalidates the displayed model and Next action');
  await page.locator('#bAddrGo').click();await page.waitForFunction(()=>window.__pending.length===1);
  await page.locator('#bAddr').fill('1426 Garfield Ave, Lincoln Park, MI');
  await page.evaluate(()=>window.__pending.shift()());
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#bSurvey').isHidden(),true,'A stale request must not reappear');
  assert.equal(await page.locator('#bAddrGo').isEnabled(),true);
  console.log('PASS: editing during lookup ignores the old response and enables a new lookup');
  await page.locator('#bAddrGo').click();await page.waitForFunction(()=>window.__pending.length===1);await finish();
  assert.equal(await page.locator('#bSurveyAddr').textContent(),'1426 Garfield Ave, Lincoln Park, MI');
  assert.equal(await page.locator('#bNext1').isEnabled(),true);
  console.log('PASS: a subsequent lookup displays its own address');
  await page.evaluate(()=>window.__holdPreview=true);
  await submit('120 Main St, Lincoln Park, MI');
  await page.evaluate(()=>window.__pending.shift()());await page.waitForFunction(()=>typeof window.__releasePreview==='function');
  const disposed=await page.evaluate(()=>window.__disposed);
  await page.locator('#bAddr').fill('2221 Schultz St, Lincoln Park, MI');
  await page.evaluate(()=>window.__releasePreview());await page.waitForTimeout(100);
  assert.equal(await page.locator('#bSurvey').isHidden(),true,'A stale preview must not be restored');
  assert.ok(await page.evaluate(()=>window.__disposed)>disposed,'Stale renderer must be disposed');
  assert.equal(await page.locator('#bNext1').isDisabled(),true);
  console.log('PASS: stale preview completion cannot replace the new address');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
