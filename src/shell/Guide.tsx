"use client";

import { useEffect, useRef } from "react";
import { channels, statusLabel } from "@/channels";
import { t, ui, type Lang } from "@/lib/i18n";
import { Logo } from "./Logo";

/** 频道列表：每个产品一块自己的主色，点哪块换到哪个频道。 */
export function Guide({ lang, onClose, onPick }: { lang: Lang; onClose: () => void; onPick: (id: string) => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => closeBtn.current?.focus(), []);

  return (
    <div className="guide" role="dialog" aria-modal="true" aria-label={t(ui.guide, lang)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={34} />
          <span className="pixel text-[13px] tracking-wider">{t(ui.guide, lang)}</span>
        </div>
        <button ref={closeBtn} type="button" onClick={onClose} className="shell-btn mono" style={{ pointerEvents: "auto" }}>
          {t(ui.guideClose, lang)} ✕
        </button>
      </div>

      <h2 className="cjk-heavy mt-auto pt-10 text-[clamp(56px,10vw,168px)] leading-[0.85] tracking-[-0.04em]">
        {t(ui.guide, lang)}
      </h2>
      <div className="grid grid-cols-1 gap-3 pt-8 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {channels.map(({ meta }, i) => (
          <button
            key={meta.id}
            type="button"
            onClick={() => onPick(meta.id)}
            className="guide-tile text-left"
            style={{ background: meta.theme.bg, color: meta.theme.fg, ["--i" as string]: i, boxShadow: `inset 0 0 0 1px ${meta.theme.tone === "dark" ? "rgba(255,255,255,.12)" : "transparent"}` }}
          >
            <span className="flex items-center justify-between">
              <span className="pixel text-[13px]">CH {meta.number}</span>
              <span className="mono flex items-center gap-2 text-[11px] uppercase">
                <span className={`status-dot ${meta.status}`} />
                {t(statusLabel[meta.status], lang)}
              </span>
            </span>
            <span>
              <span className="block h-1.5 w-12" style={{ background: meta.theme.accent }} />
              <span className="cjk-heavy mt-4 block text-[clamp(26px,2.6vw,40px)] leading-none tracking-[-0.02em]">
                {meta.name}
              </span>
              <span className="mt-2 block text-[14px] opacity-75">{t(meta.tagline, lang)}</span>
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPick("about")}
          className="guide-tile text-left"
          style={{ background: "#F2EEE6", color: "#111", ["--i" as string]: channels.length }}
        >
          <span className="pixel text-[13px]">CH 99</span>
          <span>
            <span className="cjk-heavy block text-[clamp(26px,2.6vw,40px)] leading-none">{t(ui.aboutTitle, lang)}</span>
            <span className="mt-2 block text-[14px] opacity-70">{t(ui.about, lang)}</span>
          </span>
        </button>
      </div>
      <p className="mono mt-6 text-[11px] opacity-50">{t(ui.guideHint, lang)}</p>
    </div>
  );
}
