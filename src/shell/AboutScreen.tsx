"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { channels, statusLabel } from "@/channels";
import { socials } from "@/content/site";
import { t, ui, updatesPath, type Lang } from "@/lib/i18n";

const BLUE = "#1747F5";
const LINE = "rgba(23,71,245,.22)";
const BG = "#F7F7F4";

/** 每个产品在关于页的色块 */
const blockStyle: Record<string, { bg: string; fg: string; area: string }> = {
  prompt: { bg: "#2B5FFC", fg: "#ffffff", area: "md:[grid-area:1/4/3/6]" },
  model: { bg: "#E11D48", fg: "#ffffff", area: "md:[grid-area:2/6/4/7]" },
  work: { bg: "#E8DCC3", fg: "#2747C9", area: "md:[grid-area:3/3/4/6]" },
};

const copy = {
  title: { zh: "去皮土豆 oTATo", en: "oTATo" },
  updates: { zh: "节目预告 · 更新记录", en: "Coming up · Updates" },
};

type Phase = "done" | "idle" | "rise" | "show";

/** 色块跟着鼠标轻轻被吸过去 */
function magnet(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const dx = (e.clientX - r.left - r.width / 2) / r.width;
  const dy = (e.clientY - r.top - r.height / 2) / r.height;
  const inner = el.firstElementChild as HTMLElement | null;
  if (inner) inner.style.transform = `translate3d(${dx * 14}px, ${dy * 14}px, 0)`;
}
function unmagnet(e: React.PointerEvent<HTMLElement>) {
  const inner = e.currentTarget.firstElementChild as HTMLElement | null;
  if (inner) inner.style.transform = "";
}

/** CH 99 关于：网格的竖列先升起来，再滑进各个色块（参考 Dropbox 品牌站、Units） */
export function AboutScreen({ lang, active }: { lang: Lang; active: boolean }) {
  const links = socials.filter((s) => s.href);
  const [phase, setPhase] = useState<Phase>("done");
  const grid = useRef<HTMLDivElement>(null);
  const cell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const r = requestAnimationFrame(() => setPhase("idle"));
    const a = window.setTimeout(() => setPhase("rise"), 40);
    const b = window.setTimeout(() => setPhase("show"), 760);
    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [active]);

  // 鼠标所在的格子轻轻亮一下
  const onGridMove = (e: React.PointerEvent) => {
    const g = grid.current;
    const c = cell.current;
    if (!g || !c || window.innerWidth < 768) return;
    const r = g.getBoundingClientRect();
    const cw = r.width / 6;
    const ch = r.height / 4;
    const col = Math.floor((e.clientX - r.left) / cw);
    const row = Math.floor((e.clientY - r.top) / ch);
    c.style.opacity = "1";
    c.style.transform = `translate3d(${col * cw}px, ${row * ch}px, 0)`;
    c.style.width = `${cw}px`;
    c.style.height = `${ch}px`;
  };

  const shown = phase === "show" || phase === "done";
  const hidden = phase === "idle" || phase === "rise";
  let k = 0;
  const slide = () => {
    const i = k++;
    return {
      transform: shown ? "translateY(0)" : "translateY(101%)",
      transition: shown && phase === "show" ? `transform .9s cubic-bezier(.2,.75,.1,1) ${i * 90}ms` : "none",
    };
  };
  const line = (d: number) => ({
    transform: shown ? "none" : "translateY(110%)",
    transition: shown && phase === "show" ? `transform 1s cubic-bezier(.2,.8,.1,1) ${d}ms` : "none",
  });

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ color: BLUE, background: hidden ? "transparent" : BG }}>
      {/* 出场：六根竖列依次升起，就是网格的底 */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-2 md:grid-cols-6" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={i >= 2 ? "hidden md:block" : ""}
            style={{
              background: BG,
              borderRight: `1px solid ${LINE}`,
              transform: phase === "idle" ? "translateY(101%)" : "none",
              transition: phase === "rise" ? `transform .7s cubic-bezier(.75,0,.2,1) ${i * 70}ms` : "none",
            }}
          />
        ))}
      </div>

      <div
        ref={grid}
        onPointerMove={onGridMove}
        onPointerLeave={() => cell.current && (cell.current.style.opacity = "0")}
        className="absolute inset-x-0 bottom-0 top-[88px] grid grid-cols-2 grid-rows-[repeat(5,1fr)] md:grid-cols-6 md:grid-rows-4"
        style={{ borderTop: `1px solid ${LINE}`, opacity: hidden ? 0 : 1 }}
      >
        {/* 横线 */}
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className={i >= 10 ? "hidden md:block" : ""} style={{ borderBottom: `1px solid ${LINE}` }} />
        ))}
        {/* 鼠标所在格 */}
        <div
          ref={cell}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 opacity-0"
          style={{ background: "rgba(23,71,245,.06)", transition: "transform .35s cubic-bezier(.2,.8,.2,1), opacity .3s" }}
        />

        <div className="absolute inset-0 grid grid-cols-2 grid-rows-[repeat(5,1fr)] md:grid-cols-6 md:grid-rows-4">
          {/* 宣言 */}
          <div className="col-span-2 row-span-1 flex flex-col justify-between p-5 md:[grid-area:1/1/3/4] md:p-7">
            <p className="pixel overflow-hidden text-[13px]">
              <span className="block" style={line(0)}>
                CH 99 · {t(ui.aboutTitle, lang)}
              </span>
            </p>
            <div>
              <h2 className="overflow-hidden text-[clamp(30px,4.4vw,76px)] font-bold leading-[1.02] tracking-[-0.04em]">
                <span className="block" style={line(80)}>
                  {copy.title[lang]}
                </span>
              </h2>
              <p className="mt-3 max-w-[560px] overflow-hidden text-[clamp(16px,1.7vw,26px)] font-semibold leading-[1.2] tracking-[-0.015em]">
                <span className="block" style={line(200)}>
                  {t(ui.brandStatement, lang)}
                </span>
              </p>
            </div>
          </div>

          {/* 形状变换（Units 那种） */}
          <div className="hidden items-center justify-center md:flex md:[grid-area:1/6/2/7]">
            <span className="about-morph block h-[42%] w-[42%]" style={{ opacity: shown ? 1 : 0, transition: "opacity .6s" }} />
          </div>

          {/* 产品色块 */}
          {channels.map(({ meta }) => {
            const st = blockStyle[meta.id] ?? { bg: BLUE, fg: "#fff", area: "" };
            return (
              <div key={meta.id} className={`relative overflow-hidden ${st.area}`}>
                <a
                  href={meta.href[lang]}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerMove={magnet}
                  onPointerLeave={unmagnet}
                  className="group absolute inset-0 block"
                  style={{ background: st.bg, color: st.fg, ...slide() }}
                >
                  <span className="flex h-full flex-col justify-between p-4 transition-transform duration-300 ease-out md:p-6">
                    <span className="mono flex items-center justify-between text-[11px] uppercase">
                      <span>CH {meta.number}</span>
                      <span className="flex items-center gap-2">
                        <span className={`status-dot ${meta.status}`} />
                        {t(statusLabel[meta.status], lang)}
                      </span>
                    </span>
                    <span>
                      <span className="block text-[clamp(22px,2.6vw,44px)] font-bold leading-none tracking-[-0.03em]">
                        {meta.name}{" "}
                        <span className="inline-block transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">↗</span>
                      </span>
                      <span className="mt-2 hidden text-[13px] opacity-80 md:block">{t(meta.tagline, lang)}</span>
                    </span>
                  </span>
                </a>
              </div>
            );
          })}

          {/* 更新记录 */}
          <div className="relative overflow-hidden md:[grid-area:3/1/4/3]">
            <Link
              href={updatesPath[lang]}
              onPointerMove={magnet}
              onPointerLeave={unmagnet}
              className="group absolute inset-0 block bg-[#FF7A1A] text-[#1a0d00]"
              style={slide()}
            >
              <span className="flex h-full flex-col justify-between p-4 transition-transform duration-300 ease-out md:p-6">
                <span className="mono text-[11px] uppercase">/updates</span>
                <span className="text-[clamp(20px,2vw,32px)] font-bold leading-tight tracking-[-0.02em]">
                  {copy.updates[lang]} <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </span>
            </Link>
          </div>

          {/* 社媒 */}
          {links.map((s) => (
            <div key={s.href} className="relative overflow-hidden md:[grid-area:4/1/5/2]">
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                onPointerMove={magnet}
                onPointerLeave={unmagnet}
                className="group absolute inset-0 block bg-[#111] text-white"
                style={slide()}
              >
                <span className="flex h-full flex-col justify-between p-4 transition-transform duration-300 ease-out md:p-6">
                  <span className="mono text-[11px] uppercase">{t(ui.follow, lang)}</span>
                  <span className="text-[clamp(18px,1.6vw,26px)] font-bold">
                    {t(s.name, lang)} <span className="inline-block transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">↗</span>
                  </span>
                </span>
              </a>
            </div>
          ))}

          {/* 页脚 */}
          <div className="mono col-span-2 flex items-end justify-between p-4 text-[11px] md:[grid-area:4/3/5/7] md:p-6">
            <span>© 2026 oTATo</span>
            <span>otato.art</span>
          </div>
        </div>
      </div>
    </div>
  );
}
