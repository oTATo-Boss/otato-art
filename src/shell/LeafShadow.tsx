"use client";

import { useEffect, useState } from "react";

/** 窗外树叶的影子：随机画一簇叶子，模糊后叠在墙上，慢慢摇 */
function paintLeaves() {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 640;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#5a3a1c";
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // 几根枝条，每根上长一串叶子
  for (let b = 0; b < 6; b++) {
    let x = rnd() * 260 - 60;
    let y = 80 + rnd() * 480;
    let ang = -0.4 + rnd() * 0.8;
    ctx.strokeStyle = "#5a3a1c";
    ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      const nx = x + Math.cos(ang) * 46;
      const ny = y + Math.sin(ang) * 46;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      x = nx;
      y = ny;
      ang += (rnd() - 0.5) * 0.5;
      for (const side of [-1, 1]) {
        if (rnd() < 0.25) continue;
        const la = ang + side * (0.7 + rnd() * 0.6);
        const len = 34 + rnd() * 30;
        ctx.save();
        ctx.translate(x + Math.cos(la) * len * 0.5, y + Math.sin(la) * len * 0.5);
        ctx.rotate(la);
        ctx.beginPath();
        ctx.ellipse(0, 0, len * 0.55, len * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  return c.toDataURL("image/png");
}

export function LeafShadow() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    // 只在浏览器里画一次
    const id = requestAnimationFrame(() => setSrc(paintLeaves()));
    return () => cancelAnimationFrame(id);
  }, []);
  if (!src) return null;
  return (
    <div aria-hidden className="leaf-shadow pointer-events-none absolute" style={{ left: "-4%", top: "-6%", width: "52%", height: "70%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="leaf-a absolute inset-0 h-full w-full" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="leaf-b absolute inset-0 h-full w-full" draggable={false} />
    </div>
  );
}
