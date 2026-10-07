"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ScreenProps } from "../types";
import { statusLabel } from "../types";
import { t, type Text } from "@/lib/i18n";
import { meta } from "./meta";
import { Engraving } from "./Engraving";

const TAN = "#D9B798";
const BG = "#17110F";
const photos = [1, 3, 7, 11, 14].map((i) => `/channels/model/${i}.webp`);

const copy = {
  kicker: { zh: "这里是一间暗房", en: "This is a darkroom" },
  kicker2: { zh: "移动红灯显影 · 点一下按快门", en: "Move the light to develop · Click to shoot" },
  lead: {
    zh: "上传人物、服装和动作参考，选一种拍摄模式，几十秒拿到可以直接用的成片。",
    en: "Upload a face, an outfit and a pose. Pick a shooting mode. Get shots you can use in seconds.",
  },
  modes: { zh: "写真 · 商拍 · 换装 · 动作", en: "Portrait · Commerce · Try-on · Pose" },
  develop: { zh: "显影", en: "Develop" },
  roll: { zh: "胶卷", en: "Roll" },
} satisfies Record<string, Text>;

/** 刻线大字：横向条纹透出底色 */
const striped: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(to bottom, ${TAN} 0 3px, transparent 3px 5px)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

export default function ModelScreen({ lang, active, visible }: ScreenProps) {
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState(0);
  const [hover, setHover] = useState(false);
  const cursor = useRef<HTMLDivElement>(null);
  const print = useRef<HTMLDivElement>(null);

  // 自动换片
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % photos.length), 5600);
    return () => window.clearInterval(id);
  }, [active, idx]);

  // 红圈光标跟着鼠标
  useEffect(() => {
    if (!visible) return;
    const onMove = (e: PointerEvent) => {
      const c = cursor.current;
      if (c) c.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [visible]);

  const shoot = () => {
    setFlash((f) => f + 1);
    setIdx((i) => (i + 1) % photos.length);
  };

  const enter = (d: number, from = "translateY(16px)") => ({
    opacity: active ? 1 : 0,
    transform: active ? "none" : from,
    transition: active ? `opacity .8s ease ${d}ms, transform 1s cubic-bezier(.2,.8,.1,1) ${d}ms` : "none",
  });

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: BG, color: TAN }}>
      {/* 胶片颗粒 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-10%] opacity-[0.07] mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          animation: "grain 0.6s steps(3) infinite",
        }}
      />

      {/* 中间：雕版照片 */}
      <div
        ref={print}
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={() => setHover(false)}
        onClick={shoot}
        className="absolute left-1/2 top-[calc(var(--edge)+64px)] h-[min(58vh,620px)] w-[min(calc(58vh*0.62),384px)] -translate-x-1/2 md:top-1/2 md:h-[min(66vh,660px)] md:w-[min(calc(66vh*0.62),410px)] md:-translate-y-[56%] md:cursor-none"
      >
        <Engraving photos={photos} index={idx} flash={flash} active={active} visible={visible} />
        {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c, k) => (
          <span
            key={c}
            className={`pointer-events-none absolute h-3 w-3 ${c}`}
            style={{ borderColor: TAN, margin: active ? -10 : -40, opacity: active ? 1 : 0, transition: active ? `all .9s cubic-bezier(.2,.8,.1,1) ${200 + k * 60}ms` : "none" }}
          />
        ))}
        <span className="mono pointer-events-none absolute -bottom-7 left-0 text-[10.5px] uppercase opacity-70" style={enter(1200)}>
          {copy.roll[lang]} · 0{idx + 1} / 0{photos.length}
        </span>
      </div>

      {/* 红圈光标 */}
      <div
        ref={cursor}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 hidden md:block"
        style={{ opacity: hover && active ? 1 : 0, transition: "opacity .25s" }}
      >
        <div className="-translate-x-1/2 -translate-y-1/2">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-[#E11D48]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48]" />
          </div>
          <span className="mono absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase text-[#E11D48]">
            {copy.develop[lang]}
          </span>
        </div>
      </div>

      {/* 左上：小字 */}
      <div className="mono absolute left-[var(--edge)] top-[calc(var(--edge)+64px)] hidden max-w-[260px] text-[10.5px] uppercase leading-[1.8] md:block">
        <div className="mb-4 grid w-9 grid-cols-3 gap-[3px]" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="block h-[7px]"
              style={{
                background: TAN,
                opacity: active ? [1, 0.4, 1, 0.4, 1, 0.4, 1, 1, 0.4][i] : 0,
                transition: active ? `opacity .2s steps(1) ${500 + i * 70}ms` : "none",
              }}
            />
          ))}
        </div>
        <p style={enter(800)}>{copy.kicker[lang]}</p>
        <p className="opacity-55" style={enter(900)}>
          {copy.kicker2[lang]}
        </p>
      </div>

      {/* 左侧：胶卷条，点哪张换哪张 */}
      <div className="absolute left-[var(--edge)] top-1/2 hidden -translate-y-[40%] flex-col gap-2 md:flex">
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => {
              setFlash((f) => f + 1);
              setIdx(i);
            }}
            className="relative h-[64px] w-[40px] overflow-hidden border transition-all duration-300"
            style={{
              borderColor: i === idx ? "#E11D48" : "rgba(217,183,152,.35)",
              ...enter(1000 + i * 80, "translateX(-12px)"),
            }}
            aria-label={`0${i + 1}`}
          >
            <Image src={src} alt="" fill sizes="40px" className="object-cover" style={{ filter: "grayscale(1) sepia(.6) contrast(1.3) brightness(.7)" }} />
            <span className="absolute inset-0" style={{ background: `repeating-linear-gradient(to bottom, rgba(23,17,15,.65) 0 1px, transparent 1px 3px)` }} />
          </button>
        ))}
      </div>

      {/* 右上：说明 + 入口 */}
      <div className="absolute right-[calc(var(--edge)+64px)] top-[calc(var(--edge)+64px)] hidden w-[260px] flex-col items-end gap-5 text-right md:flex">
        <p className="text-[13px] leading-relaxed opacity-80" style={enter(900)}>
          {copy.lead[lang]}
        </p>
        <p className="mono text-[10.5px] uppercase opacity-55" style={enter(1000)}>
          {copy.modes[lang]}
        </p>
        <a
          href={meta.href[lang]}
          target="_blank"
          rel="noopener noreferrer"
          className="mono group flex items-center gap-3 border px-4 py-2.5 text-[12px] uppercase transition-colors hover:bg-[#D9B798] hover:text-[#17110F]"
          style={{ borderColor: TAN, ...enter(1100) }}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E11D48]" />
          {t(meta.cta, lang)} <span className="inline-block transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
        </a>
      </div>

      {/* 底部：刻线大字，一行行升上来 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-[var(--edge)]">
        <div className="mono mb-2 flex justify-between text-[10.5px] uppercase opacity-70" style={enter(1200)}>
          <span>
            CH {meta.number} — {t(statusLabel[meta.status], lang)}
          </span>
          <span className="hidden md:inline">model.otato.art</span>
        </div>
        <div
          className="pixel whitespace-nowrap text-center leading-[0.78] tracking-[-0.02em]"
          style={{
            ...striped,
            fontSize: "clamp(32px, 14.4vw, 300px)",
            clipPath: active ? "inset(0 0 0 0)" : "inset(100% 0 0 0)",
            transition: active ? "clip-path 1.2s steps(14) 700ms" : "none",
          }}
        >
          oTATo MODEL
        </div>
      </div>

      {/* 手机：入口放在照片下面 */}
      <div className="absolute inset-x-[var(--edge)] top-[calc(var(--edge)+64px+min(58vh,620px)+36px)] flex flex-col items-center gap-3 text-center md:hidden">
        <p className="text-[13px] leading-relaxed opacity-80">{copy.lead[lang]}</p>
        <a
          href={meta.href[lang]}
          target="_blank"
          rel="noopener noreferrer"
          className="mono flex items-center gap-3 border px-4 py-2.5 text-[12px] uppercase"
          style={{ borderColor: TAN }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#E11D48]" />
          {t(meta.cta, lang)} ↗
        </a>
      </div>
    </div>
  );
}
