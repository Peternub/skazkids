import Link from "next/link";
import { HeaderAuthActions } from "@/components/site/header-auth-actions";
import { BrandWordmark } from "@/components/site/brand-wordmark";

const siteLinks = [
  { href: "/", label: "Главная" },
  { href: "/pricing", label: "Цены" },
  { href: "/about", label: "О сервисе" },
  { href: "/#reviews", label: "Отзывы" },
  { href: "/#contact", label: "Связаться" }
];

export function SiteHeader() {
  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-[var(--border-soft)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-10 lg:py-5">
          <Link href="/" className="flex shrink-0 items-center gap-3 text-[var(--logo-text)]">
            <BrandWordmark className="header-brand-wordmark" />
          </Link>

          <nav aria-label="Основная навигация" className="ml-5 hidden items-center gap-1 lg:flex">
            {siteLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--text-soft)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-main)]"
              >
                {item.label}
              </Link>
            ))}

            <span aria-hidden="true" className="mx-2 h-6 w-px bg-[var(--border-soft)]" />

            <Link href="/series/new" className="header-create-link">
              Создать сериал
            </Link>
            <Link href="/series" className="header-create-link">
              Новая серия
            </Link>
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <HeaderAuthActions />
          </div>
        </div>
      </header>
      <nav aria-label="Быстрое создание" className="mobile-create-actions lg:hidden">
        <Link href="/series/new" className="mobile-create-actions__link">
          Создать сериал
        </Link>
        <Link href="/series" className="mobile-create-actions__link">
          Новая серия
        </Link>
      </nav>
    </>
  );
}
