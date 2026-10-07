export type Lang = "zh" | "en";

/** 中英两份文案。每个需要翻译的字符串都写成这个形状。 */
export type Text = Record<Lang, string>;

export const t = (text: Text, lang: Lang) => text[lang];

/** 每种语言的首页路径 */
export const homePath: Record<Lang, string> = { zh: "/", en: "/en" };
export const updatesPath: Record<Lang, string> = { zh: "/updates", en: "/en/updates" };

export const LANG_KEY = "otato-lang";

/** 品牌壳上用到的固定文案 */
export const ui = {
  brand: { zh: "去皮土豆 oTATo", en: "oTATo" },
  brandStatement: {
    zh: "做给创作者的小工具。每个产品是一个频道，各有各的样子。",
    en: "Small tools for people who make things. Every product is its own channel, with its own look.",
  },
  guide: { zh: "频道列表", en: "Channels" },
  guideClose: { zh: "关闭", en: "Close" },
  guideHint: { zh: "按 M 打开 · 数字键直接换台", en: "Press M to open · Number keys to switch" },
  switchHint: { zh: "往下滚，换台", en: "Scroll to switch channels" },
  onAirCount: { zh: "个频道正在播出", en: "channels on air" },
  boot: { zh: "开机", en: "Power on" },
  skip: { zh: "跳过", en: "Skip" },
  about: { zh: "关于", en: "About" },
  aboutTitle: { zh: "节目之外", en: "Off air" },
  allChannels: { zh: "全部频道", en: "All channels" },
  follow: { zh: "关注", en: "Follow" },
  updates: { zh: "节目预告 · 更新记录", en: "Coming up · Updates" },
  updatesTitle: { zh: "更新记录", en: "Updates" },
  backHome: { zh: "回到频道", en: "Back to channels" },
  langSwitch: { zh: "EN", en: "中" },
  langSwitchLabel: { zh: "Switch to English", en: "切换到中文" },
} satisfies Record<string, Text>;
