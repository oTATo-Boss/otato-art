const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1900,height:1200}});
await p.goto('file:///home/claude/otato-3d/tex/tex.html'); await p.waitForTimeout(800); await p.evaluate(()=>document.fonts.ready);
for (const id of ['prompt','polaroid','pennant','stickers','sign','note','ghost','mat','book','bin']) {
  await p.locator('#'+id).screenshot({path:`/home/claude/otato-3d/tex/${id}.png`, omitBackground:true});
}
await b.close();})();
