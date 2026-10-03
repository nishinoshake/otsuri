import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('オフラインでHTMLとすべてのアセットを返す・旧キャッシュのみ削除する', async () => {
  const source = await readFile('dist/sw.js','utf8');
  const handlers = {};
  const stores = new Map([['otsuri-old',new Map()],['other-app',new Map()]]);
  let offline = false;
  let claimed = false;
  const context = {
    URL,
    self: { skipWaiting: async()=>{}, location: {origin:'https://otsuri.example'}, clients:{claim:async()=>{claimed=true;}}, addEventListener:(name,fn)=>handlers[name]=fn },
    caches: {
      keys:async()=>[...stores.keys()], delete:async key=>stores.delete(key),
      open:async key=>{
        if(!stores.has(key)) stores.set(key,new Map());
        const store=stores.get(key);
        return {addAll:async paths=>{for(const p of paths) store.set(p,await readFile(p==='/' ? 'dist/index.html' : `dist${p}`));},match:async path=>store.get(path)};
      },
    },
    fetch:async()=>{if(offline) throw new Error('offline'); return 'network';},
  };
  assert.ok(!source.includes('"/index.html"'), 'Cloudflareが転送する/index.htmlをキャッシュしない');
  vm.runInNewContext(source,context);
  let pending;
  handlers.install({waitUntil:p=>pending=p}); await pending;
  handlers.activate({waitUntil:p=>pending=p}); await pending;
  assert.ok(claimed); assert.ok(stores.has('other-app')); assert.ok(!stores.has('otsuri-old'));
  offline=true;
  const request=async(path,mode)=>{let response;handlers.fetch({request:{url:`https://otsuri.example${path}`,method:'GET',mode},respondWith:p=>response=p});return await response;};
  const html=await request('/?installed=1','navigate');
  assert.match(html.toString(),/rel="manifest"/);
  for(const [name,store] of stores) if(name.startsWith('otsuri-')) for(const path of store.keys()) assert.ok((await request(path,'cors')).length>0);
  assert.equal(await request('/unrelated-api','cors'),undefined);
});

test('インストール用manifestとアイコンが揃う',async()=>{
  const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
  assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){
    const bytes=await readFile(`dist${icon.src}`);
    assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));
  }
});
