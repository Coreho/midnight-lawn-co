// Run against current public services: node tools/check-address.cjs <Playwright module> <address>
const { chromium } = require(process.argv[2] || 'playwright');
const address = process.argv[3];
if (!address) throw new Error('Supply a Wayne County street address.');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1200,height:800}, reducedMotion:'reduce'});
    page.on('console', m => console.log(m.text()));
    page.on('pageerror', e => console.error(e.message));
    await page.goto('http://127.0.0.1:8080/#builder');
    const result = await page.evaluate(async (address) => {
      const {survey,browserEnv} = await import('./js/yard-survey.js');
      const {site,yard} = await survey(address,browserEnv(),(step,state,note)=>{if(state!=='progress')console.log(step,state,note||'');});
      const {createLawnRender}=await import('./js/render3d.js');
      const canvas=document.createElement('canvas'); document.body.replaceChildren(canvas);canvas.style.cssText='width:100vw;height:100vh';
      const render=await createLawnRender(canvas,{cols:yard.cols,rows:yard.rows,cellM:yard.cellM,setbackRows:yard.setbackRows,pieces:[],survey:{site,yard}},{reduceMotion:true,view:'survey'});
      render.setTime('day',true);render.setView('survey',true);
      return {address:site.geo.matched,matchedBy:site.geo.matchedBy,buildings:site.buildings.length,trees:site.trees.length,lawnCells:yard.lawnCells,cols:yard.cols,rows:yard.rows,roof:site.buildings.find(b=>b.id===yard.targetId).rects};
    },address);
    console.log(JSON.stringify(result,null,2));
    await page.screenshot({path:'.impeccable/review/realism-live-address.png'});
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
