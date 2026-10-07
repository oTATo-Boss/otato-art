"use client";

import { useEffect, useState } from "react";

/** 打字机：active 变 true 后，从头一个字一个字打出来。 */
export function Typewriter({ text, active, delay = 0, speed = 18 }: { text: string; active: boolean; delay?: number; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const chars = Array.from(text).length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => setN(chars));
      return () => cancelAnimationFrame(id);
    }
    let i = 0;
    let iv = 0;
    const start = window.setTimeout(() => {
      iv = window.setInterval(() => {
        i += 1;
        setN(i);
        if (i >= chars) window.clearInterval(iv);
      }, speed);
    }, delay);
    const reset = requestAnimationFrame(() => setN(0));
    return () => {
      cancelAnimationFrame(reset);
      window.clearTimeout(start);
      window.clearInterval(iv);
    };
  }, [active, text, delay, speed]);

  const shown = Array.from(text).slice(0, n).join("");
  const typing = active && n < Array.from(text).length;
  return (
    <span aria-label={text}>
      <span aria-hidden>{shown}</span>
      {typing && <span aria-hidden className="ml-px inline-block w-[0.6em] animate-pulse bg-current">&nbsp;</span>}
    </span>
  );
}
