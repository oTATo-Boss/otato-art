"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface SignalHandle {
  /** 设置当前失真强度 0–1 */
  set: (v: number) => void;
}

/**
 * 换台时的信号噪点：一张低分辨率的雪花图，加几条横向撕裂的亮带。
 * 强度为 0 时不画，不占性能。
 */
export const Signal = forwardRef<SignalHandle>(function Signal(_, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const level = useRef(0);
  const running = useRef(false);

  useImperativeHandle(ref, () => ({
    set(v: number) {
      level.current = v;
      if (v > 0.01 && !running.current) {
        running.current = true;
        requestAnimationFrame(draw);
      }
    },
  }));

  function draw() {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) {
      running.current = false;
      return;
    }
    const v = level.current;
    if (v <= 0.01) {
      ctx.clearRect(0, 0, c.width, c.height);
      c.style.opacity = "0";
      running.current = false;
      return;
    }
    const { width: w, height: h } = c;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = n;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // 横向撕裂的亮带
    const bands = 2 + Math.floor(v * 4);
    for (let b = 0; b < bands; b++) {
      const y = Math.random() * h;
      const bh = 1 + Math.random() * (h * 0.05);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.4})`;
      ctx.fillRect(0, y, w, bh);
    }
    c.style.opacity = String(Math.min(0.5, v * 0.55));
    requestAnimationFrame(draw);
  }

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const resize = () => {
      c.width = 240;
      c.height = Math.round((240 * window.innerHeight) / window.innerWidth);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return <canvas ref={canvas} className="signal" style={{ opacity: 0 }} aria-hidden />;
});
