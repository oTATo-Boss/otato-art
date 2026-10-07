"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { ScreenProps } from "../types";
import { t } from "@/lib/i18n";
import { meta } from "./meta";
import { SkyChrome } from "./SkyChrome";
import { Typewriter } from "@/shell/Typewriter";
import type { Text } from "@/lib/i18n";

const BLUE = "#2B5FFC";

const samples: { title: Text; tags: Text[]; body: Text }[] = [
  {
    title: { zh: "胶片人像", en: "Film portrait" },
    tags: [{ zh: "人像", en: "portrait" }, { zh: "胶片", en: "film" }],
    body: { zh: "35mm 胶片质感的人像，窗边自然光，柔和颗粒，浅景深。", en: "35mm film portrait, window light, soft grain, shallow depth of field." },
  },
  {
    title: { zh: "产品白底图", en: "Product on white" },
    tags: [{ zh: "电商", en: "ecommerce" }, { zh: "产品", en: "product" }],
    body: { zh: "纯白背景的产品主图，柔光箱布光，轻微倒影，居中构图。", en: "Hero product shot on pure white, softbox lighting, subtle reflection, centered." },
  },
  {
    title: { zh: "小红书封面", en: "Social cover" },
    tags: [{ zh: "封面", en: "cover" }, { zh: "竖版", en: "vertical" }],
    body: { zh: "竖版 3:4 封面，大字标题留白，明亮的奶油色调。", en: "Vertical 3:4 cover, bold headline with room to breathe, bright creamy tones." },
  },
  {
    title: { zh: "九宫格分镜", en: "3×3 storyboard" },
    tags: [{ zh: "分镜", en: "storyboard" }, { zh: "视频", en: "video" }],
    body: { zh: "3×3 分镜，同一个角色，镜头由远到近，服装保持一致。", en: "3×3 storyboard, same character, wide to close-up, consistent outfit." },
  },
  {
    title: { zh: "赛璐璐插画", en: "Cel-shaded illustration" },
    tags: [{ zh: "插画", en: "illustration" }, { zh: "日系", en: "anime" }],
    body: { zh: "日系赛璐璐风格，干净线条，高饱和配色，平涂阴影。", en: "Cel-shaded anime style, clean lines, saturated palette, flat shadows." },
  },
  {
    title: { zh: "雨夜街景", en: "Rainy night street" },
    tags: [{ zh: "场景", en: "scene" }, { zh: "电影感", en: "cinematic" }],
    body: { zh: "雨后城市夜景，霓虹倒影，电影感宽银幕 2.39:1。", en: "City at night after rain, neon reflections, cinematic 2.39:1." },
  },
  {
    title: { zh: "瑞士风海报", en: "Swiss poster" },
    tags: [{ zh: "海报", en: "poster" }, { zh: "设计", en: "design" }],
    body: { zh: "瑞士国际主义风格海报，网格排版，只用一个强调色。", en: "International Typographic Style poster, strict grid, a single accent color." },
  },
];

const copy = {
  monitor: { zh: "按 ⌥ Space 试试搜索", en: "Press ⌥ Space to try the search" },
  terminal: {
    zh: "V.1.0 ———— 欢迎收看 oTATo PROMPT ———— // macOS 提示词资料库。存在你的电脑上，免费，不用注册。在任何地方按下",
    en: "V.1.0 ———— WELCOME TO oTATo PROMPT ———— // A PROMPT LIBRARY FOR MACOS. STORED ON YOUR MAC. FREE, NO ACCOUNT. SUMMON IT ANYWHERE WITH",
  },
  tap: { zh: "试一下搜索", en: "Try the search" },
  clickCard: { zh: "点一下复制", en: "Click to copy" },
  placeholder: { zh: "搜索标题或标签", en: "Search titles or tags" },
  copied: { zh: "已复制", en: "Copied" },
  hint: { zh: "↑↓ 选择 · ↩ 复制 · esc 关闭", en: "↑↓ select · ↩ copy · esc close" },
  empty: { zh: "没有找到。试试「人像」或「海报」。", en: "Nothing found. Try “portrait” or “poster”." },
} satisfies Record<string, Text>;

const marquee: Record<"zh" | "en", string[]> = {
  zh: ["提示词资料库", "⌥ Space", "本机保存", "免费", "macOS 14+"],
  en: ["Prompt library", "⌥ Space", "Local first", "Free", "macOS 14+"],
};

/** 漂浮在天空里的提示词卡片：位置（%）、景深（视差强度）、倾斜角 */
const cards = [
  { i: 0, x: 4, y: 36, depth: 0.7, rot: -5, dur: 7.5 },
  { i: 3, x: 78, y: 33, depth: 1.1, rot: 4, dur: 8.6 },
  { i: 5, x: 21, y: 66, depth: 0.9, rot: 3, dur: 6.8 },
  { i: 6, x: 65, y: 63, depth: 0.55, rot: -3, dur: 9.4 },
];

export default function PromptScreen({ lang, active, visible }: ScreenProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return samples.map((s, i) => ({ s, i }));
    // 和 App 一样：只搜标题和标签
    return samples
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => [s.title[lang], ...s.tags.map((x) => x[lang])].some((x) => x.toLowerCase().includes(k)));
  }, [q, lang]);

  const show = open && active;

  // ⌥ Space 唤出 / 收起
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  useEffect(() => {
    if (show) input.current?.focus();
  }, [show]);

  // 卡片视差：鼠标位置写进 CSS 变量
  useEffect(() => {
    if (!visible) return;
    const onMove = (e: PointerEvent) => {
      stage.current?.style.setProperty("--px", String(e.clientX / window.innerWidth - 0.5));
      stage.current?.style.setProperty("--py", String(e.clientY / window.innerHeight - 0.5));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [visible]);

  const copy1 = (i: number) => {
    const s = samples[i];
    navigator.clipboard?.writeText(s.body[lang]).catch(() => {});
    setCopied(i);
    window.setTimeout(() => setCopied((c) => (c === i ? null : c)), 1400);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((v) => Math.min(results.length - 1, v + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((v) => Math.max(0, v - 1));
    } else if (e.key === "Enter" && results[sel]) {
      e.preventDefault();
      copy1(results[sel].i);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const current = results[sel]?.s;
  // 出场编排：监视器放大完成后，各元素依次进来
  const enter = (d: number, from = "translateY(18px)") => ({
    opacity: active ? 1 : 0,
    transform: active ? "none" : from,
    transition: active ? `opacity .7s ease ${d}ms, transform 1s cubic-bezier(.2,.8,.1,1) ${d}ms` : "none",
  });

  return (
    <div ref={stage} className="relative h-full w-full overflow-hidden text-white" style={{ ["--px" as string]: 0, ["--py" as string]: 0 }}>
      {/* 天空 + 铬字 */}
      <SkyChrome active={active} visible={visible} />

      {/* CRT：扫描线和暗角 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(10,20,60,.07) 0 1px, transparent 1px 4px), linear-gradient(to top, rgba(18,44,160,.55), transparent 34%), radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(4,10,40,.5) 100%)",
        }}
      />

      {/* 漂浮的提示词卡片 */}
      <div className="pointer-events-none absolute inset-0 hidden md:block" style={{ perspective: "1200px" }}>
        {cards.map((c, k) => {
          const s = samples[c.i];
          const done = copied === c.i;
          return (
            <div
              key={c.i}
              className="absolute"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                transform: `translate3d(calc(var(--px) * ${-46 * c.depth}px), calc(var(--py) * ${-34 * c.depth}px), 0)`,
                transition: "transform .6s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <div style={enter(1150 + k * 130, "translateY(40px) scale(.85)")}>
                <button
                  type="button"
                  onClick={() => copy1(c.i)}
                  className="pointer-events-auto group block w-[220px] text-left"
                  style={{ animation: `prompt-float ${c.dur}s ease-in-out ${k * -1.7}s infinite`, ["--r" as string]: `${c.rot}deg` }}
                >
                  <span className="block overflow-hidden rounded-[9px] border border-white/55 bg-white/14 shadow-[0_20px_50px_rgba(8,22,90,.35)] backdrop-blur-md transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white group-hover:bg-white/24">
                    <span className="mono flex items-center gap-1.5 border-b border-white/35 px-2.5 py-1.5 text-[9.5px] uppercase text-white/85">
                      <i className="h-1.5 w-1.5 rounded-full bg-white/80" />
                      <i className="h-1.5 w-1.5 rounded-full bg-white/50" />
                      <i className="h-1.5 w-1.5 rounded-full bg-white/30" />
                      <span className="ml-1.5">prompt_0{c.i + 1}.txt</span>
                    </span>
                    <span className="block px-3 pb-3 pt-2.5">
                      <span className="flex items-center justify-between">
                        <span className="text-[15px] font-semibold">{s.title[lang]}</span>
                        <span className="flex gap-1">
                          {s.tags.map((tg) => (
                            <span key={tg.en} className="rounded-[4px] bg-white/22 px-1.5 py-0.5 text-[10px]">
                              {tg[lang]}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="mt-1.5 line-clamp-2 block text-[11.5px] leading-snug text-white/80">{s.body[lang]}</span>
                      <span className="mono mt-2 block text-[9.5px] uppercase text-white/70">
                        {done ? `✓ ${copy.copied[lang]}` : `↩ ${copy.clickCard[lang]}`}
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 顶部跑马灯：两条线先画出来，字再升上来 */}
      <div className="absolute inset-x-0 top-[84px] md:top-[92px]" aria-hidden>
        <div
          className="mx-[var(--edge)] h-px origin-left bg-white/70"
          style={{ transform: active ? "scaleX(1)" : "scaleX(0)", transition: active ? "transform 1s cubic-bezier(.7,0,.2,1) 650ms" : "none" }}
        />
        <div className="overflow-hidden py-1">
          <div style={enter(820, "translateY(105%)")}>
            <div className="prompt-marquee flex w-max whitespace-nowrap text-[clamp(52px,8.6vw,150px)] font-normal leading-[1.02] tracking-[-0.045em] [text-shadow:0_2px_24px_rgba(10,30,120,.35)]">
              {[0, 1].map((k) => (
                <span key={k} className="flex items-center">
                  {marquee[lang].map((m) => (
                    <span key={m} className="flex items-center">
                      <span>{m}</span>
                      <span className="mx-[0.35em] inline-block h-[0.42em] w-[0.42em] rounded-full bg-white" />
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div
          className="mx-[var(--edge)] h-px origin-right bg-white/70"
          style={{ transform: active ? "scaleX(1)" : "scaleX(0)", transition: active ? "transform 1s cubic-bezier(.7,0,.2,1) 750ms" : "none" }}
        />
      </div>

      {/* 左下：小监视器（这一屏就是从它放大出来的） */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group absolute bottom-[var(--edge)] left-[var(--edge)] hidden text-left md:block"
        style={{ ...enter(1300), opacity: show ? 0 : active ? 1 : 0 }}
      >
        <span className="block w-[232px] overflow-hidden rounded-[10px] border border-white/30 bg-[#0b1020] p-1.5 shadow-[0_18px_50px_rgba(5,15,60,.45)] transition-transform duration-300 group-hover:-translate-y-1">
          <span className="relative block aspect-[960/615] overflow-hidden rounded-[6px]">
            <Image src="/channels/prompt/library.webp" alt="oTATo prompt" fill sizes="232px" className="object-cover" />
            <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,.12)_0_1px,transparent_1px_3px)]" />
          </span>
        </span>
        <span className="mono mt-3 block text-[10.5px] uppercase leading-relaxed text-white/90">
          ▶ {copy.monitor[lang]}
        </span>
      </button>

      {/* 右下：终端文字 + 入口 */}
      <div className="absolute bottom-[var(--edge)] right-[var(--edge)] flex w-[min(420px,calc(100vw-2*var(--edge)))] flex-col items-end gap-5">
        <a
          href={meta.href[lang]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-full border border-white/70 bg-white/10 px-5 py-2.5 text-[15px] backdrop-blur-md transition-colors hover:bg-white hover:text-[#1d3fd1]"
          style={enter(1250)}
        >
          {t(meta.cta, lang)}
          <span className="h-2 w-2 rounded-full bg-[#ffd400] shadow-[0_0_10px_#ffd400]" />
        </a>
        <p className="mono min-h-[3.4em] text-right text-[10.5px] leading-[1.7] text-white/90 [text-shadow:0_1px_8px_rgba(10,30,120,.4)]">
          <Typewriter text={copy.terminal[lang]} active={active} delay={1350} speed={14} />{" "}
          <button type="button" onClick={() => setOpen(true)} className="bg-white px-1 text-[#1d3fd1]" style={enter(1500)}>
            ⌥ SPACE
          </button>
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mono rounded-full border border-white/70 px-4 py-2 text-[12px] md:hidden"
          style={{ display: show ? "none" : undefined }}
        >
          {copy.tap[lang]}
        </button>
      </div>

      {/* 仿真的快速搜索浮层 */}
      {show && (
        <div
          className="absolute left-1/2 top-[14vh] z-10 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-[14px] border border-white/10 bg-[#1c1c1e]/90 text-[#f2f2f7] shadow-[0_30px_80px_rgba(0,0,0,.6)] backdrop-blur-xl md:left-auto md:right-[8vw] md:translate-x-0"
          role="dialog"
          aria-label="oTATo prompt"
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="opacity-60">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSel(0);
              }}
              onKeyDown={onInputKey}
              placeholder={copy.placeholder[lang]}
              className="w-full bg-transparent text-[18px] outline-none placeholder:text-white/35"
            />
            <button type="button" onClick={() => setOpen(false)} className="mono text-[11px] opacity-50 hover:opacity-100">
              esc
            </button>
          </div>
          <ul data-scrollable className="max-h-[38vh] overflow-y-auto p-1.5">
            {results.length === 0 && <li className="px-3 py-4 text-[13px] opacity-50">{copy.empty[lang]}</li>}
            {results.map(({ s, i }, k) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseEnter={() => setSel(k)}
                  onClick={() => copy1(i)}
                  className="flex w-full items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 text-left"
                  style={{ background: k === sel ? BLUE : "transparent" }}
                >
                  <span className="text-[15px] font-medium">{s.title[lang]}</span>
                  <span className="flex items-center gap-1.5">
                    {copied === i ? (
                      <span className="mono text-[11px]">✓ {copy.copied[lang]}</span>
                    ) : (
                      s.tags.map((tg) => (
                        <span key={tg.en} className="rounded-[5px] bg-white/12 px-1.5 py-0.5 text-[11px]">
                          {tg[lang]}
                        </span>
                      ))
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {current && <p className="border-t border-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/65">{current.body[lang]}</p>}
          <p className="mono border-t border-white/10 px-4 py-2 text-[10px] text-white/40">{copy.hint[lang]}</p>
        </div>
      )}
    </div>
  );
}
