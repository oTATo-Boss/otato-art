"use client";

import { useEffect, useRef, useState } from "react";
import type { ScreenProps } from "../types";
import { statusLabel } from "../types";
import { t, type Text } from "@/lib/i18n";
import { meta } from "./meta";
import { grab } from "@/shell/gesture";

const BLUE = "#2747C9";
const PAPER = "#E8DCC3";
const hand = { fontFamily: '"Architects Daughter", var(--font-mono)' } as const;

type Glyph = "bars" | "peak" | "ring" | "page" | "quarter" | "grid" | "half";

/** 白色几何小图标，画在蓝色方块里 */
function Icon({ g, size }: { g: Glyph; size: number }) {
  const s = { stroke: "#fff", strokeWidth: 3.2, fill: "none", strokeLinecap: "square" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" fill={BLUE} />
      {g === "bars" && (
        <>
          <rect x="8" y="10" width="24" height="5" fill="#fff" />
          <rect x="8" y="18" width="24" height="5" fill="#fff" />
          <rect x="8" y="26" width="24" height="5" fill="#fff" />
        </>
      )}
      {g === "peak" && <path d="M8 31 L20 13 L32 31 Z" fill="#fff" />}
      {g === "ring" && (
        <>
          <circle cx="20" cy="20" r="11" {...s} strokeWidth={5} />
          <circle cx="20" cy="20" r="3" fill="#fff" />
        </>
      )}
      {g === "page" && <path d="M10 10 H30 M10 17 H30 M10 24 H24 M10 31 H18" {...s} />}
      {g === "quarter" && <path d="M9 9 H31 A22 22 0 0 1 9 31 Z" fill="#fff" />}
      {g === "grid" && (
        <>
          <rect x="9" y="9" width="9" height="9" fill="#fff" />
          <rect x="22" y="9" width="9" height="9" fill="#fff" />
          <rect x="9" y="22" width="9" height="9" fill="#fff" />
          <rect x="22" y="22" width="9" height="9" fill="#fff" opacity=".45" />
        </>
      )}
      {g === "half" && <path d="M8 26 A12 12 0 0 1 32 26 Z" fill="#fff" />}
    </svg>
  );
}

const nodes: { name: Text; sub: Text; g: Glyph; at: [number, number]; atM: [number, number] }[] = [
  { name: { zh: "对话", en: "Chat" }, sub: { zh: "Agent · Skill", en: "Agents · Skills" }, g: "bars", at: [36, 22], atM: [20, 10] },
  { name: { zh: "图片", en: "Image" }, sub: { zh: "模式化生图", en: "Image modes" }, g: "peak", at: [58, 15], atM: [66, 6] },
  { name: { zh: "视频", en: "Video" }, sub: { zh: "模式化生视频", en: "Video modes" }, g: "ring", at: [78, 26], atM: [78, 36] },
  { name: { zh: "剧本", en: "Script" }, sub: { zh: "立项 · 编剧室", en: "Writers' room" }, g: "page", at: [82, 52], atM: [70, 74] },
  { name: { zh: "预设", en: "Presets" }, sub: { zh: "搜索 · 收藏 · 复制", en: "Search · Save · Copy" }, g: "half", at: [70, 74], atM: [38, 90] },
  { name: { zh: "画廊", en: "Gallery" }, sub: { zh: "生成记录", en: "Every generation" }, g: "grid", at: [46, 76], atM: [12, 72] },
  { name: { zh: "画布", en: "Canvas" }, sub: { zh: "分镜 · 灵感板", en: "Boards" }, g: "quarter", at: [32, 50], atM: [10, 40] },
];
const HUB: [number, number] = [57, 46];
const HUB_M: [number, number] = [48, 44];

const copy = {
  title: { zh: "把 AI 创作，放进一个连续的工作台。", en: "Put AI creation on one continuous workbench." },
  body: {
    zh: "对话、图片、视频、剧本、画布和预设在同一个流程里。开源，可自部署，能绑定自己的模型密钥。",
    en: "Chat, image, video, script, canvas and presets in one flow. Open source, self-hostable, bring your own model keys.",
  },
  hint: { zh: "拖动方块试试", en: "Drag the blocks" },
} satisfies Record<string, Text>;

type Vec = { x: number; y: number };
type Phase = "done" | "idle" | "cover" | "reveal";

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const paperBg = {
  backgroundColor: PAPER,
  backgroundImage: [
    "linear-gradient(rgba(120,92,52,.22) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(120,92,52,.22) 1px, transparent 1px)",
    "linear-gradient(rgba(120,92,52,.09) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(120,92,52,.09) 1px, transparent 1px)",
  ].join(","),
  backgroundSize: "40px 40px, 40px 40px, 8px 8px, 8px 8px",
};

export default function WorkScreen({ lang, active, visible }: ScreenProps) {
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const nodeEls = useRef<(HTMLDivElement | null)[]>([]);
  const crossX = useRef<HTMLDivElement>(null);
  const crossY = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, mobile: false, rw: 1440, rh: 900 });
  const [phase, setPhase] = useState<Phase>("done");
  const [drag, setDrag] = useState<number | null>(null);
  const offsetRef = useRef<Vec[]>(nodes.map(() => ({ x: 0, y: 0 })));
  const springs = useRef(nodes.map(() => ({ c: { x: 0, y: 0 }, v: { x: 0, y: 0 }, init: false })));
  const dragStart = useRef<{ i: number; px: number; py: number; ox: number; oy: number } | null>(null);
  const introAt = useRef(-1);
  const mouse = useRef({ x: -1, y: -1 });

  // 出场：蓝色方块铺满 → 翻开露出方格纸 → 节点从中心弹出去
  useEffect(() => {
    if (!active) return;
    const ids: number[] = [];
    const r = requestAnimationFrame(() => setPhase("idle"));
    ids.push(window.setTimeout(() => setPhase("cover"), 40));
    ids.push(
      window.setTimeout(() => {
        setPhase("reveal");
        introAt.current = performance.now() + 250;
      }, 980),
    );
    ids.push(window.setTimeout(() => setPhase("done"), 2000));
    return () => {
      cancelAnimationFrame(r);
      ids.forEach((i) => window.clearTimeout(i));
    };
  }, [active]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      setSize({ w, h, mobile: window.innerWidth < 768, rw: root.current?.clientWidth || 1440, rh: root.current?.clientHeight || 900 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tile = size.mobile ? 40 : 52;
  const hubP = size.mobile ? HUB_M : HUB;
  const hub = { x: (hubP[0] / 100) * size.w, y: (hubP[1] / 100) * size.h };

  // 每一帧：节点位置（出场弹出 + 轻轻浮动 + 拖动偏移）、带弹性的连线、十字准线
  useEffect(() => {
    if (!visible || !size.w) return;
    let raf = 0;
    const paths = svg.current?.querySelectorAll("path");
    const hx = hub.x;
    const hy = hub.y;
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const t = now / 1000;
      nodes.forEach((n, i) => {
        const p = size.mobile ? n.atM : n.at;
        const o = offsetRef.current[i];
        const tx = (p[0] / 100) * size.w + o.x;
        const ty = (p[1] / 100) * size.h + o.y;
        const since = introAt.current < 0 ? 9999 : now - introAt.current - i * 70;
        const k = since <= 0 ? 0 : since >= 750 ? 1 : easeOutBack(since / 750);
        const bob = dragStart.current?.i === i ? 0 : Math.sin(t * 1.3 + i * 1.7) * 3;
        const nx = hx + (tx - hx) * k;
        const ny = hy + (ty - hy) * k + bob;
        const el = nodeEls.current[i];
        if (el) {
          el.style.transform = `translate3d(${nx - tile / 2}px, ${ny - tile / 2}px, 0)`;
          el.style.opacity = k <= 0 ? "0" : "1";
        }
        const target = { x: (hx + nx) / 2, y: (hy + ny) / 2 + 14 };
        const s = springs.current[i];
        if (!s.init) {
          s.c = { ...target };
          s.init = true;
        }
        s.v.x = (s.v.x + (target.x - s.c.x) * 0.08) * 0.82;
        s.v.y = (s.v.y + (target.y - s.c.y) * 0.08) * 0.82;
        s.c.x += s.v.x;
        s.c.y += s.v.y;
        const path = paths?.[i];
        if (path) {
          path.setAttribute("d", `M${hx} ${hy} Q${s.c.x} ${s.c.y} ${nx} ${ny}`);
          path.style.opacity = String(k);
        }
      });
      // 十字准线 + 坐标
      const m = mouse.current;
      if (crossX.current && crossY.current && m.x >= 0) {
        crossX.current.style.transform = `translate3d(0, ${m.y}px, 0)`;
        crossY.current.style.transform = `translate3d(${m.x}px, 0, 0)`;
        if (readout.current) {
          readout.current.textContent = `X ${String(Math.round(m.x)).padStart(4, "0")} · Y ${String(Math.round(m.y)).padStart(4, "0")}`;
          readout.current.style.transform = `translate3d(${m.x + 14}px, ${m.y + 14}px, 0)`;
        }
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, size, hub.x, hub.y, tile]);

  useEffect(() => {
    if (!visible) return;
    const onMove = (e: PointerEvent) => {
      const r = root.current?.getBoundingClientRect();
      if (!r) return;
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [visible]);

  const onDown = (i: number) => (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    grab.active = true;
    const o = offsetRef.current[i];
    dragStart.current = { i, px: e.clientX, py: e.clientY, ox: o.x, oy: o.y };
    setDrag(i);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragStart.current;
    if (!d) return;
    offsetRef.current[d.i] = { x: d.ox + e.clientX - d.px, y: d.oy + e.clientY - d.py };
  };
  const onUp = () => {
    grab.active = false;
    dragStart.current = null;
    setDrag(null);
  };

  const covering = phase === "idle" || phase === "cover";
  const cols = size.mobile ? 6 : 14;
  const rows = Math.ceil((cols * size.rh) / size.rw);
  const fade = (d: number) => ({
    opacity: covering ? 0 : 1,
    transform: covering ? "translateY(14px)" : "none",
    transition: covering ? "none" : `opacity .7s ease ${d}ms, transform .9s cubic-bezier(.2,.8,.1,1) ${d}ms`,
  });

  return (
    <div ref={root} className="relative h-full w-full overflow-hidden" style={{ color: BLUE, ...(covering ? {} : paperBg) }}>
      <div style={{ opacity: covering ? 0 : 1 }} className="absolute inset-0">
        {/* 十字准线 */}
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
          <div ref={crossX} className="absolute left-0 right-0 top-0 h-px" style={{ background: "repeating-linear-gradient(90deg, rgba(39,71,201,.35) 0 4px, transparent 4px 8px)" }} />
          <div ref={crossY} className="absolute bottom-0 left-0 top-0 w-px" style={{ background: "repeating-linear-gradient(to bottom, rgba(39,71,201,.35) 0 4px, transparent 4px 8px)" }} />
          <span ref={readout} className="absolute left-0 top-0 whitespace-nowrap text-[11px]" style={hand} />
        </div>

        {/* 左上：手写标题 */}
        <div className="absolute left-[var(--edge)] top-[calc(var(--edge)+64px)] z-10 max-w-[min(460px,calc(100vw-2*var(--edge)))]">
          <p className="text-[13px] uppercase tracking-[0.06em]" style={{ ...hand, ...fade(100) }}>
            oTATo work · CH {meta.number}
          </p>
          <h2 className="mt-3 hidden text-[22px] font-semibold leading-snug text-[#1b2f8f] md:block" style={fade(220)}>
            {copy.title[lang]}
          </h2>
        </div>

        <div ref={box} className="absolute inset-x-0 top-[96px] h-[50%] md:inset-0 md:top-0 md:h-full">
          <svg ref={svg} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {nodes.map((_, i) => (
              <path key={i} fill="none" stroke={BLUE} strokeWidth="1.5" strokeDasharray="5 5" />
            ))}
          </svg>

          {size.w > 0 && (
            <>
              {/* 中心：四格图标，出场时从四个方向拼起来 */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: hub.x, top: hub.y }}>
                <div className="grid grid-cols-2 gap-[3px] p-[3px]">
                  {(["bars", "peak", "ring", "quarter"] as Glyph[]).map((g, k) => {
                    const dx = k % 2 ? 60 : -60;
                    const dy = k < 2 ? -60 : 60;
                    return (
                      <span
                        key={g}
                        className="block"
                        style={{
                          transform: covering ? `translate(${dx}px, ${dy}px) rotate(${k % 2 ? 90 : -90}deg) scale(.4)` : "none",
                          opacity: covering ? 0 : 1,
                          transition: covering ? "none" : `all .8s cubic-bezier(.3,1.4,.5,1) ${100 + k * 70}ms`,
                        }}
                      >
                        <Icon g={g} size={tile} />
                      </span>
                    );
                  })}
                </div>
                <p className="mt-3 hidden whitespace-nowrap text-center text-[12px] uppercase md:block" style={{ ...hand, ...fade(900) }}>
                  ↔ {copy.hint[lang]}
                </p>
              </div>

              {nodes.map((n, i) => {
                const on = drag === i;
                return (
                  <div
                    key={n.name.en}
                    ref={(el) => {
                      nodeEls.current[i] = el;
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={n.name[lang]}
                    onPointerDown={onDown(i)}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    className="absolute left-0 top-0 flex touch-none select-none items-center gap-3"
                    style={{ cursor: on ? "grabbing" : "grab", zIndex: on ? 5 : 1, opacity: 0 }}
                  >
                    <span
                      className="block transition-transform duration-150"
                      style={{
                        transform: `scale(${on ? 1.1 : 1}) rotate(${on ? -6 : 0}deg)`,
                        boxShadow: on ? "8px 8px 0 rgba(39,71,201,.25)" : "none",
                      }}
                    >
                      <Icon g={n.g} size={tile} />
                    </span>
                    <span className="whitespace-nowrap leading-tight">
                      <span className="block text-[15px] font-semibold md:text-[17px]">{n.name[lang]}</span>
                      <span className="hidden text-[11px] uppercase opacity-70 md:block" style={hand}>
                        {n.sub[lang]}
                      </span>
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* 左下：说明 + 入口（illoca 那种小按钮） */}
        <div className="absolute bottom-[var(--edge)] left-[var(--edge)] z-10 max-w-[min(420px,calc(100vw-2*var(--edge)))]">
          <p className="mb-4 text-[13px] leading-relaxed text-[#1b2f8f]/80" style={fade(500)}>
            {copy.body[lang]}
          </p>
          <div className="flex flex-wrap items-center gap-2" style={fade(620)}>
            <a
              href={meta.href[lang]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-[#c9b994] bg-[#fbf7ee] py-1.5 pl-1.5 pr-3 text-[13px] shadow-[2px_2px_0_rgba(120,92,52,.25)] transition-transform hover:-translate-y-0.5"
            >
              <span className="grid h-6 w-6 place-items-center bg-[#2747C9] text-[13px] text-white">↗</span>
              {t(meta.cta, lang)}
            </a>
            {meta.links?.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-[#c9b994] bg-[#fbf7ee] py-1.5 pl-1.5 pr-3 text-[13px] shadow-[2px_2px_0_rgba(120,92,52,.25)] transition-transform hover:-translate-y-0.5"
              >
                <span className="grid h-6 w-6 place-items-center bg-[#B0252B] text-[11px] text-white">{"</>"}</span>
                {t(l.label, lang)}
              </a>
            ))}
          </div>
        </div>

        <p className="absolute bottom-[var(--edge)] right-[var(--edge)] hidden text-right text-[13px] uppercase md:block" style={{ ...hand, ...fade(700) }}>
          {t(statusLabel[meta.status], lang)} — work.otato.art
        </p>
      </div>

      {/* 出场：蓝色方块马赛克（沿对角线铺满，再翻开） */}
      {phase !== "done" && (
        <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }} aria-hidden>
          {Array.from({ length: cols * rows }).map((_, k) => {
            const c = k % cols;
            const r = Math.floor(k / cols);
            const d = (c + r) * 26;
            const on = phase === "cover";
            return (
              <span
                key={k}
                className="block"
                style={{
                  background: (c + r) % 5 === 0 ? "#1b2f8f" : BLUE,
                  transform: on ? "scale(1.02)" : phase === "reveal" ? "scale(0) rotate(90deg)" : "scale(0)",
                  transition: phase === "idle" ? "none" : `transform .34s cubic-bezier(.6,0,.3,1) ${d}ms`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
