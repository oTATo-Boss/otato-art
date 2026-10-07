import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
// 中文：思源黑体（Noto Sans SC），按需分片加载
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/700.css";
import "@fontsource/noto-sans-sc/900.css";
// work 频道的手写字
import "@fontsource/architects-daughter/400.css";

export const fontVars = [GeistSans.variable, GeistMono.variable, GeistPixelSquare.variable].join(" ");
