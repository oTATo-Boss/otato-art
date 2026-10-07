import type { ChannelMeta } from "../types";

export const meta: ChannelMeta = {
  id: "work",
  number: "03",
  name: "oTATo work",
  tagline: { zh: "把 AI 创作放进一个连续的工作台。", en: "One continuous workbench for AI creation." },
  description: {
    zh: "对话、图片、视频、剧本、画布和预设在同一个流程里。开源，可自部署。",
    en: "Chat, image, video, script, canvas and presets in one flow. Open source and self-hostable.",
  },
  href: { zh: "https://work.otato.art", en: "https://work.otato.art" },
  cta: { zh: "进入工作台", en: "Open the workbench" },
  status: "soon",
  theme: { bg: "#E8DCC3", fg: "#2747C9", accent: "#2747C9", tone: "light" },
  ticker: "oTATo work",
  selfTitled: true,
  reveal: "self",
  links: [{ label: { zh: "GitHub", en: "GitHub" }, href: "https://github.com/susu177990-rgb/work-otato-art" }],
};
