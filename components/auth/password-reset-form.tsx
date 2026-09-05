"use client";

import { useActionState } from "react";

type AuthActionState = {
  error?: string;
  success?: string;
};

type PasswordResetFormProps = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  mode: "request" | "update";
};

const fieldClassName =
  "w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-secondary)] px-5 py-4 text-lg text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-strong)]";

export function PasswordResetForm({ action, mode }: PasswordResetFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {mode === "request" ? (
        <label className="block">
          <span className="mb-2 block font-medium text-[var(--text-main)]">Email</span>
          <input name="email" type="email" required className={fieldClassName} />
        </label>
      ) : (
        <>
          <label className="block">
            <span className="mb-2 block font-medium text-[var(--text-main)]">Новый пароль</span>
            <input name="password" type="password" required minLength={8} className={fieldClassName} />
          </label>
          <label className="block">
            <span className="mb-2 block font-medium text-[var(--text-main)]">Повторите пароль</span>
            <input name="passwordConfirm" type="password" required minLength={8} className={fieldClassName} />
          </label>
        </>
      )}

      {state.error ? <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-200">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg bg-transparent px-4 py-3 text-sm text-[var(--accent-gold)]">{state.success}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[var(--button-dark)] px-4 py-4 font-semibold text-[var(--button-dark-text)] disabled:opacity-70"
      >
        {isPending ? "Подождите..." : mode === "request" ? "Отправить ссылку" : "Сохранить пароль"}
      </button>
    </form>
  );
}
