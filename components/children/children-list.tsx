import Link from "next/link";
import { deleteChild } from "@/app/actions/children";
import { MAX_CHILD_PROFILES } from "@/lib/config/children";
import type { ChildRecord } from "@/lib/types/database";

type ChildrenListProps = {
  childrenItems: ChildRecord[];
};

function formatGenderLabel(gender?: ChildRecord["gender"]) {
  if (gender === "girl") {
    return "Девочка";
  }

  if (gender === "boy") {
    return "Мальчик";
  }

  return "Не указан";
}

function formatAge(age: number) {
  const lastTwo = age % 100;
  const last = age % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${age} лет`;
  }

  if (last === 1) {
    return `${age} год`;
  }

  if (last >= 2 && last <= 4) {
    return `${age} года`;
  }

  return `${age} лет`;
}

function AddChildLink() {
  return (
    <Link href="/children/new" className="child-add-link" aria-label="Добавить профиль ребёнка">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 15V85M15 50H85" />
      </svg>
    </Link>
  );
}

export function ChildrenList({ childrenItems }: ChildrenListProps) {
  if (childrenItems.length === 0) {
    return (
      <div className="child-profiles-empty">
        <AddChildLink />
      </div>
    );
  }

  return (
    <div className="child-profiles-grid">
      {childrenItems.map((child) => (
        <article key={child.id} className="child-profile">
          <h2>{formatGenderLabel(child.gender)} {child.name}</h2>
          <div className="child-parchment">
            <dl className="child-parchment__facts">
              <div>
                <dt>Возраст</dt>
                <dd>{formatAge(child.age)}</dd>
              </div>
              <div>
                <dt>Интересы</dt>
                <dd>{child.interests || "Пока не указаны"}</dd>
              </div>
              <div>
                <dt>Друзья и близкие</dt>
                <dd>{child.additional_context || "Пока не указаны"}</dd>
              </div>
              {child.fears ? (
                <div>
                  <dt>Что важно учитывать</dt>
                  <dd>{child.fears}</dd>
                </div>
              ) : null}
            </dl>

            <div className="family-profile__actions">
              <Link
                href={`/children/${child.id}`}
                className="house-primary-button"
              >
                Открыть профиль
              </Link>

              <form action={deleteChild}>
                <input type="hidden" name="childId" value={child.id} />
                <button
                  type="submit"
                  className="family-profile__delete"
                >
                  Удалить
                </button>
              </form>
            </div>
          </div>
        </article>
      ))}

      {childrenItems.length < MAX_CHILD_PROFILES ? (
        <AddChildLink />
      ) : null}
    </div>
  );
}
