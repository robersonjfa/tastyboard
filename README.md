# TastyBoard

O TastyBoard é uma aplicação web full stack para cadastrar e consultar receitas. O projeto demonstra a integração entre uma interface em Next.js e uma API REST em NestJS, com validação dos dados recebidos e persistência local em arquivo JSON.

## Funcionalidades

- Listagem das receitas cadastradas;
- Cadastro de receitas com título e descrição;
- Validação dos dados enviados à API;
- Persistência local dos registros;
- Comunicação entre frontend e backend por API REST.

## Tecnologias

### Frontend

- Next.js 16;
- React 19;
- TypeScript.

### Backend

- NestJS 11;
- TypeScript;
- `class-validator` e `class-transformer`;
- Estrutura Prisma e migração PostgreSQL preparadas para evolução do projeto.

## Estrutura do projeto

```text
tastyboard/
├── backend/                 # API REST em NestJS
│   ├── data/db.json         # Dados persistidos localmente
│   ├── prisma/              # Schema e migrações do banco PostgreSQL
│   ├── src/database/        # Serviço de persistência em JSON
│   └── src/recipes/         # Módulo, controller, DTO e serviço de receitas
└── frontend/                # Aplicação web em Next.js
    ├── app/                 # Página e estilos da aplicação
    └── public/              # Arquivos estáticos
```

> Atualmente, a aplicação utiliza `backend/data/db.json` em tempo de execução. O schema e a migração do Prisma estão incluídos como base para uma futura adoção do PostgreSQL.

## Pré-requisitos

- Node.js 20.9 ou superior;
- npm.

## Instalação

Clone o repositório:

```bash
git clone https://github.com/robersonjfa/tastyboard.git
cd tastyboard
```

Instale as dependências do backend e do frontend:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Configuração

Por padrão, o frontend acessa a API em `http://localhost:3001`. Para utilizar outro endereço, crie o arquivo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Executando o projeto

Inicie o backend em um terminal:

```bash
cd backend
npm run start:dev
```

A API ficará disponível em `http://localhost:3001`.

Em outro terminal, inicie o frontend:

```bash
cd frontend
npm run dev
```

Acesse `http://localhost:3000` no navegador.

## API

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/recipes` | Retorna todas as receitas cadastradas. |
| `POST` | `/recipes` | Cadastra uma nova receita. |

Exemplo de requisição para cadastro:

```json
{
  "title": "Bolo de cenoura",
  "description": "Bolo de cenoura com cobertura de chocolate."
}
```

Os campos `title` e `description` são obrigatórios e devem ser textos não vazios.

## Comandos úteis

### Backend

```bash
npm run build       # Gera o build de produção
npm run start:dev   # Executa com recarregamento automático
npm run start:prod  # Executa o build de produção
npm run test        # Executa os testes unitários
npm run test:e2e    # Executa os testes de ponta a ponta
```

### Frontend

```bash
npm run dev    # Inicia o ambiente de desenvolvimento
npm run build  # Gera o build de produção
npm run start  # Executa o build de produção
```
