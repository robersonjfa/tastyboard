import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { backendUrl } from "@/lib/backend";
import type { Recipe } from "@/lib/types";

async function loadRecipe(id: string): Promise<Recipe | null> {
  try {
    const response = await fetch(backendUrl(`/recipes/${encodeURIComponent(id)}`), {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as Recipe;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: PageProps<"/recipes/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const recipe = await loadRecipe(id);
  if (!recipe) return { title: "Receita não encontrada — TastyBoard" };
  return {
    title: `${recipe.title} — TastyBoard`,
    description: recipe.instructions.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160),
  };
}

export default async function RecipePage(props: PageProps<"/recipes/[id]">) {
  const { id } = await props.params;
  const recipe = await loadRecipe(id);
  if (!recipe) notFound();

  return (
    <main className="recipeDetail">
      <Link className="linkButton" href="/">
        ← Voltar para o mural
      </Link>

      <article className="detailCard">
        <div className="detailHeading">
          {recipe.categories.map((category) => (
            <span key={category.id} className="categoryBadge">{category.name}</span>
          ))}
          <span className="author">por {recipe.author?.name ?? "autor legado"}</span>
        </div>
        <h1>{recipe.title}</h1>
        <p className="status">{recipe.favoritesCount} favorito(s)</p>

        {recipe.media.length > 0 && (
          <div className="mediaGrid">
            {recipe.media.map((media) =>
              media.type === "YOUTUBE" ? (
                <iframe key={media.id} src={media.url} title="Vídeo do YouTube" allowFullScreen />
              ) : media.type === "VIDEO" ? (
                <video key={media.id} src={media.url} controls />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={media.id} src={media.url} alt={`Mídia da receita ${recipe.title}`} />
              ),
            )}
          </div>
        )}

        <section>
          <h2>Ingredientes</h2>
          <ul className="ingredientList">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Modo de preparo</h2>
          <div className="instructions richText" dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
        </section>
      </article>
    </main>
  );
}
