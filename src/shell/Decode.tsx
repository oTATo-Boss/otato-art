"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "▚▞▘▝░▒▓█#%&@*+=/\\<>01";

/**
 * 换台时的文字解码：先是乱码，再从左到右锁定成正确文字。
 * text 变化就重播一次。
 */
export function Decode({ text, duration = 520, className }: { text: string; duration?: number; className?: string }) {
  const [shown, setShown] = useState(text);
  const raf = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf.current = requestAnimationFrame(() => setShown(text));
      return () => cancelAnimationFrame(raf.current);
    }
    const chars = Array.from(text);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const locked = Math.floor(p * chars.length);
      const out = chars
        .map((c, i) => {
          if (i < locked || c === " ") return c;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setShown(out);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [text, duration]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}
