# ADR-001 — Monolito na Vercel + MongoDB Atlas

| Campo | Valor |
|---|---|
| Status | Substituída |
| Substituída por | [ADR-002](ADR-002-github-pages-supabase.md) (05/10/2026) |
| Decisão | Aplicação monolítica (front + back) hospedada na **Vercel**, com banco no **MongoDB Atlas** |

> Registro reconstruído a partir do ADR-002. O documento original não foi versionado.

## Decisão

Front e back-end no mesmo projeto, publicados na Vercel, com os dados no MongoDB Atlas.

## Por que foi substituída

- A decisão passou a ser manter a aplicação **apenas como front-end**, no GitHub Pages, sem back-end próprio para manter.
- Sem back-end, o MongoDB Atlas deixa de ser viável: o Atlas Data API e os HTTPS Endpoints foram removidos em 30/09/2025, e a credencial do banco ficaria exposta no front.

Os detalhes e as alternativas avaliadas estão no [ADR-002](ADR-002-github-pages-supabase.md).
