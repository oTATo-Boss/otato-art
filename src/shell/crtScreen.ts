/**
 * 复古小显示器上的屏幕：一个一直在"生成"作品的小界面。
 * 画在 canvas 上，作为 three.js 的贴图实时更新。
 */

const W = 512;
const H = 332;
const TILE_COLORS = [
  ["#2B5FFC", "#8FB0FF"],
  ["#E11D48", "#FF9DB0"],
  ["#FFB81C", "#FFE29A"],
  ["#22A06B", "#9FE3C3"],
  ["#7C5CFF", "#C9BCFF"],
  ["#FF7A1A", "#FFC59A"],
];

type Tile = { c: number; t: number; speed: number; seed: number };

export function createCrtScreen() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 2 × 3 的作品格，每格从噪点慢慢"长"出画面
  const tiles: Tile[] = Array.from({ length: 6 }, (_, i) => ({ c: i % TILE_COLORS.length, t: Math.random() * 0.8, speed: 0.18 + Math.random() * 0.12, seed: Math.random() * 1000 }));
  let count = 128;
  let cursor = 0;

  const rand = (s: number) => {
    const x = Math.sin(s) * 43758.5453;
    return x - Math.floor(x);
  };

  function drawTile(x: number, y: number, w: number, h: number, tile: Tile) {
    const [a, b] = TILE_COLORS[tile.c];
    const p = Math.min(1, tile.t);
    // 成品：渐变底 + 几块柔和的形状
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.arc(x + w * (0.3 + rand(tile.seed) * 0.4), y + h * 0.42, h * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
    // 还没生成完的部分：从下往上盖着噪点
    if (p < 1) {
      const cut = y + h * p;
      const px = 8;
      for (let yy = cut - ((cut - y) % px); yy < y + h; yy += px) {
        for (let xx = x; xx < x + w; xx += px) {
          const n = rand(xx * 12.9898 + yy * 78.233 + Math.floor(tile.t * 30));
          ctx.fillStyle = `rgba(${n > 0.5 ? "230,232,240" : "40,44,56"},${0.55 + n * 0.45})`;
          ctx.fillRect(xx, Math.max(yy, cut), px, px);
        }
      }
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.fillRect(x, cut - 1, w, 2);
    }
    ctx.restore();
  }

  function draw(time: number, dt: number) {
    // 背景
    ctx.fillStyle = "#101318";
    ctx.fillRect(0, 0, W, H);

    // 顶栏
    ctx.fillStyle = "#1B2029";
    ctx.fillRect(0, 0, W, 34);
    ctx.font = "600 15px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#E9ECF2";
    ctx.textBaseline = "middle";
    ctx.fillText("oTATo / work", 14, 18);
    ctx.fillStyle = "#7CF2B0";
    const dot = Math.sin(time * 4) > 0 ? "●" : "○";
    ctx.textAlign = "right";
    ctx.fillText(`${dot} generating`, W - 14, 18);
    ctx.textAlign = "left";

    // 作品格
    const gx = 14,
      gy = 46,
      gap = 10;
    const tw = (W - gx * 2 - gap * 2) / 3;
    const th = 96;
    tiles.forEach((tile, i) => {
      tile.t += dt * tile.speed;
      if (tile.t > 1.9) {
        // 停留一会儿，换一张重新生成
        tile.t = 0;
        tile.c = (tile.c + 1 + Math.floor(Math.random() * 3)) % TILE_COLORS.length;
        tile.seed = Math.random() * 1000;
        count++;
      }
      drawTile(gx + (i % 3) * (tw + gap), gy + Math.floor(i / 3) * (th + gap), tw, th, tile);
    });

    // 底部：进度条 + 命令行
    const by = gy + th * 2 + gap + 14;
    const prog = (time * 0.18) % 1;
    ctx.fillStyle = "#232A35";
    ctx.beginPath();
    ctx.roundRect(14, by, W - 28, 8, 4);
    ctx.fill();
    ctx.fillStyle = "#2B5FFC";
    ctx.beginPath();
    ctx.roundRect(14, by, (W - 28) * prog, 8, 4);
    ctx.fill();

    cursor += dt;
    ctx.font = "500 14px ui-monospace, Menlo, monospace";
    ctx.fillStyle = "#AEB6C4";
    ctx.fillText(`work_ › ${count} pieces made`, 14, by + 26);
    if (cursor % 1 < 0.55) {
      const tx = 14 + ctx.measureText(`work_ › ${count} pieces made `).width;
      ctx.fillStyle = "#E9ECF2";
      ctx.fillRect(tx, by + 18, 8, 15);
    }

    // CRT 扫描线 + 暗角
    ctx.fillStyle = "rgba(0,0,0,.16)";
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  return { canvas, draw };
}
