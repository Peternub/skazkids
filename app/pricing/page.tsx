import Link from "next/link";
import { SeriesSubscriptionNotice } from "@/components/billing/series-subscription-notice";
import { PricingTabs } from "@/components/site/pricing-tabs";
import { SERIES_CREATION_NOTICE } from "@/lib/billing/series-access";

type PricingPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-[96rem] flex-col px-4 py-6 sm:px-10 sm:py-10">
      {params.notice === SERIES_CREATION_NOTICE ? <SeriesSubscriptionNotice /> : null}
      <section className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 text-[var(--text-main)] sm:p-10">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--logo-text)]">Тарифы</p>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl">
          Безлимитные персональные серии
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--text-soft)]">
          Выберите обычную или премиальную модель и создавайте столько серий,
          сколько хочется.
        </p>
      </section>

      <section className="mt-10">
        <PricingTabs />
      </section>

      <div className="mt-10">
        <Link
          href="/billing"
          className="inline-flex rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)] px-5 py-3 text-sm font-medium text-[var(--text-main)]"
        >
          Открыть кабинет тарифов
        </Link>
      </div>
    </main>
  );
}
