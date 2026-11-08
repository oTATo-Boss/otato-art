"use client";

import { useState } from "react";
import Image from "next/image";
import type { ScreenProps } from "../types";
import { meta } from "./meta";
import { usePrintReveal } from "../usePrintReveal";
import "../print.css";

export default function ToolsScreen({ lang, active }: ScreenProps) {
  const [open, setOpen] = useState(false);
  const root = usePrintReveal(active);
  const zh = lang === "zh";
  return <div ref={root} className="print-edition toolbox-edition">
    <div className="print-mast mono"><span>OTATO SUPPLY CO.</span><span>FIELD EQUIPMENT　/　04</span></div>
    <div className="print-spread">
      <header className="print-copy">
        <div data-print className="print-kicker mono"><i /> {zh ? "器材目录" : "EQUIPMENT CATALOGUE"}　/　№ 04</div>
        <h2 data-print className="tool-title">Toolbox<span>.</span></h2>
        <p data-print className="print-sub">{zh ? "去皮土豆的漫画工具箱" : "oTATo’s comic-book toolbox"}</p>
        <p data-print className="print-body">{meta.description[lang]}</p>
        <a data-print className="edition-link" href={meta.href[lang]} target="_blank" rel="noopener noreferrer">{meta.cta[lang]} <span>↗</span></a>
      </header>
      <figure data-print className="tool-figure">
        <button type="button" aria-pressed={open} aria-label={zh ? "预览工具箱内部" : "Preview the contents"} className="tool-preview" onClick={() => setOpen(!open)}>
          <Image src="/channels/tools/closed.webp" alt="" width={1050} height={760} className={open ? "case-img off" : "case-img"} />
          <Image src="/channels/tools/open.webp" alt="" width={1050} height={760} className={open ? "case-img" : "case-img off"} />
          <span className="case-switch"><b aria-hidden>{open ? "−" : "+"}</b>{open ? (zh ? "合上箱盖" : "Close lid") : (zh ? "掀开看一眼" : "Lift the lid")}</span>
        </button>
        <figcaption className="plate-caption mono"><span>FIG. 04　/　{open ? "OPEN" : "CLOSED"}</span><span>RELIGHT LAB　·　RH STUDIO</span></figcaption>
      </figure>
    </div>
    <div className="print-foot mono"><span>oTATo　 /　 PRODUCT CHANNELS</span><span>TOOLS.OTATO.ART</span></div>
  </div>;
}
