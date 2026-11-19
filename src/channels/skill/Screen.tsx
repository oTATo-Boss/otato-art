"use client";

import { useState } from "react";
import type { ScreenProps } from "../types";
import { meta } from "./meta";
import { usePrintReveal } from "../usePrintReveal";
import "../print.css";

const files = [
  { en: "Image", zh: "图像创作", desc: { zh: "图片生成、角色设计与场景资产。", en: "Image generation, character design and scene assets." } },
  { en: "Video", zh: "视频制作", desc: { zh: "视频参考、镜头提示词与制作。", en: "Video references, shot prompts and production." } },
  { en: "Direction", zh: "导演与创意", desc: { zh: "视频导演与跨媒介视觉创意。", en: "Film direction and visual ideas across media." } },
];
function PrintMark({ id }: { id: number }) {
  return <svg className="file-mark" viewBox="0 0 220 90" fill="none" aria-hidden="true">
    {id === 0 ? [0,1,2,3,4,5,6,7].map(i => <ellipse key={i} cx="110" cy="45" rx="80" ry="28" transform={`rotate(${i * 8 - 28} 110 45)`} />)
      : id === 1 ? [0,1,2,3,4,5,6].map(i => <path key={i} d="M40 65 75 17 129 24 94 72Z" transform={`translate(${i*9} 0)`} />)
      : [0,1,2,3,4,5,6,7].map(i => <path key={i} d={`M28 73 Q110 ${-83+i*19} 192 73 Z`} />)}
  </svg>;
}
export default function SkillScreen({ lang, active }: ScreenProps) {
  const root = usePrintReveal(active);
  const [index, select] = useState(0);
  const f = files[index];
  const zh = lang === "zh";
  return <div ref={root} className="print-edition archive-edition">
    <div className="print-mast mono"><span>OTATO ARCHIVES</span><span>CREATIVE WORKFLOWS　/　05</span></div>
    <div className="print-spread">
      <header className="print-copy">
        <div data-print className="print-kicker mono"><i /> {zh ? "技能收藏夹" : "SKILL COLLECTION"}　/　№ 05</div>
        <h2 data-print className="archive-title">Skill<br /><em>Archive</em></h2>
        <p data-print className="print-body">{meta.description[lang]}</p>
        <a data-print className="edition-link" href={meta.href[lang]} target="_blank" rel="noopener noreferrer">{meta.cta[lang]} <span>↗</span></a>
      </header>
      <div data-print className="file-desk">
        <div className="file-tabs" role="group" aria-label={zh ? "选择档案样本" : "Select a sample file"}>
          {files.map((item, i) => <button key={item.en} type="button" onClick={() => select(i)} aria-pressed={index === i}><small>0{i+1}</small> {zh ? item.zh : item.en}</button>)}
        </div>
        <div className="file-sheet" key={index} aria-live="polite">
          <div className="file-top mono"><span>OTATO　/　SKILL FILE</span><b>0{index+1}</b></div>
          <PrintMark id={index} />
          <h3>{f.en}</h3><p>{f.desc[lang]}</p>
        </div>
        <div className="file-pocket"><span>oTATo <i>/</i> skills</span><small>REFERENCE<br />COLLECTION</small></div>
      </div>
    </div>
    <div className="print-foot mono"><span>oTATo　 /　 PRODUCT CHANNELS</span><span>SKILLS.OTATO.ART</span></div>
  </div>;
}
