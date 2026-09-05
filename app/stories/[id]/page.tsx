import Link from "next/link";
import { notFound } from "next/navigation";
import { findStoryDetailsByUser } from "@/lib/data/stories";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pending: "В очереди",
  generating: "Генерация текста",
  completed: "Серия готова",
  failed: "Ошибка"
};

const statusClasses: Record<string, string> = {
  pending:
    "border border-[var(--border-strong)] bg-[var(--accent-gold-soft)] text-[var(--text-main)]",
  generating: "border border-amber-400/30 bg-amber-500/10 text-amber-200",
  completed: "border border-[var(--border-strong)] bg-transparent text-[var(--accent-gold)]",
  failed: "border border-red-400/30 bg-red-500/10 text-red-200"
};

type StoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StoryDetailsPage({ params }: StoryPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const story = await findStoryDetailsByUser(user.id, id);

  if (!story) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-6 sm:px-10 sm:py-10">
      <Link
        href={`/series/${story.series_id}`}
        className="text-sm font-medium text-[var(--logo-text)] transition hover:text-[var(--text-main)]"
      >
        Назад к библиотеке
      </Link>

      <section
        className="mt-5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 sm:mt-6 sm:p-8"
        style={{ boxShadow: "var(--glow-shadow)" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--logo-text)]">
              Персональная серия
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text-main)]">
              {story.title ?? "Новая серия"}
            </h1>
            <div className="mt-4 flex flex-col gap-2 text-sm text-[var(--text-soft)] sm:flex-row sm:items-center sm:gap-4">
              <p
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${statusClasses[story.status] ?? statusClasses.pending}`}
              >
                {statusLabels[story.status] ?? story.status}
              </p>
              <p>Создано: {new Date(story.created_at).toLocaleDateString("ru-RU")}</p>
            </div>
          </div>

        </div>

        <div className="mt-8 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)] p-5 text-sm text-[var(--text-main)]">
          <p className="font-medium text-[var(--logo-text)]">Тема дня</p>
          <p className="mt-2 text-[var(--text-soft)]">{story.theme}</p>
        </div>

        {story.error_message ? (
          <div className="mt-6 rounded-lg border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
            {story.error_message}
          </div>
        ) : null}

        {story.status === "generating" ? (
          <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
            Создаем текст серии. Обновите страницу чуть позже.
          </div>
        ) : null}

        {story.status === "completed" ? (
          <div className="mt-6 rounded-lg border border-[var(--border-strong)] bg-transparent px-5 py-4 text-sm text-[var(--accent-gold)]">
            Серия готова и сохранена в вашей библиотеке.
          </div>
        ) : null}

        <article className="mt-8 whitespace-pre-line text-base leading-8 text-[var(--text-main)]">
          {story.text_content ?? "Текст серии еще не готов."}
        </article>
      </section>
    </main>
  );
}
