import Link from "next/link";

type StoryListItem = {
  id: string;
  title: string | null;
  theme: string;
  status: string;
  created_at: string;
};

type StoriesListProps = {
  stories: StoryListItem[];
};

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

export function StoriesList({ stories }: StoriesListProps) {
  if (stories.length === 0) {
    return (
      <div
        className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)] p-5 text-center sm:p-8"
        style={{ boxShadow: "var(--glow-shadow)" }}
      >
        <p className="text-lg font-medium text-[var(--text-main)]">Серий пока нет</p>
        <p className="mt-3 text-sm text-[var(--text-soft)]">
          Создайте первый сериал, а затем первую серию. Она сразу появится в библиотеке.
        </p>
        <Link
          href="/series/new"
          className="mt-6 inline-flex rounded-lg bg-[var(--button-dark)] px-5 py-3 text-sm font-medium text-[var(--button-dark-text)] transition hover:opacity-90"
        >
          Создать сериал
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {stories.map((story) => (
        <Link
          key={story.id}
          href={`/stories/${story.id}`}
          className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-card-alt)]"
          style={{ boxShadow: "var(--glow-shadow)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-main)]">
                {story.title ?? "Новая серия"}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-soft)]">Контекст: {story.theme}</p>
            </div>
            <div className="text-sm text-[var(--text-soft)]">
              <p
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClasses[story.status] ?? statusClasses.pending}`}
              >
                {statusLabels[story.status] ?? story.status}
              </p>
              <p className="mt-1">
                {new Date(story.created_at).toLocaleDateString("ru-RU")}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
