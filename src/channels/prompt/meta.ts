import type { ChannelMeta } from "../types";

export const meta: ChannelMeta = {
  id: "prompt",
  number: "01",
  name: "oTATo prompt",
  tagline: { zh: "你的好词，就在手边。", en: "Your best prompts, right at hand." },
  description: {
    zh: "macOS 提示词资料库。存在本机，免费，不用注册；⌥ Space 随时唤出。",
    en: "A prompt library for macOS. Stored on your Mac, free, no account. Summon it anywhere with ⌥ Space.",
  },
  href: { zh: "https://prompt.otato.art", en: "https://prompt.otato.art" },
  cta: { zh: "下载 macOS 版", en: "Get it for macOS" },
  status: "test",
  theme: { bg: "#0B0B0C", fg: "#F2EEE6", accent: "#2B5FFC", tone: "dark" },
  ticker: "oTATo prompt",
  selfTitled: true,
  reveal: "monitor",
};
