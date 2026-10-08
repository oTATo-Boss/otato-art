"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import layout from "./workbench-layout.json";
import { HangingCharms } from "./HangingCharms";
import { LeafShadow } from "./LeafShadow";

/**
 * 开场的工作台。
 * 背景：Blender 渲出来的照片（墙、洞洞板、置物架、桌面、书堆）。
 * 挂件 + 香蕉猫：three.js 实时 3D，和照片同一个机位（HangingCharms）。
 * 公仔、两个机器人、鸭子：同机位渲出来的透明小图，碰一下会晃、点一下会跳。
 * 它们的影子是单独一层（同一个太阳渲的）半透明图，叠在背景上，玩具跳起来时影子变淡变虚。
 */

type Box = { x: number; y: number; w: number; h: number };
type Sprite = Box & { px: number; py: number; shadow?: Box };
const SPRITES = layout.sprites as Record<string, Sprite>;
const PLATE = "/open/plate.webp";
// CC-BY 模型的署名：鼠标停在玩具上时出现一行小字
const CREDITS: Record<string, string> = {
  robot: "3D model “Cute Little Robot” by Felix Yadomi · CC BY 4.0",
  bot: "3D model by 逍遥开发小组 · CC BY 4.0",
  cat: "3D model “Cute Cat in Cute Banana” by SOBOL · CC BY 4.0",
};
const MODELS = ["charm_prompt", "charm_model", "charm_work", "charm_ghost", "rail", "cat"];

const pct = (v: number) => `${v * 100}%`;

function ToyShadow({ id, b, el }: { id: string; b: Box; el: (n: HTMLImageElement | null) => void }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={el}
      src={`/open/sprites/${id}-shadow.webp`}
      alt=""
      draggable={false}
      className="toy-shadow pointer-events-none absolute select-none"
      style={{ left: pct(b.x), top: pct(b.y), width: pct(b.w), height: pct(b.h) }}
      onAnimationEnd={(e) => e.currentTarget.classList.remove("hop", "wiggle")}
    />
  );
}

function Toy({ id, s, credit, shadow }: { id: string; s: Sprite; credit?: string; shadow: () => HTMLImageElement | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const replay = (cls: string) => {
    for (const t of [ref.current, shadow()]) {
      if (!t) continue;
      t.classList.remove("hop", "wiggle");
      void t.offsetWidth;
      t.classList.add(cls);
    }
  };
  return (
    <div
      ref={ref}
      className="workbench-toy group absolute cursor-pointer select-none"
      style={{
        left: pct(s.x),
        top: pct(s.y),
        width: pct(s.w),
        height: pct(s.h),
        transformOrigin: `${((s.px - s.x) / s.w) * 100}% ${((s.py - s.y) / s.h) * 100}%`,
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && replay("wiggle")}
      onClick={() => replay("hop")}
      onAnimationEnd={(e) => e.currentTarget.classList.remove("hop", "wiggle")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/open/sprites/${id}.webp`} alt="" className="pointer-events-none h-full w-full" draggable={false} />
      {credit && (
        <span className="mono pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#111]/85 px-2 py-0.5 text-[9px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {credit}
        </span>
      )}
    </div>
  );
}

export function Workbench({
  active,
  visible,
  labels,
  onPick,
}: {
  active: boolean;
  visible: boolean;
  labels: Record<string, string>;
  onPick: (id: string) => void;
}) {
  // 在 HTML 头里就开始下载背景和 3D 模型，不等 JS 跑起来
  preload(PLATE, { as: "image", fetchPriority: "high" });
  for (const m of MODELS) preload(`/open/3d/${m}.glb`, { as: "fetch", crossOrigin: "anonymous" });

  const frame = useRef<HTMLDivElement>(null);
  const shadows = useRef<Record<string, HTMLImageElement | null>>({});
  const tip = useRef<HTMLSpanElement>(null);
  const [tipText, setTipText] = useState("");

  // 整个画面跟着鼠标轻轻错位
  useEffect(() => {
    if (!visible) return;
    const m = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // 已经跟上鼠标就别再写 transform，省得整层每帧重新合成
      if (Math.abs(m.tx - m.x) < 0.0004 && Math.abs(m.ty - m.y) < 0.0004) return;
      m.x += (m.tx - m.x) * 0.05;
      m.y += (m.ty - m.y) * 0.05;
      const f = frame.current;
      if (f) f.style.transform = `translate3d(calc(var(--fx) + ${m.x * -12}px), calc(var(--fy) + ${m.y * -7}px), 0)`;
    };
    raf = requestAnimationFrame(tick);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      m.tx = e.clientX / window.innerWidth - 0.5;
      m.ty = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [visible]);

  const onHover = (id: string | null, x: number, y: number) => {
    const t = tip.current;
    if (!t) return;
    if (!id) {
      t.style.opacity = "0";
      return;
    }
    // 挂件显示频道名（可点）；香蕉猫这类只显示署名
    setTipText(CREDITS[id] ?? `${labels[id] ?? id} ↗`);
    t.style.opacity = "1";
    t.style.transform = `translate3d(${x + 16}px, ${y + 18}px, 0)`;
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#E9E2D6" }}>
      <div ref={frame} className="workbench-frame absolute left-1/2 top-1/2">
        {/* 先显示照片，3D 起来以后盖在上面 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PLATE} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />
        <HangingCharms active={active} visible={visible} onPick={onPick} onHover={onHover} />
        <LeafShadow visible={visible} />
        {/* 影子全部在玩具下面一层，免得盖住旁边的玩具 */}
        {Object.entries(SPRITES).map(([id, s]) =>
          s.shadow ? <ToyShadow key={id} id={id} b={s.shadow} el={(n) => void (shadows.current[id] = n)} /> : null,
        )}
        {Object.keys(SPRITES).map((id) => (
          <Toy key={id} id={id} s={SPRITES[id]} credit={CREDITS[id]} shadow={() => shadows.current[id] ?? null} />
        ))}
      </div>

      {/* 悬停在挂件上时，跟着鼠标的小标签 */}
      <span
        ref={tip}
        aria-hidden
        className="mono pointer-events-none fixed left-0 top-0 z-30 whitespace-nowrap rounded-full bg-[#111] px-2.5 py-1 text-[10px] text-white"
        style={{ opacity: 0, transition: "opacity .15s", textTransform: Object.values(CREDITS).includes(tipText) ? "none" : "uppercase" }}
      >
        {tipText}
      </span>

      {/* 键盘、读屏用的入口 */}
      <div className="sr-only">
        {Object.entries(labels).map(([id, l]) => (
          <button key={id} type="button" onClick={() => onPick(id)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
