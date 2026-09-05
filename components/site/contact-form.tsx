"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendContactRequest } from "@/app/actions/contact";

type ContactActionState = {
  error?: string;
  success?: string;
};

const initialState: ContactActionState = {};

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [state, formAction, isPending] = useActionState(
    sendContactRequest,
    initialState
  );

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    formRef.current?.reset();
    setIsSuccessVisible(true);

    const timer = window.setTimeout(() => {
      setIsSuccessVisible(false);
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      autoComplete="off"
      className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-card)] p-5 sm:p-8"
      style={{ boxShadow: "var(--glow-shadow)" }}
    >
      <div className="grid gap-4">
        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-soft)]">Имя</span>
          <input
            name="name"
            type="text"
            autoComplete="off"
            className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-main)] outline-none transition focus:border-[var(--border-strong)]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-soft)]">
            Как с вами связаться
          </span>
          <input
            name="contact"
            type="text"
            autoComplete="off"
            className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-main)] outline-none transition focus:border-[var(--border-strong)]"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--text-soft)]">Сообщение</span>
          <textarea
            name="message"
            autoComplete="off"
            rows={6}
            className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-main)] outline-none transition focus:border-[var(--border-strong)]"
          />
        </label>
      </div>

      {state?.error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {isSuccessVisible && state?.success ? (
        <p
          role="status"
          aria-live="polite"
          className="contact-success mt-6 flex min-h-[2.75rem] w-full items-center justify-center rounded-lg bg-transparent px-4 py-3 text-center text-sm text-[var(--accent-gold)]"
        >
          {state.success}
        </p>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className="mt-6 min-h-[2.75rem] w-full rounded-lg bg-[var(--button-dark)] px-4 py-3 text-sm font-medium text-[var(--button-dark-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Отправляем..." : "Отправить"}
        </button>
      )}
    </form>
  );
}
