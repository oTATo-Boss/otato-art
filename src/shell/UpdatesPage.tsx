import Link from "next/link";
import { updates } from "@/content/updates";
import { homePath, t, ui, type Lang } from "@/lib/i18n";
import { Logo } from "./Logo";

/** 更新记录页：纸白底，一行一条，新的在上面 */
export function UpdatesPage({ lang }: { lang: Lang }) {
  return (
    <div className="min-h-dvh bg-paper px-[var(--edge)] py-[var(--edge)] text-ink">
      <header className="flex items-center justify-between">
        <Link href={homePath[lang]} className="flex items-center gap-3" aria-label={t(ui.brand, lang)}>
          <Logo size={34} />
          <span className="pixel text-[13px] tracking-wider">CH 99</span>
        </Link>
        <Link href={`${homePath[lang]}#about`} className="mono text-[12px] hover:underline">
          ← {t(ui.backHome, lang)}
        </Link>
      </header>

      <main className="mx-auto mt-[12vh] max-w-[880px]">
        <h1 className="cjk-heavy text-[clamp(48px,8vw,120px)] leading-[0.9] tracking-[-0.04em]">{t(ui.updatesTitle, lang)}</h1>
        <ul className="mt-12 border-t border-ink">
          {updates.map((u) => (
            <li key={u.date + u.channel} className="grid grid-cols-[110px_1fr] gap-4 border-b border-ink py-5 sm:grid-cols-[140px_200px_1fr]">
              <time className="mono text-[12px]" dateTime={u.date}>
                {u.date}
              </time>
              <span className="text-[15px] font-semibold">{u.channel}</span>
              <span className="col-span-2 text-[15px] opacity-80 sm:col-span-1">{t(u.title, lang)}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
