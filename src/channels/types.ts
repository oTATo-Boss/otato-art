import type { ComponentType } from "react";
import type { Lang, Text } from "@/lib/i18n";

export type Status = "live" | "test" | "soon";
export type Tone = "dark" | "light";

/**
 * 这一屏出现的方式：
 * curtain 幕布落下 / monitor 从小监视器放大 / stripes 横纹刻出 /
 * self 由这一屏自己处理（比如方块马赛克） / fade 淡入
 */
export type Reveal = "curtain" | "monitor" | "stripes" | "self" | "fade";

export const statusLabel: Record<Status, Text> = {
  live: { zh: "直播中", en: "On Air" },
  test: { zh: "试播", en: "Test Signal" },
  soon: { zh: "即将开播", en: "Coming Soon" },
};

export interface ChannelTheme {
  /** 频道底色 */
  bg: string;
  /** 正文颜色 */
  fg: string;
  /** 主色：用在滚动字幕、频道列表色块和状态点上 */
  accent: string;
  /** 亮屏还是暗屏，品牌壳据此切换文字颜色 */
  tone: Tone;
}

export interface ChannelMeta {
  /** 用作锚点：otato.art/#prompt */
  id: string;
  /** 频道号，显示为 CH 01 */
  number: string;
  name: string;
  tagline: Text;
  description: Text;
  href: Record<Lang, string>;
  cta: Text;
  status: Status;
  theme: ChannelTheme;
  /** 滚动字幕里循环的字 */
  ticker: string;
  /** 这一屏出现的方式，默认淡入 */
  reveal?: Reveal;
  /** 频道自己画标题和入口时为 true，品牌壳就不再显示左下的节目名和右下的按钮 */
  selfTitled?: boolean;
  /** 次要链接，比如 GitHub */
  links?: { label: Text; href: string }[];
}

export interface ScreenProps {
  lang: Lang;
  /** 当前是否正在播这个频道（出场动画从 active 变 true 开始） */
  active: boolean;
  /** 是否在屏幕上可见（当前屏，或正被新屏盖住的上一屏）。不可见时暂停渲染。 */
  visible: boolean;
}

export interface Channel {
  meta: ChannelMeta;
  Screen: ComponentType<ScreenProps>;
}
