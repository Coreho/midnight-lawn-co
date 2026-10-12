import test from 'node:test';
import assert from 'node:assert/strict';
import { geocode, selectAddressHouse, fitBuilding, fitRoof, buildYard, analyzeSite, CELL, demSample } from '../js/yard-survey.js';
import { makeSite } from './fixtures/yard.mjs';
const street = {x:0,y:0,tx:1,ty:0};
const geo = {number:'120',streetKey:'MAIN',sideVec:[0,1]};
const house = (id,cx,cy,len=10,wid=10) => ({id,cx,cy,area:len*wid,rects:[{cx,cy,len,wid,ang:0}]});

test('same number on another street does not become the address anchor', () => {
  const homes = [house(0,0,18),house(1,18,18)];
  const result = selectAddressHouse(homes,geo,[{num:'120',street:'Side Rd',at:[18,18]}],street);
  assert.equal(result.target.id,0); assert.equal(result.matchedBy,'range');
});
test('an OSM number inside the correct footprint outranks an interpolated road pin', () => {
  const result = selectAddressHouse([house(0,0,18),house(1,18,18)],geo,[{num:'120',street:'Main St',at:[18,18]}],street);
  assert.equal(result.target.id,1); assert.equal(result.matchedBy,'osm');
});
test('a number on the wrong side cannot override Census side evidence', () => {
  const result = selectAddressHouse([house(0,0,18),house(1,0,-12)],geo,[{num:'120',at:[0,-12]}],street);
  assert.equal(result.target.id,0); assert.equal(result.matchedBy,'range');
});
test('duplicate nearby numbers without street tags remain unconfirmed', () => {
  const result = selectAddressHouse([house(0,-10,18),house(1,10,18)],geo,[{num:'120',at:[-10,18]},{num:'120',at:[10,18]}],street);
  assert.equal(result.matchedBy,'range');
});
test('duplicate tile markers for one house cannot hide ambiguity with another house', () => {
  const result = selectAddressHouse([house(0,-10,18),house(1,10,18)],geo,[{num:'120',at:[-10,18]},{num:'120',at:[-10,18]},{num:'120',at:[10,18]}],street);
  assert.equal(result.matchedBy,'range');
});
test('missing ground measurements cannot generate buildings at a fabricated zero elevation', () => {
  assert.throws(() => analyzeSite({geo:{...geo},ctx:{},streets:{roads:[],numbers:[]},points:{n:0,e:[],nn:[],z:[],cls:[]},photo:null}),{code:'no-ground'});
});
test('classified building returns are preserved even when they have multiple returns', () => {
  const p={e:[],nn:[],z:[],cls:[],rn:[],nr:[],inten:[]};
  const add=(x,y,z,cls,nr=1)=>{p.e.push(x);p.nn.push(y);p.z.push(z);p.cls.push(cls);p.rn.push(nr);p.nr.push(nr);p.inten.push(1000+x*2);};
  for(let x=-45.5;x<46;x++) for(let y=-45.5;y<46;y++) {
    const roof=Math.abs(x)<5&&y>14&&y<24;
    if(roof) for(const dx of [-.2,.2]) for(const dy of [-.2,.2]) add(x+dx,y+dy,103+2.4*(1-Math.abs(y+dy-19)/5),6,2);
    else add(x,y,100,2);
  }
  p.n=p.e.length;
  const site=analyzeSite({geo:{...geo},ctx:{},streets:{roads:[{name:'Main St',named:true,cls:'residential',pts:[[-46,0],[46,0]]}],numbers:[]},points:p,photo:null});
  assert.ok(site.buildings.length>=1);assert.equal(site.targetId,0);assert.equal(site.geo.matchedTargetId,0);
  assert.ok(Math.abs(site.buildings[0].rects[0].ridge-5.4)<.5);
});
test('deep house frontage beats a shallow neighboring house', () => {
  const result = selectAddressHouse([house(0,0,25,10,24),house(1,13,12,8,8)],geo,[],street);
  assert.equal(result.target.id,0);
});
const match = (address,extra={}) => ({matchedAddress:address,matchType:'Exact',coordinates:{x:-83.18,y:42.25},addressComponents:{streetName:'MAIN',city:'LINCOLN PARK',state:'MI'},...extra});
test('ambiguous geocoder results ask for city/ZIP', async () => {
  await assert.rejects(geocode('120 Main St',{jsonp:async()=>({result:{addressMatches:[match('120 MAIN ST'),match('120 MAIN ST, ANOTHER CITY')]}})}),{code:'ambiguous-address'});
});
test('different returned house number is rejected', async () => {
  await assert.rejects(geocode('120 Main St',{jsonp:async()=>({result:{addressMatches:[match('122 MAIN ST')]}})}),{code:'no-match'});
});
test('an exact geocoder match wins over non-exact alternatives', async () => {
  const result = await geocode('120 Main St',{jsonp:async()=>({result:{addressMatches:[match('122 MAIN ST',{matchType:'Non_Exact'}),match('120 MAIN ST')]}})});
  assert.equal(result.number,'120'); assert.equal(result.matched,'120 MAIN ST');
});
test('a house rotated eight degrees is not forced into a larger street-aligned box', () => {
  const a = 8*Math.PI/180, pts=[];
  for(let u=-6;u<=6;u+=.25) for(let v=-4;v<=4;v+=.25) pts.push([u*Math.cos(a)-v*Math.sin(a),u*Math.sin(a)+v*Math.cos(a),3+2*(1-Math.abs(v)/4),1]);
  const b = fitBuilding(pts,0), r = b.rects[0];
  assert.ok(Math.abs(r.ang-a)<=2.01*Math.PI/180); assert.ok(b.area<105);
});
for (const shape of ['gable','gable-cross','hip']) test('roof fitting recovers '+shape+' height despite chimney outliers', () => {
  const hs=[],us=[],vs=[];
  for(let u=-6;u<=6;u+=.3) for(let v=-4;v<=4;v+=.3) {
    const w = shape==='gable' ? 1-Math.abs(v)/4 : shape==='gable-cross' ? 1-Math.abs(u)/6 : 1-Math.min(1,Math.max(Math.abs(v)/4,(Math.abs(u)-2)/4));
    us.push(u);vs.push(v);hs.push(3+2.4*w+(hs.length%37===0?3:0));
  }
  const r=fitRoof(hs,us,vs,12,8);
  assert.equal(r.roof,shape);assert.ok(Math.abs(r.eave-3)<.15);assert.ok(Math.abs(r.ridge-5.4)<.15);
});
test('flat roofs remain flat', () => { assert.equal(fitRoof(Array(30).fill(4),Array(30).fill(0),Array(30).fill(0),10,8).roof,'flat'); });
test('yard stays inside lot and sidewalk setback and blocks paving', () => {
  const site=makeSite(), y=buildYard(site,0), f=y.frame;
  assert.ok(y.cols*y.cellM<=y.lot.x1-y.lot.x0);
  assert.ok(y.rows*y.cellM/2<=y.walk.z0);
  assert.ok(y.types.includes(CELL.pave));
  for(let r=y.rows-y.setbackRows;r<y.rows;r++) for(let c=0;c<y.cols;c++) assert.notEqual(y.types[r*y.cols+c],CELL.ok);
  assert.ok(Math.abs(demSample(site,f.ox,f.oy)-f.base)<1e-5);
});
test('a too-narrow lot does not expand the grid beyond its estimated boundary', () => {
  const site=makeSite();site.buildings=[house(0,0,19,1.8,12),house(1,-2.8,19,1.8,12),house(2,2.8,19,1.8,12)];
  assert.throws(()=>buildYard(site,0),{code:'narrow-yard'});
});
