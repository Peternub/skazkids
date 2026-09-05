import Link from "next/link";

type OnboardingCardProps = {
  hasChildren: boolean;
  hasStories: boolean;
};

function StatusPill({ done }: { done: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        done
          ? "border border-[var(--border-strong)] bg-transparent text-[var(--accent-gold)]"
          : "border border-brand-300/30 bg-brand-900/70 text-brand-100"
      }`}
    >
      {done ? "Готово" : "Следующий шаг"}
    </span>
  );
}

export function OnboardingCard({
  hasChildren,
  hasStories
}: OnboardingCardProps) {
  return (
    <section className="mt-8 rounded-[2.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(26,13,43,0.88),rgba(49,21,93,0.78))] p-6 shadow-[0_20px_60px_rgba(9,5,16,0.35)] sm:p-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.22em] text-brand-200">
          Быстрый старт
        </p>
        <h2 className="text-3xl font-semibold text-white">
          Что сделать дальше
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-white/70">
          Два шага до первого вечернего сериала.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-white/10 bg-[#160a27] p-6 shadow-[0_12px_30px_rgba(9,5,16,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-brand-200">
                Шаг 1
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                Добавить ребенка
              </h3>
            </div>
            <StatusPill done={hasChildren} />
          </div>

          <p className="mt-4 text-base leading-7 text-white/72">
            Заполните профиль ребенка для персональных серий.
          </p>

          <Link
            href={hasChildren ? "/children" : "/children/new"}
            className="mt-6 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            {hasChildren ? "Открыть профили" : "Добавить ребенка"}
          </Link>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[#160a27] p-6 shadow-[0_12px_30px_rgba(9,5,16,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-brand-200">
                Шаг 2
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                Создать сериал
              </h3>
            </div>
            <StatusPill done={hasStories} />
          </div>

          <p className="mt-4 text-base leading-7 text-white/72">
            Задайте героев один раз, а потом каждый вечер создавайте продолжение одной кнопкой.
          </p>

          <Link
            href={hasStories ? "/series" : "/series/new"}
            className="mt-6 inline-flex rounded-full bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            {hasStories ? "Открыть сериалы" : "Создать первый сериал"}
          </Link>
        </article>
      </div>
    </section>
  );
}
