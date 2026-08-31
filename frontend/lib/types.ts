export type Category = {
  id: number;
  name: string;
};

export type Media = {
  id: number;
  url: string;
  type: "IMAGE" | "VIDEO" | "YOUTUBE";
  isPrimary: boolean;
};

export type Recipe = {
  id: number;
  title: string;
  ingredients: string[];
  instructions: string;
  authorId: string | null;
  author: { id: string; name: string } | null;
  categories: Category[];
  media: Media[];
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};
