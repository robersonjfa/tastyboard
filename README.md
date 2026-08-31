# TastyBoard

O TastyBoard é uma aplicação full stack para cadastrar, editar, consultar e compartilhar receitas. O sistema combina uma interface Next.js renderizada no servidor com uma API NestJS, autenticação JWT, eventos em tempo real por SSE e persistência PostgreSQL mapeada pelo Prisma.

## Recursos

- Cadastro e login de usuários;
- Senhas protegidas com hash bcrypt e nunca retornadas pela API;
- Recuperação de senha por e-mail (Resend), com token de uso único e expiração de 1 hora;
- Sessão JWT armazenada pelo frontend em cookie `HttpOnly`;
- CRUD de usuários com autorização de proprietário ou administrador;
- Cadastro de receitas com título, ingredientes e modo de preparo, com autorização de autor ou administrador;
- Modo de preparo com editor de texto rico (negrito, itálico, tachado, listas e citação), usando Tiptap; o HTML é sanitizado no backend antes de ser salvo;
- Categorias gerenciáveis por administradores (criar/remover), usadas para classificar e filtrar receitas;
- Upload de mídias (imagens e vídeos) associadas à receita, armazenadas no Cloudinary, com escolha de imagem de capa para o preview na listagem;
- Busca e filtros de receitas por nome, ingrediente ou categoria;
- Favoritos: usuários autenticados podem salvar receitas preferidas;
- Compartilhamento por link direto de cada receita (`/recipes/:id`), com metadados para pré-visualização;
- Design responsivo e acessível, com `:focus-visible` em todos os elementos interativos;
- Listagem de receitas visível apenas para usuários autenticados (nada é buscado nem exibido antes do login);
- Atualização de receitas em tempo real via Server-Sent Events (SSE), ativa somente após o login;
- Validação no backend com `class-validator` e no frontend/configuração com Zod;
- Limitação de requisições global e limites mais restritos para login/cadastro;
- Health check com verificação da conexão PostgreSQL;
- Configuração para deploy separado de frontend e backend na Vercel.

## Arquitetura

```mermaid
flowchart LR
    U[Usuário] --> N[Next.js SSR + BFF]
    N -->|JWT em Bearer| A[NestJS API]
    U -->|EventSource| A
    A --> P[Prisma ORM]
    P --> D[(PostgreSQL)]
    A -->|SSE: create/update/delete| U
```

O Next.js atua também como BFF: recebe login e cadastro, guarda o JWT em cookie `HttpOnly` e encaminha as mutações autenticadas à API. Assim, o token não fica disponível ao JavaScript do navegador.

## Tecnologias

### Frontend

- Next.js 16 e App Router;
- React 19;
- TypeScript;
- Zod 4;
- Tiptap 3 (`@tiptap/react`, `@tiptap/starter-kit`) para o editor de texto rico do modo de preparo;
- SSR e Route Handlers.

### Backend

- NestJS 11;
- Prisma 7.10 com adapter PostgreSQL;
- PostgreSQL 16+;
- JWT;
- bcrypt;
- RxJS/SSE;
- `class-validator`;
- `sanitize-html` para sanitizar o HTML do modo de preparo antes de persistir;
- Zod para validação das variáveis de ambiente.

## Modelo de dados

Todas as tabelas de domínio estão declaradas em `backend/prisma/schema.prisma` e possuem migrações versionadas.

### `User`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | `String` | Identificador CUID e chave primária. |
| `name` | `String` | Nome público do usuário. |
| `email` | `String` | Único e normalizado em minúsculas. |
| `passwordHash` | `String` | Hash bcrypt; a senha em texto puro nunca é persistida. |
| `role` | `Role` | `USER` ou `ADMIN`. |
| `createdAt` | `DateTime` | Data de criação. |
| `updatedAt` | `DateTime` | Atualizado automaticamente pelo Prisma. |

### `Recipe`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | `Int` | Identificador autoincremental. |
| `title` | `String` | Título da receita. |
| `ingredients` | `String[]` | Lista de ingredientes. |
| `instructions` | `String` | Modo de preparo. |
| `authorId` | `String?` | Chave estrangeira para `User`. É opcional para compatibilidade com registros legados. |
| `createdAt` | `DateTime` | Data de criação. |
| `updatedAt` | `DateTime` | Atualizado automaticamente pelo Prisma. |

Ao excluir um usuário, suas receitas são mantidas e passam a ter autor nulo (`ON DELETE SET NULL`).

### `Category`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | `Int` | Identificador autoincremental. |
| `name` | `String` | Nome único da categoria. |
| `createdAt` | `DateTime` | Data de criação. |

Uma receita pode ter **múltiplas** categorias (tags) e uma categoria pode estar associada a várias receitas. A relação é modelada como muitos-para-muitos explícita através da tabela `RecipeCategory` (join table), em vez de uma coluna `categoryId` única em `Recipe`:

| Campo (`RecipeCategory`) | Tipo | Observação |
| --- | --- | --- |
| `recipeId` | `Int` | Chave estrangeira para `Recipe` (`ON DELETE CASCADE`). Parte da chave primária composta. |
| `categoryId` | `Int` | Chave estrangeira para `Category` (`ON DELETE CASCADE`). Parte da chave primária composta. |
| `createdAt` | `DateTime` | Data de criação da associação. |

Ao excluir uma receita ou uma categoria, as linhas de associação correspondentes em `RecipeCategory` são removidas em cascata automaticamente — nunca ficam associações órfãs.

### `Media`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | `Int` | Identificador autoincremental. |
| `url` | `String` | URL segura (`secure_url`) retornada pelo Cloudinary. |
| `publicId` | `String` | Identificador do arquivo no Cloudinary, usado para exclusão. |
| `type` | `MediaType` | `IMAGE` ou `VIDEO`. |
| `isPrimary` | `Boolean` | Marca a mídia usada como capa da receita (padrão `false`). Apenas uma mídia por receita pode ser `true`. |
| `recipeId` | `Int` | Chave estrangeira para `Recipe` (`ON DELETE CASCADE`). |
| `createdAt` | `DateTime` | Data de criação. |

A primeira mídia enviada para uma receita é marcada `isPrimary` automaticamente. O usuário pode trocar a capa a qualquer momento pelo endpoint `PATCH /recipes/:id/media/:mediaId/primary`, que desmarca as demais mídias da receita em uma transação. Se a mídia marcada como capa for removida, a mídia restante mais antiga (`id` menor) é promovida a capa automaticamente — a receita nunca fica sem capa enquanto houver alguma mídia. As mídias são sempre retornadas ordenadas com a capa em primeiro lugar (`orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }]`), então a listagem de receitas usa a primeira mídia do array como preview do card sem precisar de lógica adicional no frontend.

### `Favorite`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | `Int` | Identificador autoincremental. |
| `userId` | `String` | Chave estrangeira para `User` (`ON DELETE CASCADE`). |
| `recipeId` | `Int` | Chave estrangeira para `Recipe` (`ON DELETE CASCADE`). |
| `createdAt` | `DateTime` | Data de criação. |

Par `(userId, recipeId)` é único: cada usuário favorita uma receita no máximo uma vez.

### `PasswordResetToken`

| Campo | Tipo | Observação |
| --- | --- | --- |
| `id` | `String` | Identificador (`cuid`). |
| `tokenHash` | `String` | Hash SHA-256 do token enviado por e-mail (o token em texto puro nunca é persistido). |
| `userId` | `String` | Chave estrangeira para `User` (`ON DELETE CASCADE`). |
| `expiresAt` | `DateTime` | Expira 1 hora após a criação. |
| `usedAt` | `DateTime?` | Preenchido quando o token é consumido; tokens usados não podem ser reaproveitados. |
| `createdAt` | `DateTime` | Data de criação. |

Ao solicitar um novo link, tokens anteriores não usados do mesmo usuário são invalidados.

## Estrutura

```text
tastyboard/
├── backend/
│   ├── api/index.ts             # Entrada serverless para a Vercel
│   ├── prisma/                  # Schema, migrações e seed de categorias
│   ├── src/auth/                # Cadastro, login, JWT e guard
│   ├── src/categories/          # CRUD de categorias
│   ├── src/cloudinary/          # Integração de upload com o Cloudinary
│   ├── src/database/            # PrismaService
│   ├── src/events/              # Barramento de eventos SSE compartilhado
│   ├── src/favorites/           # Favoritar/desfavoritar receitas
│   ├── src/recipes/             # CRUD de receitas, mídias e eventos SSE
│   ├── src/users/               # CRUD de usuários
│   └── test/                    # Teste E2E
└── frontend/
    ├── app/api/                 # BFF para autenticação, mídias e favoritos
    ├── app/page.tsx             # Página inicial (hero + board, sem listagem antes do login)
    ├── app/recipe-board.tsx     # Interface interativa e cliente SSE (pós-login)
    ├── app/recipes/[id]/        # Página de detalhe/compartilhamento
    ├── app/forgot-password/     # Solicitação de link de redefinição de senha
    ├── app/reset-password/      # Definição de nova senha a partir do token
    └── lib/backend.ts           # Comunicação segura com a API
```

## Pré-requisitos

- Node.js 22.12 ou superior;
- npm;
- PostgreSQL 16 ou superior.

## Instalação

```bash
git clone https://github.com/robersonjfa/tastyboard.git
cd tastyboard

cd backend
npm install

cd ../frontend
npm install
```

## Configuração local

Copie os arquivos de exemplo:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Variáveis do backend:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tastyboard?schema=public
JWT_SECRET=troque-por-uma-chave-aleatoria-com-no-minimo-32-caracteres
CORS_ORIGIN=http://localhost:3000
PORT=3001
NODE_ENV=development

# Necessárias apenas para upload de mídias (imagens/vídeos) nas receitas.
# Sem elas, o app funciona normalmente, mas o upload retorna erro 503.
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Envio do e-mail de redefinição de senha via Resend (resend.com).
# Sem RESEND_API_KEY, o link de redefinição é apenas logado no console do
# backend em vez de enviado por e-mail — útil para testar o fluxo em dev.
# RESEND_API_KEY=
RESEND_FROM_EMAIL=TastyBoard <onboarding@resend.dev>
FRONTEND_URL=http://localhost:3000
```

Variáveis do frontend:

```env
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

`API_URL` é usado no SSR e nos Route Handlers. `NEXT_PUBLIC_API_URL` é exposto ao navegador e usado apenas após o login: abertura do canal SSE e buscas/filtros de receitas e categorias, feitos diretamente do cliente para a API (liberados via CORS). Antes do login nenhuma receita é buscada nem exibida — a home não faz fetch de `/recipes` no SSR.

## Banco de dados

Gere o cliente e aplique as migrações:

```bash
cd backend
npm run prisma:generate
npm run prisma:deploy
```

Em desenvolvimento local, uma nova migração pode ser criada com:

```bash
npm run prisma:migrate -- --name nome_da_migracao
```

Após aplicar as migrações, popule as categorias padrão (idempotente, pode ser rodado novamente sem duplicar registros):

```bash
npm run prisma:seed
```

Não execute `prisma migrate dev` em produção; use `prisma migrate deploy`.

## Executando

Terminal do backend:

```bash
cd backend
npm run start:dev
```

Terminal do frontend:

```bash
cd frontend
npm run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`

## Endpoints

### Autenticação

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Público | Cria um usuário e retorna um JWT. |
| `POST` | `/auth/login` | Público | Valida e-mail/senha e retorna um JWT. |
| `POST` | `/auth/forgot-password` | Público | Gera um token de redefinição e envia por e-mail (via Resend, se configurado). Sempre responde com sucesso genérico, mesmo se o e-mail não existir. |
| `POST` | `/auth/reset-password` | Público | Troca a senha a partir de um token válido, não usado e não expirado (expira em 1h, uso único). |
| `GET` | `/auth/me` | JWT | Retorna o usuário da sessão. |

### Usuários

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/users` | Admin | Lista usuários sem hashes de senha. |
| `GET` | `/users/:id` | Próprio/Admin | Consulta um usuário. |
| `PATCH` | `/users/:id` | Próprio/Admin | Atualiza nome, e-mail e/ou senha. |
| `DELETE` | `/users/:id` | Próprio/Admin | Exclui um usuário. |

A criação de usuário é feita por `POST /auth/register`, completando o CRUD sem disponibilizar um endpoint administrativo que aceite senha sem autenticação.

### Receitas

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/recipes?search=&categoryIds=` | Público | Lista receitas, com busca por título/ingrediente e filtro por categorias (`categoryIds` aceita múltiplos IDs separados por vírgula, ex.: `categoryIds=1,3`). |
| `GET` | `/recipes/:id` | Público | Consulta uma receita. |
| `POST` | `/recipes` | JWT | Cria uma receita para o usuário autenticado. |
| `PATCH` | `/recipes/:id` | Autor/Admin | Atualiza uma receita. |
| `DELETE` | `/recipes/:id` | Autor/Admin | Exclui uma receita. |
| `GET` | `/recipes/events` | Público/SSE | Publica eventos de criação, atualização e exclusão. |
| `POST` | `/recipes/:id/media` | Autor/Admin | Envia (`multipart/form-data`, campo `file`) uma imagem ou vídeo para o Cloudinary e associa à receita. Limite de 15MB. |
| `DELETE` | `/recipes/:id/media/:mediaId` | Autor/Admin | Remove uma mídia da receita e do Cloudinary. |
| `PATCH` | `/recipes/:id/media/:mediaId/primary` | Autor/Admin | Define a mídia como capa da receita (desmarca as demais). |
| `POST` | `/recipes/:id/favorite` | JWT | Alterna (favorita/desfavorita) a receita para o usuário autenticado. |

### Categorias

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/categories` | Público | Lista categorias disponíveis. |
| `POST` | `/categories` | Admin | Cria uma categoria. |
| `PATCH` | `/categories/:id` | Admin | Renomeia uma categoria. |
| `DELETE` | `/categories/:id` | Admin | Remove uma categoria (as associações em `RecipeCategory` são removidas em cascata; as receitas continuam existindo, apenas perdem essa tag). |

### Favoritos

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/favorites` | JWT | Lista as receitas favoritadas pelo usuário autenticado. |

### Operação

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/health` | Valida a API e a conexão com o PostgreSQL. |

Nas rotas protegidas, envie `Authorization: Bearer <token>`.

## SSR, SSE e validação

- A página inicial é um Server Component dinâmico e carrega receitas no servidor a cada requisição;
- Após a hidratação, o navegador mantém a lista sincronizada pelo endpoint SSE;
- Zod valida formulários de cadastro, login e receitas antes do envio;
- O backend repete a validação com DTOs, pois validação do navegador não substitui validação de servidor;
- As variáveis obrigatórias do backend são verificadas com Zod durante a inicialização.

O canal SSE usa memória da instância NestJS. Em funções serverless da Vercel, a conexão pode ser encerrada pelo limite de execução e o `EventSource` a reabre automaticamente. Para múltiplas instâncias e garantia de entrega, substitua o `Subject` local por Redis Pub/Sub, Ably ou serviço equivalente.

## Testes e qualidade

```bash
cd backend
npm test       # E2E: banco, hash, JWT, CRUD e autorização
npm run build

cd ../frontend
npm run build  # Build, TypeScript e rotas SSR
```

Os testes E2E usam o PostgreSQL configurado em `backend/.env` e removem os dados temporários ao terminar.

## Deploy na Vercel

O monorepo deve ser publicado como dois projetos Vercel ligados ao mesmo repositório.

### Backend

- Root Directory: `backend`;
- Runtime: Node.js 22;
- Variáveis: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` e `NODE_ENV=production`;
- Antes do primeiro tráfego, execute `npm run prisma:deploy` com a URL do banco de produção.

Em ambiente serverless, use uma URL PostgreSQL com pooler e limite de conexões, por exemplo `connection_limit=1`.

### Frontend

- Root Directory: `frontend`;
- Framework Preset: Next.js;
- Variáveis: `API_URL` e `NEXT_PUBLIC_API_URL`, ambas apontando para o backend publicado.

Depois do primeiro deploy do frontend, atualize `CORS_ORIGIN` no backend com o domínio definitivo do frontend e faça um novo deploy do backend.

## Segurança

- Senhas recebem bcrypt com custo 12;
- `passwordHash` é excluído de todas as respostas;
- JWT expira em uma hora e é validado junto com a existência atual do usuário;
- Cookie do frontend é `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- DTOs rejeitam campos desconhecidos;
- CORS aceita apenas origens configuradas;
- Login e cadastro possuem rate limit específico;
- O HTML do modo de preparo (vindo do editor de texto rico) é sanitizado no backend com `sanitize-html` antes de ser salvo — apenas tags de formatação básica são permitidas (`p`, `br`, `strong`, `em`, `u`, `s`, `ul`, `ol`, `li`, `h3`, `blockquote`) e nenhum atributo é aceito, o que remove `<script>`, `on*` handlers, `javascript:` em links etc.;
- Apenas administradores podem criar/remover categorias (`POST`/`DELETE /categories`);
- Segredos e arquivos `.env` não são versionados.

## Evolução do projeto

A primeira versão do TastyBoard cobria autenticação JWT e CRUD básico de receitas (título/descrição), com SSE para sincronização em tempo real. A partir dela, foram adicionadas as funcionalidades previstas no escopo do projeto:

- **Cadastro de receitas com ingredientes e modo de preparo**: o campo único `description` foi substituído por `ingredients` (lista) e `instructions`, com validação de tamanho e quantidade no backend (`class-validator`) e formulário dedicado no frontend (um ingrediente por linha).
- **Upload de mídias**: novo modelo `Media` e módulo `MediaController`/`MediaService`, com upload via Multer (`memoryStorage`, compatível com o filesystem efêmero da Vercel) e envio ao Cloudinary. Suporta imagens e vídeos, com limite de 15MB por arquivo.
- **Imagem de capa da receita**: o modelo `Media` ganhou o campo `isPrimary` (migração `20260830213831_add_media_is_primary`). A primeira mídia enviada para uma receita vira a capa automaticamente; o usuário pode trocar a capa em qualquer imagem pelo botão "Definir como capa" no gerenciador de mídias (indisponível para vídeos), que chama `PATCH /recipes/:id/media/:mediaId/primary`. Esse endpoint desmarca as demais mídias da receita e marca a escolhida dentro de uma única transação Prisma (`$transaction`), garantindo que exista no máximo uma capa por receita. Se a mídia marcada como capa for excluída, a mídia restante mais antiga é promovida automaticamente, então a receita nunca fica sem capa enquanto tiver alguma mídia. A listagem de receitas (`GET /recipes`) já retorna as mídias ordenadas com a capa em primeiro lugar (`orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }]`), então o card de cada receita usa `recipe.media[0]` como preview sem precisar de lógica extra no frontend.
- **Reformulação da interface**: o formulário de criação/edição de receitas, antes fixo em uma barra lateral, virou um modal acionado pelo botão "+ Nova receita" (fecha ao clicar fora, no X ou com Esc). O painel de conta do usuário virou uma barra superior fixa e a grade de receitas passou a ocupar a largura total da página.
- **Identidade visual**: criação de uma marca simples (tigela com vapor, em SVG) usada como favicon, ícone da PWA (`app/icon.svg`, `app/apple-icon.png`, `app/favicon.ico`, seguindo as convenções de arquivo do Next.js) e ao lado do nome "TastyBoard" nos cabeçalhos das páginas.
- **Busca e filtros**: `GET /recipes` passou a aceitar `search` (nome ou ingrediente, via SQL parametrizado para permitir correspondência parcial em um array de texto) e `categoryId`. Um novo modelo `Category` e módulo `CategoriesModule` (com rotas de gestão restritas a administradores) dão suporte ao filtro.
- **Favoritos**: novo modelo `Favorite` (único por par usuário/receita) e `FavoritesModule`, com endpoint de alternância (`POST /recipes/:id/favorite`) e listagem dos favoritos do usuário autenticado.
- **Compartilhamento**: cada receita ganhou uma página de detalhe (`/recipes/:id`) renderizada no servidor, com metadados para pré-visualização de link, usada como alvo do botão "Compartilhar" (copia o link para a área de transferência).
- **Design responsivo e acessível**: adição de `:focus-visible` em todos os elementos interativos (ausente na versão anterior), grade de mídias e barra de filtros responsivas, e revisão dos breakpoints existentes (820px/600px).
- **Editor de texto rico e gestão de categorias**: o campo "modo de preparo" passou de um `<textarea>` de texto puro para um editor Tiptap (negrito, itálico, tachado, listas e citação); o HTML gerado é sanitizado no backend com `sanitize-html` (allowlist de tags, nenhum atributo permitido) antes de ser salvo, e renderizado com `dangerouslySetInnerHTML` no card da receita e na página de detalhe. Administradores ganharam um painel para criar e remover categorias diretamente pela interface (antes só existia a API, sem UI).
- **Nomenclatura do banco de dados**: todas as tabelas, colunas e constraints (chaves primárias, estrangeiras, índices e uniques) foram renomeadas para `snake_case` minúsculo, com nomes explícitos definidos via `@map`/`@@map` no `schema.prisma` (migração `20260830220000_rename_to_snake_case`, feita com `ALTER TABLE/COLUMN/CONSTRAINT/INDEX ... RENAME` para preservar os dados). O código da aplicação não muda: os nomes dos modelos e campos no Prisma Client (e no JSON da API) continuam em `camelCase`/`PascalCase`, só o nome físico no banco mudou.
- **Mídias no cadastro de receitas**: o formulário de nova receita foi reordenado (a seção "Mídias" agora fica antes dos botões de salvar/cancelar, não depois) e passou a permitir escolher fotos/vídeos antes mesmo de a receita existir — os arquivos ficam como "pendentes" (com preview via `URL.createObjectURL`) e são enviados automaticamente logo após a criação da receita, em vez de exigir salvar primeiro e editar depois para anexar mídia. O formulário e a linha de envio de link do YouTube também foram revisados para empilhar corretamente em telas estreitas (abaixo de 600px).
- **Categorias viraram tags (muitos-para-muitos)**: uma receita agora pode ter várias categorias, não só uma. A coluna `categoryId` em `Recipe` foi substituída por uma tabela de associação explícita `RecipeCategory` (chave composta `recipeId`+`categoryId`, `ON DELETE CASCADE` nas duas pontas — ver [`Category`](#category)), criada pela migração `20260830230000_category_many_to_many` com backfill dos dados existentes. O DTO e o endpoint `GET /recipes` passaram de `categoryId` (um número) para `categoryIds` (lista, `?categoryIds=1,3` na busca). No frontend, o `<select>` único de categoria virou um seletor de múltiplas tags (chips clicáveis) tanto no formulário de receita quanto no filtro do board, e o card/página de detalhe agora exibem uma etiqueta por categoria associada. O antigo painel de administração de categorias embutido no board foi substituído por uma tela dedicada (`/categorias`, restrita a administradores) com criar/renomear/remover — o backend ganhou `PATCH /categories/:id` para suportar a renomeação.

Para essa evolução, o barramento de eventos SSE (antes acoplado ao `RecipesService`) foi extraído para um `RecipeEventsService` global, permitindo que os módulos de mídia e favoritos também publiquem atualizações em tempo real sem depender diretamente do módulo de receitas.

### Passos manuais pendentes

Este pass alterou o schema do Prisma e adicionou uma dependência de serviço externo. Antes de rodar o projeto após atualizar o código:

1. Aplique a nova migração (`20260829120000_add_categories_media_favorites_and_recipe_details`) no seu banco: `npm run prisma:migrate` (dev) ou `npm run prisma:deploy` (produção/CI).
2. Rode `npm run prisma:seed` para criar as categorias padrão.
3. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` no backend — sem elas, o upload de mídias retorna erro 503 (o restante do app funciona normalmente).
4. Aplique a migração `20260830140904_add_password_reset_token` (mesmos comandos do passo 1) e, opcionalmente, configure `RESEND_API_KEY` no backend para enviar o e-mail de redefinição de senha de verdade — sem ela, o link é apenas logado no console do backend.
5. Aplique a migração `20260830213831_add_media_is_primary` (mesmos comandos do passo 1) e rode `npx prisma generate` no backend — o campo `isPrimary` em `Media` habilita a escolha de imagem de capa da receita (ver seção [`Media`](#media)).
6. Aplique a migração `20260830220000_rename_to_snake_case` (mesmos comandos do passo 1) e rode `npx prisma generate` no backend — ela apenas renomeia tabelas/colunas/constraints para `snake_case`, sem alterar dados nem o código da aplicação.
7. Aplique a migração `20260830230000_category_many_to_many` (mesmos comandos do passo 1) e rode `npx prisma generate` novamente — ela cria a tabela `recipe_category`, migra os vínculos existentes de `recipe.category_id` para lá e remove essa coluna. Depois de aplicada, receitas podem ter mais de uma categoria.
8. Não existe UI de auto-promoção a administrador. Para gerenciar categorias, o primeiro usuário admin precisa ser promovido manualmente no banco:
   ```sql
   UPDATE "user" SET role = 'ADMIN' WHERE email = 'seu-email@exemplo.com';
   ```
   A troca de papel vale imediatamente (sem precisar logar de novo), pois o `JwtAuthGuard` relê o `role` do banco a cada requisição em vez de confiar no payload do JWT.
