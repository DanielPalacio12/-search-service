# search-service

Proyección CQRS: consume los eventos de usuarios de Kafka y mantiene el índice `users` en OpenSearch; responde búsquedas desde ese índice.

- `npm run dev` — API (Next.js)
- `npm run worker` — consumer de Kafka (proceso aparte)
- `npm run start:all` — API + worker juntos (producción / Render)
- `npm test`, `npm run typecheck`

Copia `.env.example` a `.env` y completa los valores (nunca se commitea).

API: `GET /api/search/users?q=&status=&page=&size=` (Bearer JWT, roles ADMIN/REVIEWER) y `GET /health`.
