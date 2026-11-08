import type { ChannelMeta } from "../types";

export const meta: ChannelMeta = {
  id: "tools", number: "04", name: "oTATo Toolbox",
  tagline: { zh: "打开箱子，挑一件创作工具。", en: "Open the case. Pick a creative tool." },
  description: { zh: "在 RELIGHT LAB 摆灯、生成重打光提示词，或用 RH Studio 运行 RunningHub 应用。", en: "Place lights and build relighting prompts in RELIGHT LAB, or run RunningHub apps in RH Studio." },
  href: { zh: "https://tools.otato.art", en: "https://tools.otato.art" },
  cta: { zh: "进入工具箱", en: "Visit the toolbox" },
  status: "live", theme: { bg: "#fae2bf", fg: "#212745", accent: "#304bc1", tone: "light" },
  ticker: "oTATo Toolbox", reveal: "fade", selfTitled: true,
};
