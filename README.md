# QA-Playground: Quality Quest

RPG web simples com operações de CRUD, criado como playground para a mentoria. Cada tela existe para exercitar técnicas de teste: formulários, listas, rede, tempo, aleatoriedade e regras de negócio no banco.

- **Front:** React + Vite, publicado no GitHub Pages.
- **Dados, login e API:** Supabase (Postgres com Row Level Security).

## Estrutura

| Caminho | Conteúdo |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Contexto completo: regras de negócio, telas, banco e estratégia de testes |
| [`docs/adr/`](docs/adr/) | Decisões de arquitetura |
| [`docs/prototipo/`](docs/prototipo/) | Protótipo navegável (referência visual e de comportamento) |
| [`supabase/`](supabase/) | `schema.sql` e `seed.sql` |
| [`CREDITS.md`](CREDITS.md) | Créditos de ícones e fontes |

## Configuração

Veja o [guia passo a passo de Supabase](SETUP_SUPABASE.md) para conectar o banco.

1. `npm install`
2. `npm run dev` — app em `http://localhost:5173/QA-Playground/`

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | App em `http://localhost:5173/QA-Playground/`, usando o `.env` |
| `npm run build` | Gera o site estático em `dist/` |
| `npm run preview` | Prévia local do build |
