import Link from "next/link";
import { SeriesSubscriptionNotice } from "@/components/billing/series-subscription-notice";
import { HouseSection } from "@/components/dashboard/house-section";
import { PricingTabs } from "@/components/site/pricing-tabs";
import { SERIES_CREATION_NOTICE } from "@/lib/billing/series-access";
import {
  getBillingOverview,
  type SubscriptionPlanPreview
} from "@/lib/data/billing";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  active: "Активен",
  canceled: "Отменён",
  expired: "Завершён",
  past_due: "Требуется оплата",
  pending: "Ожидает подключения"
};

function getPlan(relation: unknown): SubscriptionPlanPreview | null {
  const value = Array.isArray(relation) ? relation[0] : relation;

  if (!value || typeof value !== "object" || !("name" in value)) {
    return null;
  }

  return value as SubscriptionPlanPreview;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Не указана";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

type BillingPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams;
  const user = await requireUser();
  const { subscription, storiesUsed } = await getBillingOverview(user.id);
  const plan = getPlan(subscription?.subscription_plans);
  const usedCount = storiesUsed;
  const storiesLimit = plan?.stories_limit ?? 0;
  const usagePercent = storiesLimit > 0 ? Math.min((usedCount / storiesLimit) * 100, 100) : 0;

  return (
    <HouseSection
      room="study"
      eyebrow="Домашний кабинет"
      title="Тариф и управление тарифом"
    >
      {params.notice === SERIES_CREATION_NOTICE ? <SeriesSubscriptionNotice /> : null}
      <section className="billing-vault" aria-labelledby="current-plan-title">
        <div className="billing-vault__safe" aria-hidden="true">
          <div className="billing-vault__door"><span /></div>
          <div className="billing-vault__inside">
            <span>MS</span>
            <span />
            <span />
          </div>
        </div>

        <article className="house-panel billing-current-plan">
          {subscription && plan ? (
            <>
              <div className="billing-current-plan__topline">
                <div>
                  <p>Текущий тариф</p>
                  <h2 id="current-plan-title">{plan.name}</h2>
                </div>
                <span className={`billing-status billing-status--${subscription.status}`}>
                  {statusLabels[subscription.status] ?? subscription.status}
                </span>
              </div>

              <div className="billing-current-plan__price">
                <strong>{plan.price_rub.toLocaleString("ru-RU")} ₽</strong>
                <span>в месяц</span>
              </div>
              {plan.description ? <p>{plan.description}</p> : null}

              <dl className="billing-facts">
                <div>
                  <dt>Период начался</dt>
                  <dd>{formatDate(subscription.started_at)}</dd>
                </div>
                <div>
                  <dt>Следующая дата</dt>
                  <dd>{formatDate(subscription.current_period_end)}</dd>
                </div>
                <div>
                  <dt>Оплата</dt>
                  <dd>{subscription.external_subscription_id ? "YooKassa подключена" : "Не подключена"}</dd>
                </div>
              </dl>

              <div className="billing-usage">
                <div>
                  <span>Использование серий</span>
                  <strong>
                    {storiesLimit > 0 ? `${usedCount} из ${storiesLimit}` : `${usedCount} · без лимита`}
                  </strong>
                </div>
                <div className="billing-usage__track">
                  <span style={{ width: storiesLimit > 0 ? `${usagePercent}%` : "100%" }} />
                </div>
              </div>

              <div className="billing-current-plan__actions">
                <Link href="#plans" className="house-primary-button">Изменить тариф</Link>
                <button type="button" className="house-secondary-button" disabled>
                  Управление оплатой скоро
                </button>
              </div>
              <p className="billing-cancel-note">
                Отмена — после подключения оплаты.
              </p>
            </>
          ) : (
            <div className="billing-no-plan">
              <p>Сейф открыт</p>
              <h2 id="current-plan-title">Тариф пока не выбран</h2>
              <Link href="#plans" className="house-primary-button">Посмотреть варианты</Link>
            </div>
          )}
        </article>
      </section>

      <section id="plans" className="house-panel billing-plans">
        <div className="billing-plans__heading">
          <p>Варианты</p>
          <h2>Доступные тарифы</h2>
        </div>
        <PricingTabs variant="billing" />
      </section>
    </HouseSection>
  );
}
