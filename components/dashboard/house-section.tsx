import type { ReactNode } from "react";
import Link from "next/link";

type HouseSectionProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  room: "cinema" | "gallery" | "study";
  title: string;
};

export function HouseSection({
  actions,
  children,
  description,
  eyebrow,
  room,
  title
}: HouseSectionProps) {
  return (
    <main className={`house-section house-section--${room}`}>
      <div className="house-section__workspace">
        <header className="house-section__header">
          <div className="house-section__heading">
            <Link href="/dashboard" className="house-section__home-link">
              <span aria-hidden="true">⌂</span>
              Вернуться в дом
            </Link>
            {eyebrow ? <p>{eyebrow}</p> : null}
            <h1>{title}</h1>
            {description ? <div>{description}</div> : null}
          </div>
          {actions ? <div className="house-section__actions">{actions}</div> : null}
        </header>

        <div className="house-section__body">{children}</div>
      </div>
    </main>
  );
}
