#!/usr/bin/env node
// 把 Blender 导出的开场工作台素材处理成网站用的版本。
// 用法：先在 Blender 里跑完五个 build_*.py 和 export_web.py，再在项目目录运行：
//   npm run publish:workbench
//
// 输入：3d/workbench/renders/web/（plate.png、各玩具透明图、shadow_*.png、charm_*.glb、rail.glb、cat.glb、layout.json）
// 输出：public/open/plate.webp、public/open/sprites/*.webp（含 *-shadow.webp）、public/open/3d/*.glb、src/shell/workbench-layout.json
//
// 做的事：
// 1. 调色（去灰）：Blender 的 AgX 出图最亮只到 0.9 左右，这里拉白点、加一点 S 曲线和饱和、略偏暖。
//    背景和透明小图用同一套参数，拼在一起颜色才一致。
// 2. 转 webp。
// 3. 3D 模型用 meshopt 压缩几何、贴图转 webp 并限制在 1024，体积大约只剩原来的三分之一。
//    不能合并/拍平节点：网页靠节点名找屏幕、钩子、亚克力这些部件。
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, resample, weld, meshopt, textureCompress } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "3d/workbench/renders/web");
const OUT = join(root, "public/open");

// ── 调色参数（改这里就能整体调画面的冷暖、亮度）──
const GRADE = { black: 0.02, white: 0.95, curve: 0.3, saturation: 1.15, warm: [1.018, 1.0, 0.975] };

function gradePixels(buf, channels) {
  const { black, white, curve, saturation, warm } = GRADE;
  for (let i = 0; i < buf.length; i += channels) {
    const c = [0, 1, 2].map((k) => {
      const v = Math.min(1, Math.max(0, (buf[i + k] / 255 - black) / (white - black)));
      const s = v * v * (3 - 2 * v);
      return v + (s - v) * curve;
    });
    const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    for (let k = 0; k < 3; k++) {
      const v = (l + (c[k] - l) * saturation) * warm[k];
      buf[i + k] = Math.round(Math.min(1, Math.max(0, v)) * 255);
    }
  }
}

async function gradeImage(src, dst, { alpha, quality }) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  gradePixels(data, info.channels);
  let img = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
  if (!alpha) img = img.removeAlpha();
  await img.webp({ quality, alphaQuality: 100, effort: 6 }).toFile(dst);
}

async function optimizeGlb(io, src, dst) {
  const doc = await io.read(src);
  await doc.transform(
    dedup(),
    prune(),
    resample(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder }),
  );
  await io.write(dst, doc);
}

// ── 影子层 ──
// Blender 阴影捕捉渲出来的 alpha = 这个玩具挡掉了多少光。转成一张"正片叠底"用的图：
// 没影子的地方是白色（叠上去不变），有影子的地方按下面的颜色压暗，叫桌面/墙原本的颜色透出来，不会死黑。
// SHADOW.dark：最深处每个通道最多压暗多少（蓝通道少压一点，影子偏冷，和窗外天光一致）。
// floor：低于这个强度的当噪点去掉（阴影捕捉会在整面墙上留一层很淡的灰）。
// 只在玩具附近找影子：左右各放宽 near 倍玩具宽度（影子朝右，右边放宽 far 倍），上下放宽 1 倍高度。
const SHADOW = { dark: [0.66, 0.64, 0.56], blur: 1.2, floor: 0.06, near: 1, far: 3 };

async function shadowLayer(src, dst, sp) {
  const meta = await sharp(src).metadata();
  const alpha = await sharp(src).ensureAlpha().extractChannel(3).blur(SHADOW.blur).raw().toBuffer();
  const { width: w, height: h } = meta;
  const wx0 = Math.floor((sp.x - sp.w * SHADOW.near) * w), wx1 = Math.ceil((sp.x + sp.w * (1 + SHADOW.far)) * w);
  const wy0 = Math.floor((sp.y - sp.h) * h), wy1 = Math.ceil((sp.y + sp.h * 2) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = alpha[i] / 255;
      alpha[i] = x < wx0 || x > wx1 || y < wy0 || y > wy1 ? 0 : Math.round(Math.max(0, (v - SHADOW.floor) / (1 - SHADOW.floor)) * 255);
    }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alpha[y * w + x] > 5) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(w - 1, x1 + 2); y1 = Math.min(h - 1, y1 + 2);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = Buffer.alloc(cw * ch * 3);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const s = alpha[(y + y0) * w + x + x0] / 255;
      for (let k = 0; k < 3; k++) out[(y * cw + x) * 3 + k] = Math.round((1 - s * SHADOW.dark[k]) * 255);
    }
  await sharp(out, { raw: { width: cw, height: ch, channels: 3 } }).webp({ quality: 88, effort: 6 }).toFile(dst);
  return { x: x0 / w, y: y0 / h, w: cw / w, h: ch / h };
}

const kb = async (p) => `${Math.round((await stat(p)).size / 1024)}KB`;

async function main() {
  if (!existsSync(join(SRC, "layout.json"))) {
    console.error(`找不到 ${SRC}/layout.json，先在 Blender 里跑 export_web.py`);
    process.exit(1);
  }
  const layout = JSON.parse(await readFile(join(SRC, "layout.json"), "utf8"));
  await mkdir(join(OUT, "sprites"), { recursive: true });
  await mkdir(join(OUT, "3d"), { recursive: true });

  await gradeImage(join(SRC, "plate.png"), join(OUT, "plate.webp"), { alpha: false, quality: 84 });
  console.log("背景 plate.webp", await kb(join(OUT, "plate.webp")));
  for (const id of Object.keys(layout.sprites)) {
    await gradeImage(join(SRC, `${id}.png`), join(OUT, "sprites", `${id}.webp`), { alpha: true, quality: 90 });
    console.log(`小图 ${id}.webp`, await kb(join(OUT, "sprites", `${id}.webp`)));
    const sh = join(SRC, `shadow_${id}.png`);
    if (existsSync(sh)) {
      const dst = join(OUT, "sprites", `${id}-shadow.webp`);
      const box = await shadowLayer(sh, dst, layout.sprites[id]);
      if (box) {
        layout.sprites[id].shadow = box;
        console.log(`影子 ${id}-shadow.webp`, await kb(dst));
      }
    }
  }

  await MeshoptEncoder.ready;
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
  // 两张 Coming soon 卡长得一样，网页只用一份模型
  const models = { cat: "cat", rail: "rail", charm_prompt: "charm_prompt", charm_model: "charm_model", charm_work: "charm_work", charm_ghost: "charm_ghost1" };
  for (const [name, file] of Object.entries(models)) {
    await optimizeGlb(io, join(SRC, `${file}.glb`), join(OUT, "3d", `${name}.glb`));
    console.log(`模型 ${name}.glb`, await kb(join(OUT, "3d", `${name}.glb`)));
  }

  await writeFile(join(root, "src/shell/workbench-layout.json"), JSON.stringify(layout, null, 1) + "\n");
  console.log("相机和位置 → src/shell/workbench-layout.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
