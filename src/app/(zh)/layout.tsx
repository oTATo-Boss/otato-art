import "../globals.css";
import { fontVars } from "@/lib/fonts";
import { siteMetadata } from "@/lib/metadata";

export const metadata = siteMetadata("zh");
export { viewport } from "@/lib/metadata";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
