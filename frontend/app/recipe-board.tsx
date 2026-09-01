"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import type { Category, Media, Recipe, User } from "@/lib/types";
import { RecipeEditor } from "./recipe-editor";
import { StarIcon, ShareIcon, EditIcon, TrashIcon, UploadIcon, YoutubeIcon } from "./icons";

type PendingMedia =
  | { id: string; kind: "file"; file: File; previewUrl: string; isVideo: boolean }
  | { id: string; kind: "youtube"; url: string };

export type { Recipe } from "@/lib/types";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
});

const recipeSchema = z.object({
  title: z.string().trim().min(2, "O título deve ter pelo menos 2 caracteres").max(120),
  ingredients: z.string().trim().min(1, "Informe ao menos um ingrediente (um por linha)"),
  instructions: z.string().trim().min(3, "O modo de preparo deve ter pelo menos 3 caracteres").max(20000),
});

function errorMessage(body: unknown) {
  if (typeof body === "object" && body && "message" in body) {
    const message = (body as { message: unknown }).message;
    return Array.isArray(message) ? message.join("; ") : String(message);
  }
  return "Não foi possível concluir a operação.";
}

function upsertRecipe(current: Recipe[], recipe: Recipe) {
  return [recipe, ...current.filter((item) => item.id !== recipe.id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id,
  );
}

function splitIngredients(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function RecipeBoard({ publicApiUrl }: { publicApiUrl: string }) {
  const base = publicApiUrl.replace(/\/$/, "");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [instructionsHtml, setInstructionsHtml] = useState("");
  const youtubeInputRef = useRef<HTMLInputElement>(null);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [message, setMessage] = useState("Entre na sua conta para ver as receitas.");
  const [authMessage, setAuthMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as User) : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      return;
    }
    fetch(`${base}/categories`, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<Category[]>) : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [base, user]);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    fetch("/api/favorites", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<Recipe[]>) : []))
      .then((favorites) => setFavoriteIds(new Set(favorites.map((recipe) => recipe.id))))
      .catch(() => setFavoriteIds(new Set()));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      return;
    }
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (categoryFilter.length) params.set("categoryIds", categoryFilter.join(","));

    const timeout = setTimeout(() => {
      fetch(`${base}/recipes${params.toString() ? `?${params}` : ""}`, { cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<Recipe[]>) : null))
        .then((data) => {
          if (data) {
            setRecipes(data);
            setMessage(data.length ? `${data.length} receita(s)` : "Nenhuma receita encontrada.");
          }
        })
        .catch(() => undefined);
    }, 300);

    return () => clearTimeout(timeout);
  }, [base, user, searchTerm, categoryFilter]);

  useEffect(() => {
    if (!user) return;
    const source = new EventSource(`${base}/recipes/events`);
    const onChanged = (event: MessageEvent) => {
      const recipe = JSON.parse(event.data) as Recipe;
      setRecipes((current) => upsertRecipe(current, recipe));
      setEditing((current) => (current && current.id === recipe.id ? recipe : current));
    };
    const onDeleted = (event: MessageEvent) => {
      const { id } = JSON.parse(event.data) as { id: number };
      setRecipes((current) => current.filter((recipe) => recipe.id !== id));
    };
    source.addEventListener("recipe.created", onChanged);
    source.addEventListener("recipe.updated", onChanged);
    source.addEventListener("recipe.deleted", onDeleted);
    return () => source.close();
  }, [base, user]);

  const showRecipeForm = formOpen || editing !== null;

  useEffect(() => {
    setInstructionsHtml(editing?.instructions ?? "");
  }, [editing?.id, formOpen]);

  useEffect(() => {
    setSelectedCategoryIds(editing?.categories.map((category) => category.id) ?? []);
  }, [editing?.id, formOpen]);

  useEffect(() => {
    if (!showRecipeForm) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRecipeForm();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showRecipeForm]);

  const canEdit = useMemo(
    () => (recipe: Recipe) => Boolean(user && (user.role === "ADMIN" || recipe.authorId === user.id)),
    [user],
  );

  const visibleRecipes = useMemo(
    () => (favoritesOnly ? recipes.filter((recipe) => favoriteIds.has(recipe.id)) : recipes),
    [recipes, favoritesOnly, favoriteIds],
  );

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const values = Object.fromEntries(form.entries());
    const parsed = (authMode === "register" ? registerSchema : loginSchema).safeParse(values);
    if (!parsed.success) {
      setAuthMessage(parsed.error.issues[0]?.message ?? "Revise os dados informados.");
      return;
    }

    const response = await fetch(`/api/auth/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const body = await response.json();
    if (!response.ok) {
      setAuthMessage(errorMessage(body));
      return;
    }
    setAuthMessage("");
    setUser(body as User);
    formElement.reset();
  }

  async function handleRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const parsed = recipeSchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? "Revise a receita.");
      return;
    }
    if (parsed.data.instructions.replace(/<[^>]*>/g, "").trim().length < 3) {
      setMessage("O modo de preparo deve ter pelo menos 3 caracteres.");
      return;
    }

    const payload = {
      title: parsed.data.title,
      ingredients: splitIngredients(parsed.data.ingredients),
      instructions: parsed.data.instructions,
      categoryIds: selectedCategoryIds,
    };
    if (!payload.ingredients.length) {
      setMessage("Informe ao menos um ingrediente.");
      return;
    }

    const response = await fetch(editing ? `/api/recipes/${editing.id}` : "/api/recipes", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(errorMessage(body));
      return;
    }

    let recipe = body as Recipe;
    setRecipes((current) => upsertRecipe(current, recipe));

    if (!editing && pendingMedia.length > 0) {
      setMessage("Receita cadastrada. Enviando mídias...");
      try {
        for (const item of pendingMedia) {
          recipe = item.kind === "file" ? await uploadMediaFile(recipe.id, item.file) : await uploadYoutubeMedia(recipe.id, item.url);
          setRecipes((current) => upsertRecipe(current, recipe));
        }
      } catch (error) {
        clearPendingMedia();
        setEditing(recipe);
        setMessage(error instanceof Error ? error.message : "Receita criada, mas houve um erro ao enviar as mídias.");
        return;
      }
    }

    if (editing) {
      setEditing(recipe);
      setMessage("Receita atualizada.");
    } else {
      setMessage("Receita cadastrada.");
      closeRecipeForm();
    }
  }

  async function removeRecipe(recipe: Recipe) {
    if (!window.confirm(`Excluir a receita "${recipe.title}"?`)) return;
    const response = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(errorMessage(body));
      return;
    }
    setRecipes((current) => current.filter((item) => item.id !== recipe.id));
    if (editing?.id === recipe.id) setEditing(null);
    setMessage("Receita excluída.");
  }

  async function toggleFavorite(recipe: Recipe) {
    if (!user) {
      setMessage("Entre na sua conta para favoritar receitas.");
      return;
    }
    const response = await fetch(`/api/recipes/${recipe.id}/favorite`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(errorMessage(body));
      return;
    }
    const { favorited, favoritesCount } = body as { favorited: boolean; favoritesCount: number };
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (favorited) next.add(recipe.id);
      else next.delete(recipe.id);
      return next;
    });
    setRecipes((current) => current.map((item) => (item.id === recipe.id ? { ...item, favoritesCount } : item)));
    setMessage(favorited ? "Receita adicionada aos favoritos." : "Receita removida dos favoritos.");
  }

  async function shareRecipe(recipe: Recipe) {
    const url = `${window.location.origin}/recipes/${recipe.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link da receita copiado.");
    } catch {
      setMessage(url);
    }
  }

  async function uploadMediaFile(recipeId: number, file: File): Promise<Recipe> {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/api/recipes/${recipeId}/media`, { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) throw new Error(errorMessage(body));
    return body as Recipe;
  }

  async function uploadYoutubeMedia(recipeId: number, url: string): Promise<Recipe> {
    const response = await fetch(`/api/recipes/${recipeId}/media/youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(errorMessage(body));
    return body as Recipe;
  }

  async function handleMediaUpload(recipe: Recipe, file: File) {
    setMessage("Enviando mídia...");
    try {
      const updated = await uploadMediaFile(recipe.id, file);
      setRecipes((current) => upsertRecipe(current, updated));
      setEditing(updated);
      setMessage("Mídia adicionada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar a mídia.");
    }
  }

  async function handleYoutubeAdd(recipe: Recipe) {
    const input = youtubeInputRef.current;
    const url = input?.value.trim() ?? "";
    if (!url) return;
    setMessage("Adicionando vídeo...");
    try {
      const updated = await uploadYoutubeMedia(recipe.id, url);
      setRecipes((current) => upsertRecipe(current, updated));
      setEditing(updated);
      if (input) input.value = "";
      setMessage("Vídeo adicionado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível adicionar o vídeo.");
    }
  }

  function addPendingFile(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setPendingMedia((current) => [
      ...current,
      { id: crypto.randomUUID(), kind: "file", file, previewUrl, isVideo: file.type.startsWith("video/") },
    ]);
  }

  function addPendingYoutube() {
    const input = youtubeInputRef.current;
    const url = input?.value.trim() ?? "";
    if (!url) return;
    setPendingMedia((current) => [...current, { id: crypto.randomUUID(), kind: "youtube", url }]);
    if (input) input.value = "";
  }

  function removePendingMedia(id: string) {
    setPendingMedia((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.kind === "file") URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function clearPendingMedia() {
    pendingMedia.forEach((item) => {
      if (item.kind === "file") URL.revokeObjectURL(item.previewUrl);
    });
    setPendingMedia([]);
  }

  async function removeMedia(recipe: Recipe, media: Media) {
    if (!window.confirm("Remover esta mídia da receita?")) return;
    const response = await fetch(`/api/recipes/${recipe.id}/media/${media.id}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(errorMessage(body));
      return;
    }
    const updated = body as Recipe;
    setRecipes((current) => upsertRecipe(current, updated));
    setEditing(updated);
    setMessage("Mídia removida.");
  }

  async function setPrimaryMedia(recipe: Recipe, media: Media) {
    const response = await fetch(`/api/recipes/${recipe.id}/media/${media.id}/primary`, { method: "PATCH" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(errorMessage(body));
      return;
    }
    const updated = body as Recipe;
    setRecipes((current) => upsertRecipe(current, updated));
    setEditing(updated);
    setMessage("Capa da receita atualizada.");
  }

  function toggleCategory(id: number) {
    setSelectedCategoryIds((current) =>
      current.includes(id) ? current.filter((categoryId) => categoryId !== id) : [...current, id],
    );
  }

  function toggleCategoryFilter(id: number) {
    setCategoryFilter((current) =>
      current.includes(id) ? current.filter((categoryId) => categoryId !== id) : [...current, id],
    );
  }

  function openNewRecipe() {
    clearPendingMedia();
    setEditing(null);
    setFormOpen(true);
  }

  function closeRecipeForm() {
    clearPendingMedia();
    setFormOpen(false);
    setEditing(null);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setEditing(null);
    setFormOpen(false);
    setMessage("Sessão encerrada.");
  }

  if (!authChecked) {
    return <main className="authPage" />;
  }

  return (
    <main className={user ? undefined : "authPage"}>
      {!user && (
        <form className="panel" onSubmit={handleAuth}>
          <span className="eyebrow">{authMode === "login" ? "Acesse sua conta" : "Crie sua conta"}</span>
          <h2>{authMode === "login" ? "Entrar" : "Cadastro"}</h2>
          {authMode === "register" && <input name="name" aria-label="Nome" placeholder="Nome" autoComplete="name" required />}
          <input name="email" type="email" aria-label="E-mail" placeholder="E-mail" autoComplete="email" required />
          <input name="password" type="password" aria-label="Senha" placeholder="Senha" autoComplete={authMode === "login" ? "current-password" : "new-password"} required />
          {authMode === "login" && (
            <Link className="linkButton" href="/forgot-password">Esqueci minha senha</Link>
          )}
          {authMessage && <p className="authMessage" role="alert">{authMessage}</p>}
          <button type="submit">{authMode === "login" ? "Entrar" : "Cadastrar"}</button>
          <button
            className="linkButton"
            type="button"
            onClick={() => {
              setAuthMessage("");
              setAuthMode(authMode === "login" ? "register" : "login");
            }}
          >
            {authMode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
          </button>
        </form>
      )}

      {user && (
        <>
          <div className="topBar">
            <div>
              <span className="eyebrow">Sessão ativa</span>
              <div><strong>{user.name}</strong> <span className="muted">{user.email}</span></div>
            </div>
            <div className="topBarActions">
              {user.role === "ADMIN" && (
                <Link className="linkButton" href="/categorias">Gerenciar categorias</Link>
              )}
              <button className="secondary" type="button" onClick={logout}>Sair</button>
            </div>
          </div>

          <section className="recipes" aria-live="polite">
            <div className="sectionHeading">
              <div>
                <span className="eyebrow">Atualização em tempo real</span>
                <h2>Receitas</h2>
              </div>
              <div className="sectionActions">
                <p className="status">{message}</p>
                <button type="button" onClick={openNewRecipe}>+ Nova receita</button>
              </div>
            </div>

            <div className="filterBar">
              <input
                type="search"
                aria-label="Buscar por nome ou ingrediente"
                placeholder="Buscar por nome ou ingrediente"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <label className="checkboxRow">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(event) => setFavoritesOnly(event.target.checked)}
                />
                Somente favoritos
              </label>
            </div>

            {categories.length > 0 && (
              <div className="tagFilterRow">
                <span className="fieldLabel">Categorias</span>
                <div className="tagPicker">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className={categoryFilter.includes(category.id) ? "tagChip active" : "tagChip"}
                    >
                      <input
                        type="checkbox"
                        checked={categoryFilter.includes(category.id)}
                        onChange={() => toggleCategoryFilter(category.id)}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="recipeGrid">
              {visibleRecipes.map((recipe) => (
                <article key={recipe.id}>
                  <div>
                    <div className="cardHeading">
                      {recipe.categories.map((category) => (
                        <span key={category.id} className="categoryBadge">{category.name}</span>
                      ))}
                      <span className="author">por {recipe.author?.name ?? "autor legado"}</span>
                    </div>
                    <h3><Link href={`/recipes/${recipe.id}`}>{recipe.title}</Link></h3>
                    {recipe.media[0] && (
                      <div className="cardMedia">
                        {recipe.media[0].type === "YOUTUBE" ? (
                          <iframe src={recipe.media[0].url} title="Vídeo do YouTube" allowFullScreen />
                        ) : recipe.media[0].type === "VIDEO" ? (
                          <video src={recipe.media[0].url} controls />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={recipe.media[0].url} alt={`Mídia da receita ${recipe.title}`} />
                        )}
                      </div>
                    )}
                    <p className="ingredientPreview">{recipe.ingredients.slice(0, 3).join(", ")}{recipe.ingredients.length > 3 ? "…" : ""}</p>
                    <div className="richText" dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
                  </div>
                  <div className="actions">
                    <button
                      className={favoriteIds.has(recipe.id) ? "iconButton favoriteButton active" : "iconButton favoriteButton"}
                      type="button"
                      aria-pressed={favoriteIds.has(recipe.id)}
                      aria-label={favoriteIds.has(recipe.id) ? `Remover dos favoritos (${recipe.favoritesCount})` : `Favoritar (${recipe.favoritesCount})`}
                      title="Favoritar"
                      onClick={() => toggleFavorite(recipe)}
                    >
                      <StarIcon filled={favoriteIds.has(recipe.id)} />
                      {recipe.favoritesCount > 0 && <span className="countBadge">{recipe.favoritesCount}</span>}
                    </button>
                    <button className="iconButton" type="button" aria-label="Compartilhar" title="Compartilhar" onClick={() => shareRecipe(recipe)}>
                      <ShareIcon />
                    </button>
                    {canEdit(recipe) && (
                      <>
                        <button className="iconButton" type="button" aria-label="Editar" title="Editar" onClick={() => setEditing(recipe)}>
                          <EditIcon />
                        </button>
                        <button className="iconButton danger" type="button" aria-label="Excluir" title="Excluir" onClick={() => removeRecipe(recipe)}>
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
              {!visibleRecipes.length && <div className="empty">Nenhuma receita encontrada.</div>}
            </div>
          </section>

          {showRecipeForm && (
            <div className="modalBackdrop" onClick={closeRecipeForm}>
              <form
                className="panel modal"
                onSubmit={handleRecipe}
                key={editing?.id ?? "new"}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modalHeader">
                  <div>
                    <span className="eyebrow">{editing ? "Editar receita" : "Compartilhe uma ideia"}</span>
                    <h2>{editing ? editing.title : "Nova receita"}</h2>
                  </div>
                  <button className="modalClose" type="button" onClick={closeRecipeForm} aria-label="Fechar">×</button>
                </div>
                <input name="title" aria-label="Título" placeholder="Título" defaultValue={editing?.title} required />
                <label className="fieldLabel" htmlFor="ingredients">Ingredientes (um por linha)</label>
                <textarea
                  id="ingredients"
                  name="ingredients"
                  aria-label="Ingredientes, um por linha"
                  placeholder={"200g de farinha\n2 ovos\n1 xícara de leite"}
                  defaultValue={editing?.ingredients.join("\n")}
                  required
                />
                <label className="fieldLabel" htmlFor="instructions">Modo de preparo</label>
                <RecipeEditor
                  key={editing?.id ?? "new"}
                  initialContent={editing?.instructions ?? ""}
                  onChange={setInstructionsHtml}
                />
                <input type="hidden" id="instructions" name="instructions" value={instructionsHtml} readOnly />
                <span className="fieldLabel">Categorias</span>
                {categories.length > 0 ? (
                  <div className="tagPicker">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className={selectedCategoryIds.includes(category.id) ? "tagChip active" : "tagChip"}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="mediaHint">Nenhuma categoria cadastrada ainda.</p>
                )}
                <div className="mediaManager">
                  <span className="fieldLabel">Mídias</span>
                  {!editing && (
                    <p className="mediaHint">
                      Adicione fotos ou um vídeo do YouTube agora — tudo é salvo junto com a receita.
                    </p>
                  )}
                  {editing && editing.media.length > 0 && (
                      <div className="mediaGrid">
                        {editing.media.map((media) => (
                          <div className="mediaThumb" key={media.id}>
                            {media.type === "YOUTUBE" ? (
                              <iframe src={media.url} title="Vídeo do YouTube" allowFullScreen />
                            ) : media.type === "VIDEO" ? (
                              <video src={media.url} controls />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={media.url} alt="Mídia da receita" />
                            )}
                            <div className="mediaThumbActions">
                              {media.isPrimary ? (
                                <span className="coverBadge">
                                  <StarIcon filled /> Capa
                                </span>
                              ) : (
                                <button
                                  className="mediaIconButton"
                                  type="button"
                                  disabled={media.type !== "IMAGE"}
                                  title={media.type !== "IMAGE" ? "Somente imagens podem ser capa" : "Definir como capa"}
                                  aria-label="Definir como capa"
                                  onClick={() => setPrimaryMedia(editing, media)}
                                >
                                  <StarIcon />
                                </button>
                              )}
                              <button
                                className="mediaIconButton danger"
                                type="button"
                                aria-label="Remover mídia"
                                title="Remover mídia"
                                onClick={() => removeMedia(editing, media)}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  {!editing && pendingMedia.length > 0 && (
                    <div className="mediaGrid">
                      {pendingMedia.map((item) => (
                        <div className="mediaThumb" key={item.id}>
                          {item.kind === "youtube" ? (
                            <div className="mediaThumbPlaceholder">
                              <YoutubeIcon />
                              <span>{item.url}</span>
                            </div>
                          ) : item.isVideo ? (
                            <video src={item.previewUrl} controls />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.previewUrl} alt="Pré-visualização da mídia" />
                          )}
                          <div className="mediaThumbActions">
                            <button
                              className="mediaIconButton danger"
                              type="button"
                              aria-label="Remover mídia"
                              title="Remover mídia"
                              onClick={() => removePendingMedia(item.id)}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mediaAddRow">
                    <label className="mediaDropzone">
                      <UploadIcon />
                      <span>Enviar imagem ou vídeo</span>
                      <input
                        type="file"
                        aria-label="Adicionar imagem ou vídeo"
                        accept="image/*,video/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            if (editing) void handleMediaUpload(editing, file);
                            else addPendingFile(file);
                          }
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <div className="youtubeForm">
                      <YoutubeIcon />
                      <input
                        type="url"
                        ref={youtubeInputRef}
                        placeholder="Link de um vídeo do YouTube"
                        aria-label="Link de vídeo do YouTube"
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          if (editing) void handleYoutubeAdd(editing);
                          else addPendingYoutube();
                        }}
                      />
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => (editing ? handleYoutubeAdd(editing) : addPendingYoutube())}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit">{editing ? "Salvar alterações" : "Salvar receita"}</button>
                {editing && <button className="secondary" type="button" onClick={closeRecipeForm}>Cancelar</button>}
              </form>
            </div>
          )}
        </>
      )}
    </main>
  );
}
