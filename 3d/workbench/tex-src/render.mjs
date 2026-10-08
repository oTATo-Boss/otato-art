// 把这几个 HTML 里的元素截成透明 PNG，输出到 ../tex/，给 Blender 当贴图用。
// 用法（项目根目录）：npx -y playwright@1 install chromium && node 3d/workbench/tex-src/render.mjs
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "tex");
const { chromium } = await import("playwright").catch(() => {
  console.error("需要 playwright：npx -y playwright@1 install chromium，然后 npm i -D playwright");
  process.exit(1);
});
const pages = {
  "workbench.html": ["note1", "note2", "note3", "note4", "note5", "cover", "screen", "tag1", "tag2", "tag3", "logo_sticker", "ghost", "mat"],
  "polaroid.html": [["polaroid2", "polaroid2"]],
  "sign-stickers.html": ["sign", ["stickers", "stickerpack"]],
};
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1900, height: 1300 } });
for (const [file, ids] of Object.entries(pages)) {
  await p.goto(pathToFileURL(join(here, file)).href);
  await p.evaluate(() => document.fonts.ready);
  for (const item of ids) {
    const [id, name] = Array.isArray(item) ? item : [item, item];
    await p.locator("#" + id).screenshot({ path: join(out, `${name}.png`), omitBackground: true });
    console.log(`${name}.png`);
  }
}
await b.close();
