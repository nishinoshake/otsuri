import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

// Generate crisp, dependency-free PNG app icons from simple geometric shapes.
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const rounded = (x,y,left,top,width,height,radius) => {
    const dx = Math.max(left + radius - x, 0, x - (left + width - radius));
    const dy = Math.max(top + radius - y, 0, y - (top + height - radius));
    return dx*dx + dy*dy <= radius*radius;
  };
  function sample(x,y) {
    let c = 10;
    if (rounded(x,y,.265,.185,.47,.63,.065)) c=245;
    if (rounded(x,y,.29,.21,.42,.58,.042)) c=20;
    if (rounded(x,y,.325,.25,.35,.125,.018)) c=245;
    // A restrained zero in the display, legible even at launcher size.
    if (rounded(x,y,.598,.274,.047,.077,.012)) c=20;
    if (rounded(x,y,.611,.287,.021,.051,.005)) c=245;
    for(let row=0;row<3;row++) for(let col=0;col<3;col++) {
      if (rounded(x,y,.325+col*.125,.421+row*.108,.10,.078,.018)) c=col===2?245:170;
    }
    if (rounded(x,y,.597,.657,.056,.008,.004) || rounded(x,y,.597,.677,.056,.008,.004)) c=20;
    return c;
  }
  // Supersampling keeps the small rounded edges smooth at every export size.
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
    let sum=0;
    for(let sy=0;sy<4;sy++) for(let sx=0;sx<4;sx++) sum+=sample((x+(sx+.5)/4)/size,(y+(sy+.5)/4)/size);
    const i=y*(size*4+1)+1+x*4;
    raw[i]=raw[i+1]=raw[i+2]=Math.round(sum/16); raw[i+3]=255;
  }
  function chunk(type, data) {
    const bytes = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of bytes) { crc ^= byte; for(let n=0;n<8;n++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
    const out = Buffer.alloc(data.length+12); out.writeUInt32BE(data.length); bytes.copy(out,4); out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4); return out;
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size,4); header[8]=8; header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
await mkdir('dist/icons', {recursive:true});
for (const size of [192,512]) await writeFile(`dist/icons/icon-${size}.png`,png(size));
let html = await readFile('dist/index.html','utf8');
html = html.replace('lang="en"','lang="ja"').replace('shrink-to-fit=no','shrink-to-fit=no, viewport-fit=cover').replace('</head>',`<meta name="theme-color" content="#000000" />
<meta name="color-scheme" content="dark" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<link rel="icon" type="image/png" href="/icons/icon-192.png" />
<style>html,body,#root{background:#000;color:#ededed;width:100%;height:100%;margin:0}#root{height:100vh;height:100dvh}</style>
<script src="/register-sw.js" defer></script>
</head>`);
await writeFile('dist/index.html',html);
async function files(dir='dist') {
  const entries = await readdir(dir,{withFileTypes:true});
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(`${dir}/${entry.name}`) : `${dir}/${entry.name}`))).flat();
}
const paths = (await files()).filter(p=>!p.endsWith('/sw.js')&&!p.endsWith('.map')&&!p.endsWith('.gitkeep')&&!p.endsWith('/_headers')&&!p.endsWith('/_redirects')).sort();
const hash = createHash('sha256');
for (const path of paths) hash.update(await readFile(path));
const template = await readFile('scripts/sw-template.js','utf8');
hash.update(template);
const version = hash.digest('hex').slice(0,16);
await writeFile('dist/sw.js',template.replace('__CACHE__',JSON.stringify(`otsuri-${version}`)).replace('__ASSETS__',JSON.stringify(paths.map(p=>p === 'dist/index.html' ? '/' : p.slice(4)))));
console.log(`PWA generated: ${paths.length} offline assets, version ${version}`);
