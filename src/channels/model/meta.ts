import type { ChannelMeta } from "../types";

export const meta: ChannelMeta = {
  id: "model",
  number: "02",
  name: "oTATo model",
  tagline: { zh: "AI 模特写真与商拍换装。", en: "AI model photography and try-on." },
  description: {
    zh: "上传人物、服装和动作参考，几十秒拿到可以直接用的成片。",
    en: "Upload a face, an outfit and a pose. Get shots you can use in seconds.",
  },
  href: { zh: "https://model.otato.art", en: "https://model.otato.art/en" },
  cta: { zh: "进入工作室", en: "Open the studio" },
  status: "live",
  theme: { bg: "#17110F", fg: "#D9B798", accent: "#E11D48", tone: "dark" },
  ticker: "oTATo model",
  selfTitled: true,
  reveal: "stripes",
};
