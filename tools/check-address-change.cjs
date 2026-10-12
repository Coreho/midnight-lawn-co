// Exercise consecutive real address submissions through the actual builder UI.
const { chromium } = require(process.argv[2] || 'playwright');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const base = process.argv[3] || 'http://127.0.0.1:8080/';
const addresses = process.argv.slice(4);
if (addresses.length < 2) throw new Error('Supply at least two addresses after the base URL.');
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1200,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
    page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR:',m.text())});
    page.on('request',r=>{if(r.url().includes('onelineaddress') || r.url().includes('exportImage'))console.log('REQUEST:',r.url())});
    await page.goto(base+'#builder');
    const hashes=[];
    for(const [i,address] of addresses.entries()) {
      await page.locator('#bAddr').fill(address);
      if(i>0) {
        assert.equal(await page.locator('#bSurvey').isHidden(),true,'Previous address remains visible after editing');
        assert.equal(await page.locator('#bNext1').isDisabled(),true,'Next can reuse a stale address');
      }
      await page.locator('#bAddrGo').click();
      await page.waitForFunction(()=>!document.querySelector('#bAddrGo').disabled,{},{timeout:120000});
      const error=await page.locator('#bAddrErr').textContent();
      if(error.trim()) throw new Error(address+': '+error);
      console.log('RESULT:',await page.locator('#bSurveyAddr').textContent(), await page.locator('#bSurveyFacts').textContent());
      const photo=await page.locator('#bAerial').evaluate(c=>c.toDataURL());
      const hash=createHash('sha256').update(photo).digest('hex');hashes.push(hash);console.log('PHOTO HASH:',hash);
      await page.locator('#bSurvey').screenshot({path:'.impeccable/review/address-change-'+i+'.png'});
    }
    if(new Set(hashes).size!==hashes.length)throw new Error('Repeated aerial image after changing address');
    console.log('Distinct locations verified for every address.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
