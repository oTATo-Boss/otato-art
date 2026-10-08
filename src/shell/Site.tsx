"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { channels } from "@/channels";
import type { Reveal } from "@/channels/types";
import { homePath, LANG_KEY, t, ui, type Lang } from "@/lib/i18n";
import { Boot } from "./Boot";
import { createWheelGate, grab } from "./gesture";
import { Guide } from "./Guide";
import { Logo } from "./Logo";
import { OpenScreen } from "./OpenScreen";
import { AboutScreen } from "./AboutScreen";

/**
 * 全站的屏：00 开场 + 各产品频道 + 99 关于。
 * 不用浏览器滚动：滚轮、触摸、键盘只负责「换到下一屏」，
 * 新的一屏盖在旧的一屏上面，用它自己的方式出现（reveal）。
 */
type Slot = {
  kind: "open" | "channel" | "about";
  id: string;
  number: string;
  tone: "dark" | "light";
  reveal: Reveal;
  index?: number;
};

const slots: Slot[] = [
  { kind: "open", id: "on", number: "00", tone: "light", reveal: "curtain" },
  ...channels.map((c, index) => ({
    kind: "channel" as const,
    id: c.meta.id,
    number: c.meta.number,
    tone: c.meta.theme.tone,
    reveal: c.meta.reveal ?? "fade",
    index,
  })),
  { kind: "about", id: "about", number: "99", tone: "light", reveal: "self" },
];

/** 每种出场方式持续多久（毫秒），之后旧的一屏才被隐藏 */
const REVEAL_MS: Record<Reveal, number> = { curtain: 1000, monitor: 1150, stripes: 1100, self: 1250, fade: 700 };

export function Site({ lang }: { lang: Lang }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [guide, setGuide] = useState(false);
  // 开机动画播完之前，所有出场动画先不开始
  const [ready, setReady] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const onPrepared = useCallback(() => setPrepared(true), []);
  const onBootComplete = useCallback(() => setReady(true), []);
  const wraps = useRef<(HTMLElement | null)[]>([]);
  const nav = useRef({ cur: 0, lockUntil: 0, prevTimer: 0, reduced: false, enabled: false });

  const goTo = useCallback((target: number) => {
    const n = nav.current;
    if (!n.enabled) return;
    const i = Math.max(0, Math.min(slots.length - 1, target));
    if (i === n.cur) return;
    const from = n.cur;
    n.cur = i;
    n.lockUntil = performance.now() + REVEAL_MS[slots[i].reveal] * 0.85;
    setPrev(from);
    setCurrent(i);
    setVisited((seen) => new Set(seen).add(i));
    // 重新触发新一屏的出场动画
    const el = wraps.current[i];
    if (el && !n.reduced) {
      el.classList.remove("entering");
      void el.offsetWidth;
      el.classList.add("entering");
    }
    window.clearTimeout(n.prevTimer);
    n.prevTimer = window.setTimeout(() => setPrev(null), n.reduced ? 0 : REVEAL_MS[slots[i].reveal] + 80);
  }, []);
  const goToId = useCallback((id: string) => goTo(slots.findIndex((x) => x.id === id)), [goTo]);

  /* ───── 初始化：地址里的 #频道、减弱动态效果、语言自动判断 ───── */
  useEffect(() => {
    nav.current.enabled = ready;
  }, [ready]);

  useEffect(() => {
    const n = nav.current;
    n.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hash = decodeURIComponent(location.hash.replace("#", ""));
    const i = slots.findIndex((x) => x.id === hash);
    if (i > 0) {
      n.cur = i;
      requestAnimationFrame(() => {
        setCurrent(i);
        setVisited((seen) => new Set(seen).add(i));
      });
    }
    if (lang === "zh") {
      let chosen: string | null = null;
      try {
        chosen = localStorage.getItem(LANG_KEY);
      } catch {}
      const prefersZh = (navigator.languages || [navigator.language]).some((l) => l.toLowerCase().startsWith("zh"));
      if (!chosen && !prefersZh) location.replace(homePath.en + location.hash);
    }
  }, [lang]);

  /* ───── 当前一屏变化：地址栏同步、品牌壳换色 ───── */
  useEffect(() => {
    const slot = slots[current];
    const root = document.documentElement;
    const dark = slot.tone === "dark";
    root.style.setProperty("--shell-fg", dark ? "#F2EEE6" : "#111111");
    root.style.setProperty("--shell-bg", dark ? "#111111" : "#F2EEE6");
    history.replaceState(null, "", current === 0 ? location.pathname : `${location.pathname}#${slot.id}`);
  }, [current]);

  /* ───── 滚轮 / 触摸 / 键盘 ───── */
  useEffect(() => {
    const n = nav.current;
    const gate = createWheelGate();
    const onWheel = (e: WheelEvent) => {
      if (guide) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-scrollable]")) return;
      e.preventDefault();
      // 以「行」为单位的滚轮（Firefox）换算成像素
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      const dir = gate(dy, performance.now(), n.lockUntil);
      if (dir) goTo(n.cur + dir);
    };
    // 触摸：上下滑一段距离就换屏；拖钥匙扣、拖节点时不算
    let touchY = 0;
    let touchX = 0;
    let touchT = 0;
    let ignore = false;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
      touchX = e.touches[0].clientX;
      touchT = performance.now();
      ignore = grab.active || e.touches.length > 1 || !!(e.target as HTMLElement | null)?.closest("[data-scrollable]");
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (guide || ignore || grab.active) return;
      const dy = touchY - e.changedTouches[0].clientY;
      const dx = touchX - e.changedTouches[0].clientX;
      const fast = performance.now() - touchT < 300;
      if (Math.abs(dy) < Math.abs(dx) * 1.2) return;
      if ((Math.abs(dy) > 60 || (fast && Math.abs(dy) > 30)) && performance.now() > n.lockUntil) goTo(n.cur + Math.sign(dy));
    };
    const onKey = (e: KeyboardEvent) => {
      if (!n.enabled) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (guide) {
        if (e.key === "Escape") setGuide(false);
        return;
      }
      if (e.key === "m" || e.key === "M") setGuide(true);
      else if (/^[0-9]$/.test(e.key)) {
        const num = e.key === "0" ? "00" : e.key === "9" ? "99" : e.key.padStart(2, "0");
        const i = slots.findIndex((x) => x.number === num);
        if (i >= 0) goTo(i);
      } else if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        if (performance.now() > n.lockUntil) goTo(n.cur + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        if (performance.now() > n.lockUntil) goTo(n.cur - 1);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [goTo, guide]);

  const slot = slots[current];
  const other: Lang = lang === "zh" ? "en" : "zh";
  const hash = current === 0 ? "" : `#${slot.id}`;

  return (
    <>
      <main className="stage" aria-live="polite" inert={!ready}>
        {slots.map((s, i) => {
          const isCur = i === current && ready;
          const isPrev = i === prev;
          const visible = i === current || isPrev;
          return (
            <section
              key={s.id}
              id={s.id}
              ref={(el) => {
                wraps.current[i] = el;
              }}
              className={`screen reveal-${s.reveal}`}
              data-state={i === current ? "current" : isPrev ? "prev" : "hidden"}
              aria-hidden={i !== current}
              aria-label={
                s.kind === "channel" ? `CH ${s.number} ${channels[s.index!].meta.name}` : s.kind === "open" ? t(ui.brand, lang) : t(ui.about, lang)
              }
            >
              {s.kind === "open" && <OpenScreen lang={lang} active={isCur} visible={visible} onJump={goToId} onReady={onPrepared} />}
              {ready && s.kind === "about" && (visited.has(i) || i === current) && <AboutScreen lang={lang} active={isCur} />}
              {ready && s.kind === "channel" && (visited.has(i) || i === current) &&
                (() => {
                  const C = channels[s.index!].Screen;
                  return <C lang={lang} active={isCur} visible={visible} />;
                })()}
            </section>
          );
        })}
      </main>

      {/* ───── 品牌壳：只留台标、频道号、语言、频道列表 ───── */}
      <div className="shell" inert={!ready}>
        <a
          href={homePath[lang]}
          onClick={(e) => {
            e.preventDefault();
            goTo(0);
          }}
          className="reveal absolute flex items-center gap-3"
          style={{ left: "var(--edge)", top: "var(--edge)", ["--d" as string]: "1.6s" }}
          aria-label={t(ui.brand, lang)}
        >
          <Logo size={34} />
          <span className="pixel text-[13px] leading-none tracking-wider">CH {slot.number}</span>
        </a>

        <div className="reveal absolute flex items-center gap-2" style={{ right: "var(--edge)", top: "var(--edge)", ["--d" as string]: "1.7s" }}>
          <a
            href={homePath[other] + hash}
            className="shell-btn mono"
            aria-label={t(ui.langSwitchLabel, lang)}
            onClick={() => {
              try {
                localStorage.setItem(LANG_KEY, other);
              } catch {}
            }}
          >
            {t(ui.langSwitch, lang)}
          </a>
          <button type="button" className="shell-btn mono" onClick={() => setGuide(true)}>
            <span aria-hidden className="grid grid-cols-2 gap-[2px]">
              <i className="block h-[4px] w-[4px] bg-current" />
              <i className="block h-[4px] w-[4px] bg-current" />
              <i className="block h-[4px] w-[4px] bg-current" />
              <i className="block h-[4px] w-[4px] bg-current" />
            </span>
            {t(ui.guide, lang)}
          </button>
        </div>

        <nav
          className="reveal absolute top-1/2 hidden -translate-y-1/2 flex-col items-end gap-1 md:flex"
          style={{ right: "var(--edge)", ["--d" as string]: "1.8s", visibility: slot.kind === "about" ? "hidden" : undefined }}
          aria-label={t(ui.allChannels, lang)}
        >
          {slots.map((s, i) => {
            const name = s.kind === "channel" ? channels[s.index!].meta.name : s.kind === "open" ? t(ui.boot, lang) : t(ui.about, lang);
            const on = i === current;
            return (
              <button key={s.id} type="button" onClick={() => goTo(i)} className="group mono flex h-6 items-center gap-2 text-[11px]" aria-current={on ? "true" : undefined}>
                <span className="pointer-events-none whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-70">{name}</span>
                <span className={on ? "opacity-100" : "opacity-45 group-hover:opacity-100"}>{s.number}</span>
                <span className="block h-px bg-current transition-all duration-500" style={{ width: on ? 28 : 10, opacity: on ? 1 : 0.45 }} />
              </button>
            );
          })}
        </nav>
      </div>

      {guide && (
        <Guide
          lang={lang}
          onClose={() => setGuide(false)}
          onPick={(id) => {
            setGuide(false);
            requestAnimationFrame(() => goToId(id));
          }}
        />
      )}

      <Boot prepared={prepared} lang={lang} onComplete={onBootComplete} />
    </>
  );
}
