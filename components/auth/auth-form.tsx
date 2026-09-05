"use client";

import Link from "next/link";
import { useActionState } from "react";

type AuthActionState = {
  error?: string;
  success?: string;
};

type AuthFormProps = {
  action: (
    state: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>;
  title: string;
  description: string;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  alternateText: string;
  showNameFields?: boolean;
  initialError?: string;
  recoveryHref?: string;
};

const inputClassName =
  "w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-4 py-3 text-base text-[var(--text-main)] placeholder:text-[var(--text-muted)] caret-[var(--text-main)] outline-none transition focus:border-[var(--border-strong)] focus:ring-4 focus:ring-[var(--accent-gold-soft)] sm:px-5 sm:py-4 sm:text-lg";

export function AuthForm({
  action,
  title,
  description,
  submitLabel,
  alternateHref,
  alternateLabel,
  alternateText,
  showNameFields = false,
  initialError,
  recoveryHref
}: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, {
    error: initialError
  });

  return (
    <div
      className="w-full max-w-3xl rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] p-5 backdrop-blur sm:p-10"
      style={{ boxShadow: "var(--glow-shadow)" }}
    >
      <div>
        <h1 className="text-3xl font-semibold text-[var(--text-main)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)] sm:mt-4 sm:text-lg sm:leading-8">
          {description}
        </p>
      </div>

      <form action={formAction} className="mt-7 space-y-4 sm:mt-10 sm:space-y-5">
        {showNameFields ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-3 block text-base font-medium text-[var(--text-main)]">
                Имя
              </span>
              <input
                className={inputClassName}
                type="text"
                name="firstName"
                required
              />
            </label>

            <label className="block">
              <span className="mb-3 block text-base font-medium text-[var(--text-main)]">
                Фамилия
              </span>
              <input
                className={inputClassName}
                type="text"
                name="lastName"
                required
              />
            </label>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-3 block text-base font-medium text-[var(--text-main)]">
            Email
          </span>
          <input
            className={inputClassName}
            type="email"
            name="email"
            required
          />
        </label>

        {recoveryHref ? (
          <div className="text-right">
            <Link className="text-sm font-medium text-[var(--logo-text)]" href={recoveryHref}>
              Забыли пароль?
            </Link>
          </div>
        ) : null}

        <label className="block">
          <span className="mb-3 block text-base font-medium text-[var(--text-main)]">
            Пароль
          </span>
          <input
            className={inputClassName}
            type="password"
            name="password"
            required
            minLength={8}
          />
        </label>

        {state.error ? (
          <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-lg border border-[var(--border-strong)] bg-transparent px-4 py-3 text-sm text-[var(--accent-gold)]">
            {state.success}
          </p>
        ) : null}

        <button
          className="w-full rounded-lg bg-[var(--button-dark)] px-4 py-4 text-lg font-semibold text-[var(--button-dark-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Подождите..." : submitLabel}
        </button>
      </form>

      <p className="mt-8 text-base text-[var(--text-soft)]">
        {alternateText}{" "}
        <Link className="font-semibold text-[var(--logo-text)]" href={alternateHref}>
          {alternateLabel}
        </Link>
      </p>
    </div>
  );
}
