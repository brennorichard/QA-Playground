# ADR-002 — Front no GitHub Pages + Supabase

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 05/10/2026 |
| Substitui | ADR-001 (monolito na Vercel + MongoDB Atlas) |
| Decisão | Front estático no **GitHub Pages**, com dados e login no **Supabase**, acessado direto do front |

## Contexto

O projeto é um sistema "simples" (domínio ainda a definir) com operações de CRUD, usado como alvo para aplicar técnicas de teste E2E na mentoria.

> Revisão de 13/10/2026: a automação dos testes fica em um repositório separado, feito durante a mentoria, que roda sobre este app. Este repositório não tem testes automatizados; ele só garante que o app seja testável (requisições HTTP reais e seletores `data-cy`).

O ADR-001 previa um monolito (front + back) na Vercel com banco no MongoDB Atlas. A decisão foi revista para manter a aplicação **apenas como front-end**, hospedada no GitHub Pages, sem back-end próprio para manter.

Sem back-end, o MongoDB Atlas deixa de ser viável:

- O Atlas Data API e os HTTPS Endpoints, que permitiam acessar o banco por HTTP sem driver, foram removidos em 30/09/2025.
- Mesmo que existissem, a credencial do banco ficaria exposta no front.

## Decisão

**Front:** SPA estática (Vite + framework a definir) publicada no GitHub Pages, com deploy por GitHub Actions.

**Dados e autenticação:** Supabase (Postgres + Auth + API REST), acessado pelo front com `@supabase/supabase-js` e a chave pública do projeto.

**Segurança:** Row Level Security (RLS) em todas as tabelas, com a regra "cada usuário só vê e altera os próprios registros".

## Por que essa escolha

- **Requisições HTTP reais:** o front conversa com uma API de verdade, então os testes podem interceptar as requisições (espionar, aguardar, simular erro e lentidão).
- **API REST legível:** listar é `GET /rest/v1/<tabela>`, criar é `POST`, editar é `PATCH` e excluir é `DELETE`, o que deixa as rotas fáceis de capturar nos testes.
- **Massa de dados via API:** os testes podem chamar a mesma API REST para criar e limpar dados, sem passar pela interface.
- **Login pronto:** o Auth do Supabase permite praticar login por API e reaproveitamento de sessão.
- **SQL:** modelagem e consultas em Postgres.
- **Sem servidor para manter:** front estático no Pages e banco/API gerenciados pelo Supabase.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Monolito na Vercel + Atlas (ADR-001) | Substituída: a decisão passou a ser manter só o front, no GitHub Pages. |
| Dados no navegador (localStorage/IndexedDB) | Sem requisições HTTP, não há rede para interceptar nem API para chamar nos testes; dados presos a cada navegador. |
| API simulada com MSW | Ferramentas de E2E que interceptam a rede num proxy fora do navegador não enxergam requisições respondidas pelo service worker; os testes deixariam de ser E2E. |
| Firebase (Firestore) | O SDK usa canais de streaming com payload codificado, o que torna a interceptação nos testes bem mais trabalhosa. |
| MongoDB Atlas direto do front | Data API removido em 30/09/2025 e credencial exposta no front. |

## Limites conhecidos

**GitHub Pages**

- No plano gratuito, o repositório precisa ser público.
- Hospeda só arquivos estáticos.
- Não redireciona rotas desconhecidas para o `index.html`: um F5 em `/registros/3` retorna 404.

**Supabase (plano gratuito)**

- Projetos com pouca atividade ao longo de 7 dias são pausados. Um projeto pausado pode ser retomado pelo painel, com dados e configurações preservados.
- A chave pública fica visível no front: a segurança dos dados depende inteiramente do RLS.
- Demais cotas do plano gratuito: conferir na página de preços do Supabase.

## Modelo de dados e segurança

Exemplo de tabela com RLS por usuário (trocar `registros` e as colunas pelo domínio escolhido):

```sql
create table public.registros (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome       text not null,
  created_at timestamptz not null default now()
);

alter table public.registros enable row level security;

create policy "Usuário lê os próprios registros"
  on public.registros for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuário cria registros para si"
  on public.registros for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuário edita os próprios registros"
  on public.registros for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuário exclui os próprios registros"
  on public.registros for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

Como `user_id` tem `default auth.uid()`, o front não precisa enviar esse campo ao criar um registro.

## Configuração do front

1. **Base path:** no `vite.config.js`, `base: '/nome-do-repo/'`.
2. **Rotas:** usar `HashRouter` (`/#/registros/3`) ou copiar o `index.html` para `404.html` no build.
3. **Cliente do Supabase:**

   ```js
   // src/lib/supabase.js
   import { createClient } from '@supabase/supabase-js';

   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_KEY,
   );
   ```

4. **Camada de dados única:** todo acesso ao Supabase fica em `src/services/<entidade>.js` (`listar`, `criar`, `editar`, `excluir`). Os componentes nunca chamam o Supabase direto.
5. **Seletores estáveis:** atributos `data-cy` nos elementos usados pelos testes.

## Variáveis de ambiente

| Variável | Onde | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | Build do front (variável do Actions) | URL do projeto Supabase |
| `VITE_SUPABASE_KEY` | Build do front (variável do Actions) | Chave pública (anon/publishable) |

A chave secreta do Supabase (service role/secret) **nunca** entra no bundle do front nem neste repositório.

## CI/CD (GitHub Actions)

- **Workflow de deploy (push na `main`):** instalar dependências → build → publicar no GitHub Pages.
- **Workflow agendado (cron diário):** uma consulta simples na API, para manter o projeto Supabase ativo.
  - Em repositórios públicos, o GitHub desativa workflows agendados após 60 dias sem atividade no repositório.

## Quando revisitar esta decisão

- Regras de negócio que não cabem no front ou integrações que exigem chave secreta → avaliar Supabase Edge Functions ou voltar a um back próprio (ADR-001).
- Pausa por inatividade atrapalhando o uso → rever o plano ou a estratégia de keep-alive.
- Necessidade de repositório privado → GitHub Pages em plano pago, ou migrar o front para Vercel/Netlify.

## Em aberto

- ~~Domínio do sistema (o que o CRUD vai gerenciar).~~ Definido: RPG "Quality Quest" (ver `CLAUDE.md`, seção 4).
- ~~Framework do front (React, Vue etc.).~~ Definido: React via Vite, com `HashRouter`.
- Cadastro público aberto ou apenas usuários criados manualmente no painel do Supabase.
