"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(body.message ?? "Se o e-mail existir, enviamos um link de redefinição de senha.");
    setSent(true);
  }

  return (
    <>
      <header className="hero">
        <span className="eyebrow">Recuperação de acesso</span>
        <h1 className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={48} height={48} className="logoMark" />
          TastyBoard
        </h1>
        <p>Informe seu e-mail para receber um link de redefinição de senha.</p>
      </header>
      <main className="authPage">
        <form className="panel" onSubmit={handleSubmit}>
          <span className="eyebrow">Esqueci minha senha</span>
          <h2>Redefinir senha</h2>
          {sent ? (
            <p className="authMessage success" role="status">{message}</p>
          ) : (
            <>
              <input name="email" type="email" aria-label="E-mail" placeholder="E-mail" autoComplete="email" required />
              <button type="submit">Enviar link</button>
            </>
          )}
          <Link className="linkButton" href="/">Voltar para o login</Link>
        </form>
      </main>
    </>
  );
}
