"use client";

import { useMemo } from "react";
import { channels } from "@/channels";
import { t, ui, type Lang } from "@/lib/i18n";
import { Workbench } from "./Workbench";

const copy = {
  hint: { zh: "抓住挂件甩一甩 · 点一下换台", en: "Grab a charm and swing it · Click to tune in" },
  scroll: { zh: "往下滚", en: "Scroll" },
};

/** 一个字一个字往上冒出来 */
function Stagger({ text, active, delay = 0, step = 45 }: { text: string; active: boolean; delay?: number; step?: number }) {
  return (
    <span aria-label={text} className="inline-block">
      {Array.from(text).map((ch, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden align-bottom">
          <span
            className="inline-block"
            style={{
              transform: active ? "translateY(0)" : "translateY(105%)",
              transition: active ? `transform .9s cubic-bezier(.2,.8,.1,1) ${delay + i * step}ms` : "none",
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        </span>
      ))}
    </span>
  );
}

/** CH 00 开场：一串 3D 钥匙扣 */
export function OpenScreen({
  lang,
  active,
  visible,
  onJump,
}: {
  lang: Lang;
  active: boolean;
  visible: boolean;
  onJump: (id: string) => void;
}) {
  const labels = useMemo(() => Object.fromEntries(channels.map(({ meta }) => [meta.id, `CH ${meta.number} · ${meta.name}`])), []);

  const show = (d: number) => ({
    opacity: active ? 1 : 0,
    transform: active ? "none" : "translateY(14px)",
    transition: active ? `opacity .8s ease ${d}ms, transform .9s cubic-bezier(.2,.8,.1,1) ${d}ms` : "none",
  });

  return (
    <div className="relative h-full w-full overflow-hidden text-[#111]">
      <Workbench active={active} visible={visible} labels={labels} onPick={onJump} />
      {/* 左下压一层淡淡的白，让标题在桌面上也看得清 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(70% 55% at 0% 100%, rgba(244,241,236,.92) 0%, rgba(244,241,236,.55) 45%, rgba(244,241,236,0) 75%)" }}
      />



      {/* 左下：品牌 */}
      <div className="pointer-events-none absolute bottom-[var(--edge)] left-[var(--edge)] max-w-[min(620px,calc(100vw-2*var(--edge)))]">
        <p className="mono mb-4 text-[11px] uppercase text-black/55" style={show(900)}>
          {copy.hint[lang]}
        </p>
        <h1 className="cjk-heavy text-[clamp(44px,6.4vw,108px)] leading-[0.92] tracking-[-0.045em]">
          {lang === "zh" ? (
            <>
              <Stagger text="去皮土豆" active={active} delay={350} />
              <br />
              <Stagger text="oTATo" active={active} delay={560} />
            </>
          ) : (
            <Stagger text="oTATo" active={active} delay={350} step={60} />
          )}
        </h1>
        <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-black/65" style={show(850)}>
          {t(ui.brandStatement, lang)}
        </p>
      </div>


      <div className="mono pointer-events-none absolute bottom-[var(--edge)] left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase text-black/50 md:flex" style={show(1200)}>
        <span>{copy.scroll[lang]}</span>
        <span className="block h-8 w-px origin-top animate-[scrollcue_1.8s_ease-in-out_infinite] bg-black/40" />
      </div>
    </div>
  );
}
