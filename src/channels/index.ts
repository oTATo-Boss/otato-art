import dynamic from "next/dynamic";
import type { Channel } from "./types";
import { meta as promptMeta } from "./prompt/meta";
import { meta as modelMeta } from "./model/meta";
import { meta as workMeta } from "./work/meta";

/**
 * 频道表。加一个新产品：
 * 1. 复制一个频道文件夹（meta.ts + Screen.tsx）
 * 2. 在下面加一行
 * 已有频道不用改。
 */
export const channels: Channel[] = [
  { meta: promptMeta, Screen: dynamic(() => import("./prompt/Screen")) },
  { meta: modelMeta, Screen: dynamic(() => import("./model/Screen")) },
  { meta: workMeta, Screen: dynamic(() => import("./work/Screen")) },
];

export type { Channel, ChannelMeta, Status, Reveal } from "./types";
export { statusLabel } from "./types";
