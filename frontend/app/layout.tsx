import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TastyBoard — Receitas compartilhadas",
  description: "Cadastre, descubra e compartilhe receitas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
