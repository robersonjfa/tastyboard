import { RecipeBoard } from "./recipe-board";

export default function Home() {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  return (
    <>
      <header className="hero">
        <span className="eyebrow">Receitas compartilhadas</span>
        <h1 className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={48} height={48} className="logoMark" />
          TastyBoard
        </h1>
        <p>Descubra, cadastre e mantenha suas receitas em um só lugar.</p>
      </header>
      <RecipeBoard publicApiUrl={publicApiUrl} />
    </>
  );
}
