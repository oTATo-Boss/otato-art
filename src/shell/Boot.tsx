"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { Logo } from "./Logo";

const KEY = "otato-booted";

/** 先等首屏预热，再播放开机。再次访问仍等预热，但跳过开机动画。 */
export function Boot({ prepared, lang, onComplete }: { prepared: boolean; lang: Lang; onComplete: () => void }) {
  const [phase, setPhase] = useState<"loading" | "playing" | "done">("loading");
  const started = useRef<number | null>(null);

  useEffect(() => {
    started.current = performance.now();
    document.documentElement.classList.remove("booted");
  }, []);

  useEffect(() => {
    if (!prepared) return;
    let seen = false;
    try {
      seen = !!localStorage.getItem(KEY);
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      setPhase("done");
      document.documentElement.classList.add("booted");
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
      onComplete();
    };
    const delay = seen || reduced ? 0 : Math.max(0, 500 - (performance.now() - (started.current ?? 0)));
    const id = window.setTimeout(() => {
      if (seen || reduced) finish();
      else setPhase("playing");
    }, delay);
    return () => window.clearTimeout(id);
  }, [prepared, onComplete]);

  useEffect(() => {
    if (phase !== "playing") return;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setPhase("done");
      document.documentElement.classList.add("booted");
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
      onComplete();
    };
    const end = window.setTimeout(finish, 1950);
    const onPointer = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest(".boot")) finish();
    };
    window.addEventListener("keydown", finish, { once: true });
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.clearTimeout(end);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [phase, onComplete]);

  if (phase === "done") return null;

  return (
    <div className={`boot ${phase}`} data-phase={phase}>
      {phase === "loading" ? (
        <div className="boot-loader" role="status" aria-live="polite">
          <div className="boot-loader-header" aria-hidden>
            <span className="boot-wordmark">oTATo</span>
            <span className="mono">CH 00</span>
          </div>
          <div className="boot-loader-center">
            <div className="boot-loader-hero">
              <div className="boot-mascot" aria-hidden>
                <svg className="boot-spark" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4C27 17 31 21 44 24C31 27 27 31 24 44C21 31 17 27 4 24C17 21 21 17 24 4Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
                </svg>
                <div className="boot-potato"><Logo size={240} crying /></div>
              </div>
              <div className="boot-loading-copy" data-lang={lang}>
                <p className="boot-loading-title">
                  <span>{lang === "zh" ? "小土豆" : "Little potato"}</span>
                  <span>{lang === "zh" ? "热身中" : "warming up"}</span>
                </p>
                <p className="boot-loading-note">{lang === "zh" ? "正在把工作台准备好" : "Getting the workbench ready"}</p>
              </div>
            </div>
            <div className="boot-progress" role="progressbar" aria-label={lang === "zh" ? "正在准备工作台" : "Preparing the workbench"}>
              {Array.from({ length: 8 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 0.13}s` }} />)}
            </div>
            <p className="mono boot-loading-label" aria-hidden>LOADING<span className="boot-loading-dots">...</span></p>
          </div>
          <div className="boot-loader-footer" aria-hidden>
            <span className="boot-footer-wordmark">oTATo</span>
            <span className="mono boot-signature">TOOLS FOR BRIGHTER CREATORS.</span>
          </div>
        </div>
      ) : <div className="boot-line" aria-hidden />}
    </div>
  );
}
