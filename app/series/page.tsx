import Link from "next/link";
import { HouseSection } from "@/components/dashboard/house-section";
import { SeriesTree, type TreeEpisode } from "@/components/stories/series-tree";
import { listSeriesByUser, type SeriesPreview } from "@/lib/data/series";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type SeriesPageProps = {
  searchParams: Promise<{ series?: string; view?: string }>;
};

function getPlannedEpisodes(series: SeriesPreview) {
  return series.planned_episodes;
}

function isComplete(series: SeriesPreview) {
  return series.status === "completed" || getCompletedEpisodes(series).length >= getPlannedEpisodes(series);
}

function getCompletedEpisodes(series: SeriesPreview) {
  return (series.stories ?? []).filter((episode) => episode.status === "completed");
}

export default async function SeriesPage({ searchParams }: SeriesPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const showCompleted = params.view === "completed";
  const seriesItems = await listSeriesByUser(user.id);
  const activeSeries = seriesItems.filter((series) => !isComplete(series));
  const completedSeries = seriesItems.filter(isComplete);
  const currentSeries =
    activeSeries.find((series) => series.id === params.series) ?? activeSeries[0] ?? null;

  return (
    <HouseSection
      room="cinema"
      title="Библиотека сериалов и серий"
      actions={
        <>
          <Link
            href={showCompleted ? "/series" : "/series?view=completed"}
            className="house-secondary-button"
          >
            {showCompleted ? "Текущий сериал" : `Коллекция · ${completedSeries.length}`}
          </Link>
          <Link href="/series/new" className="house-primary-button">Создать сериал</Link>
        </>
      }
    >
      {showCompleted ? (
        <section className="tree-collection" aria-labelledby="tree-collection-title">
          <div className="tree-section-heading">
            <div>
              <p>Коллекция</p>
              <h2 id="tree-collection-title">Завершённые сериалы</h2>
            </div>
            <span>{completedSeries.length}</span>
          </div>

          {completedSeries.length > 0 ? (
            <div className="tree-collection__grid">
              {completedSeries.map((series) => (
                <article key={series.id} className="tree-collection-card">
                  <SeriesTree
                    compact
                    title={series.title}
                    plannedEpisodes={getPlannedEpisodes(series)}
                    episodes={getCompletedEpisodes(series)}
                  />
                  <div className="tree-collection-card__copy">
                    <span>Завершён</span>
                    <h3>{series.title}</h3>
                    <p>{getPlannedEpisodes(series)} серий</p>
                    <Link href={`/series/${series.id}`}>Открыть сериал</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="tree-library-empty">
              <h2>Коллекция пока пуста</h2>
              <p>Завершённые деревья появятся здесь.</p>
              <Link href="/series" className="house-primary-button">К текущему сериалу</Link>
            </div>
          )}
        </section>
      ) : currentSeries ? (
        <>
          {activeSeries.length > 1 ? (
            <nav className="tree-active-list" aria-label="Сериалы в работе">
              <span>В работе</span>
              {activeSeries.map((series) => (
                <Link
                  key={series.id}
                  href={`/series?series=${series.id}`}
                  aria-current={series.id === currentSeries.id ? "page" : undefined}
                >
                  {series.title}
                </Link>
              ))}
            </nav>
          ) : null}

          <section className="tree-current" aria-labelledby="current-series-title">
            <header className="tree-current__header">
              <div>
                <p>Текущий сериал · {currentSeries.children?.[0]?.name ?? "Личная история"}</p>
                <h2 id="current-series-title">{currentSeries.title}</h2>
              </div>
              <div className="tree-progress" aria-label="Прогресс сериала">
                <strong>{getCompletedEpisodes(currentSeries).length}</strong>
                <span>из {getPlannedEpisodes(currentSeries)} серий</span>
              </div>
            </header>

            <SeriesTree
              title={currentSeries.title}
              plannedEpisodes={getPlannedEpisodes(currentSeries)}
              episodes={getCompletedEpisodes(currentSeries)}
            />

            <footer className="tree-current__footer">
              <span>{getPlannedEpisodes(currentSeries) - getCompletedEpisodes(currentSeries).length} ветвей ждут продолжения</span>
              <Link href={`/series/${currentSeries.id}`} className="house-primary-button">
                Новая серия
              </Link>
            </footer>
          </section>
        </>
      ) : (
        <section className="tree-library-empty">
          <div className="tree-library-empty__seed" aria-hidden="true"><span /></div>
          <h2>{completedSeries.length > 0 ? "Все сериалы завершены" : "Посадите первое дерево"}</h2>
          <p>{completedSeries.length > 0 ? "Создайте новый сериал или откройте коллекцию." : "Выберите 8–16 серий — столько ветвей появится у дерева."}</p>
          <div>
            <Link href="/series/new" className="house-primary-button">Создать сериал</Link>
            {completedSeries.length > 0 ? (
              <Link href="/series?view=completed" className="house-secondary-button">Открыть коллекцию</Link>
            ) : null}
          </div>
        </section>
      )}
    </HouseSection>
  );
}
