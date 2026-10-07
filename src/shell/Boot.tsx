"use client";

import { useEffect, useRef } from "react";

const KEY = "otato-booted";

/**
 * 开机：一条白线展开成画面。第一次访问播放，之后直接显示终态。
 * 点击或按任意键可以跳过。
 */
export function Boot() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const root = document.documentElement;
    const skip = () => {
      node.classList.add("skip");
      root.classList.add("booted");
    };
    let seen = false;
    try {
      seen = !!localStorage.getItem(KEY);
      localStorage.setItem(KEY, "1");
    } catch {}
    if (seen) {
      skip();
      return;
    }
    const end = window.setTimeout(skip, 2000);
    window.addEventListener("keydown", skip, { once: true });
    node.addEventListener("pointerdown", skip, { once: true });
    return () => {
      window.clearTimeout(end);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  return (
    <div ref={el} className="boot" aria-hidden>
      <div className="boot-line" />
    </div>
  );
}
