"use client";

import { FormEvent, useEffect, useState } from "react";

type Recipe = {
  id: number;
  title: string;
  description: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("Carregando receitas...");

  async function loadRecipes() {
    try {
      const response = await fetch(`${API_URL}/recipes`);
      if (!response.ok) throw new Error("Erro ao consultar receitas");

      const data: Recipe[] = await response.json();
      setRecipes(data);
      setMessage(`${data.length} receita(s)`);
    } catch {
      setMessage("Não foi possível acessar a API NestJS.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const response = await fetch(`${API_URL}/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    if (!response.ok) {
      setMessage("Não foi possível salvar a receita.");
      return;
    }

    setTitle("");
    setDescription("");
    await loadRecipes();
  }

  useEffect(() => {
    loadRecipes();
  }, []);

  return (
    <>
      <header>
        <h1>TastyBoard</h1>
        <p>Next.js conversando com uma API NestJS.</p>
      </header>

      <main>
        <form onSubmit={handleSubmit}>
          <h2>Nova receita</h2>
          <input
            placeholder="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <textarea
            placeholder="Descrição"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
          <button type="submit">Salvar receita</button>
        </form>

        <section>
          <h2>Receitas</h2>
          <p>{message}</p>
          {recipes.map((recipe) => (
            <article key={recipe.id}>
              <h3>{recipe.title}</h3>
              <p>{recipe.description}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
