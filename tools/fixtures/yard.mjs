// Deterministic street, sloping terrain, two measured homes, a sidewalk and driveway.
export function makeSite() {
  const half = 46, n1 = 92, n = 184, cs = .5;
  const dem = Float32Array.from({length: n1 * n1}, (_, i) => ((i % n1) - 45.5) * .02);
  const cls = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -half + (i + .5) * cs, y = -half + (j + .5) * cs;
    if (Math.abs(y) < 4.3) cls[j * n + i] = 2;
    else if (y >= 7 && y <= 8.5 || x > 4 && x < 6 && y > 8 && y < 15) cls[j * n + i] = 1;
  }
  const building = (id, x) => ({id, cx:x, cy:19, area:100, rects:[{cx:x,cy:19,len:10,wid:10,ang:0,eave:3,ridge:5.4,roof:'gable'}]});
  return {
    half, n1, demCs:1, dem, surface:{n,cs,cls},
    geo:{number:'120',street:'Main St',streetKey:'MAIN',matched:'120 MAIN ST, LINCOLN PARK, MI',matchedBy:'range'},
    buildings:[building(0,0),building(1,18)], houses:[0,1],targetId:0,
    roads:[{name:'Main St',named:true,cls:'residential',half:4.3,pts:[[-46,0],[46,0]]}],
    street:{name:'Main St',x:0,y:0,tx:1,ty:0,half:4.3,gutters:[4.1,4.1]},
    trees:[{x:-8,y:12,h:7,r:2}],shrubs:[{x:4,y:15,h:.8,r:.7}],
    paving:[{cx:0,cy:7.75,len:88,wid:1.5,ang:0,along:true},{cx:5,cy:12,len:8,wid:2,ang:Math.PI/2}],
    photo:null,photoOk:false,lidar:{points:10000,bytes:0,files:1},numbers:[],
  };
}
