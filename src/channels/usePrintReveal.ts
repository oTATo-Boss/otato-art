"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/** Keep the printed layout readable before hydration and when motion is reduced. */
export function usePrintReveal(active: boolean) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active || !root.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from("[data-print]", { y: 18, opacity: 0, duration: .55, stagger: .065, ease: "power3.out" });
    }, root);
    return () => media.revert();
  }, [active]);
  return root;
}
