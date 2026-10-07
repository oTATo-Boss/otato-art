import type { Metadata, Viewport } from "next";
import type { Lang } from "./i18n";

const copy: Record<Lang, { title: string; description: string }> = {
  zh: {
    title: "去皮土豆 oTATo",
    description: "做给创作者的小工具。oTATo prompt、oTATo model、oTATo work，每个产品是一个频道。",
  },
  en: {
    title: "oTATo",
    description: "Small tools for people who make things. oTATo prompt, oTATo model and oTATo work — every product is a channel.",
  },
};

export function siteMetadata(lang: Lang, page?: string, path = ""): Metadata {
  const c = copy[lang];
  const title = page ? `${page} · ${c.title}` : c.title;
  return {
    metadataBase: new URL("https://otato.art"),
    title,
    description: c.description,
    alternates: {
      canonical: (lang === "zh" ? "" : "/en") + path || "/",
      languages: { "zh-CN": path || "/", en: "/en" + path },
    },
    openGraph: {
      title,
      description: c.description,
      url: lang === "zh" ? "https://otato.art" : "https://otato.art/en",
      siteName: c.title,
      locale: lang === "zh" ? "zh_CN" : "en_US",
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#111111",
  colorScheme: "dark",
};
