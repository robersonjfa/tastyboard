"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Category, User } from "@/lib/types";

function errorMessage(body: unknown) {
  if (typeof body === "object" && body && "message" in body) {
    const message = (body as { message: unknown }).message;
    return Array.isArray(message) ? message.join("; ") : String(message);
  }
  return "Não foi possível concluir a operação.";
}

export default function CategoriasPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as User) : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    fetch("/api/categories", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<Category[]>) : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("categoryName") ?? "").trim();
    if (name.length < 2) {
      setMessage("O nome da categoria deve ter pelo menos 2 caracteres.");
      return;
    }
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(errorMessage(body));
      return;
    }
    setCategories((current) => [...current, body as Category].sort((a, b) => a.name.localeCompare(b.name)));
    formElement.reset();
    setMessage("Categoria criada.");
  }

  async function renameCategory(category: Category, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (name.length < 2) {
      setMessage("O nome da categoria deve ter pelo menos 2 caracteres.");
      return;
    }
    const response = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(errorMessage(body));
      return;
    }
    setCategories((current) =>
      current.map((item) => (item.id === category.id ? (body as Category) : item)).sort((a, b) => a.name.localeCompare(b.name)),
    );
    setEditingId(null);
    setMessage("Categoria renomeada.");
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Remover a categoria "${category.name}"? Ela será removida das receitas que a usam.`)) return;
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json();
      setMessage(errorMessage(body));
      return;
    }
    setCategories((current) => current.filter((item) => item.id !== category.id));
    setMessage("Categoria removida.");
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <main className="authPage">
        <div className="panel">
          <p>Faça login para gerenciar categorias.</p>
          <Link className="linkButton" href="/">Voltar</Link>
        </div>
      </main>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="authPage">
        <div className="panel">
          <p>Apenas administradores podem gerenciar categorias.</p>
          <Link className="linkButton" href="/">Voltar</Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="topBar">
        <div>
          <span className="eyebrow">Administração</span>
          <h2>Categorias</h2>
        </div>
        <Link className="linkButton" href="/">Voltar para o board</Link>
      </div>

      <section className="recipes">
        <div className="sectionHeading">
          <div>
            <span className="eyebrow">Gerenciar tags</span>
            <h2>Categorias das receitas</h2>
          </div>
          <p className="status">{message}</p>
        </div>

        <form className="categoryAdminForm" onSubmit={createCategory}>
          <input
            type="text"
            name="categoryName"
            aria-label="Nome da nova categoria"
            placeholder="Nova categoria (ex.: Sobremesas)"
            minLength={2}
            maxLength={60}
            required
          />
          <button type="submit" className="secondary">Adicionar categoria</button>
        </form>

        {categories.length > 0 ? (
          <ul className="categoryAdminList">
            {categories.map((category) => (
              <li key={category.id} className={editingId === category.id ? "editing" : undefined}>
                {editingId === category.id ? (
                  <form className="categoryAdminForm" onSubmit={(event) => renameCategory(category, event)}>
                    <input
                      type="text"
                      name="name"
                      aria-label={`Renomear categoria ${category.name}`}
                      defaultValue={category.name}
                      minLength={2}
                      maxLength={60}
                      required
                      autoFocus
                    />
                    <button type="submit" className="secondary">Salvar</button>
                    <button type="button" className="linkButton" onClick={() => setEditingId(null)}>Cancelar</button>
                  </form>
                ) : (
                  <>
                    {category.name}
                    <span className="actions">
                      <button
                        type="button"
                        className="linkButton"
                        aria-label={`Renomear categoria ${category.name}`}
                        onClick={() => setEditingId(category.id)}
                      >
                        Renomear
                      </button>
                      <button
                        type="button"
                        className="linkButton"
                        aria-label={`Remover categoria ${category.name}`}
                        onClick={() => deleteCategory(category)}
                      >
                        ×
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">Nenhuma categoria cadastrada ainda.</p>
        )}
      </section>
    </main>
  );
}
