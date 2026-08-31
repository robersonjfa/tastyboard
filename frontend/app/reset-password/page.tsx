"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password");
    const confirm = formData.get("confirm");
    if (password !== confirm) {
      setMessage("As senhas não coincidem.");
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.message ?? "Não foi possível redefinir a senha.");
      return;
    }
    setMessage(body.message ?? "Senha redefinida com sucesso.");
    setDone(true);
  }

  if (!token) {
    return (
      <form className="panel">
        <span className="eyebrow">Redefinição de senha</span>
        <h2>Link inválido</h2>
        <p className="authMessage" role="alert">Este link está incompleto ou expirado.</p>
        <Link className="linkButton" href="/forgot-password">Solicitar novo link</Link>
      </form>
    );
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <span className="eyebrow">Redefinição de senha</span>
      <h2>Nova senha</h2>
      {done ? (
        <>
          <p className="authMessage success" role="status">{message}</p>
          <Link className="linkButton" href="/">Ir para o login</Link>
        </>
      ) : (
        <>
          <input name="password" type="password" aria-label="Nova senha" placeholder="Nova senha" autoComplete="new-password" required minLength={8} />
          <input name="confirm" type="password" aria-label="Confirmar nova senha" placeholder="Confirmar nova senha" autoComplete="new-password" required minLength={8} />
          {message && <p className="authMessage" role="alert">{message}</p>}
          <button type="submit">Redefinir senha</button>
        </>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <header className="hero">
        <span className="eyebrow">Recuperação de acesso</span>
        <h1 className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={48} height={48} className="logoMark" />
          TastyBoard
        </h1>
        <p>Defina uma nova senha para sua conta.</p>
      </header>
      <main className="authPage">
        <Suspense fallback={<p className="status">Carregando…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </>
  );
}
