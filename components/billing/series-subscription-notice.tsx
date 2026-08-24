"use client";

import { useState } from "react";
import { StarterOfferButton } from "@/components/billing/starter-offer-button";

export function SeriesSubscriptionNotice() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-subscription-notice-title"
        className="relative w-full max-w-xl rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] p-6 text-center shadow-2xl sm:p-8"
      >
        <button
          type="button"
          aria-label="Закрыть уведомление"
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-3 flex h-10 w-10 items-center justify-center rounded-full text-3xl leading-none text-[var(--text-soft)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--text-main)]"
        >
          ×
        </button>

        <h2
          id="series-subscription-notice-title"
          className="pr-8 font-display text-2xl text-[var(--text-main)] sm:text-3xl"
        >
          Сначала выберите способ доступа
        </h2>
        <p className="mt-5 text-base leading-7 text-[var(--text-soft)] sm:text-lg">
          Перед тем, как создать сериал, надо оформить ежемесячную подписку, или воспользоваться специальным предложением
        </p>

        <div className="mx-auto mt-6 max-w-xs">
          <StarterOfferButton />
        </div>
      </section>
    </div>
  );
}
