#!/usr/bin/env node
// 把 Blender 导出的开场工作台素材处理成网站用的版本。
// 用法：先在 Blender 里跑完五个 build_*.py 和 export_web.py，再在项目目录运行：
//   npm run publish:workbench
//
// 输入：3d/workbench/renders/web/（plate.png、各玩具透明图、charm_*.glb、rail.glb、cat.glb、layout.json）
// 输出：public/open/plate.webp、public/open/sprites/*.webp、public/open/3d/*.glb、src/shell/workbench-layout.json
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
