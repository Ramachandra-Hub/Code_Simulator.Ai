# Deprecated

This NestJS backend has been **retired** in favor of the unified Next.js application.

All API routes, Prisma database access, and the Career Intelligence agent framework now live in `frontend/`:

- API routes: `frontend/src/app/api/`
- Prisma schema: `frontend/prisma/schema.prisma`
- Agent framework: `frontend/src/server/career-intelligence/`
- ModelGateway: `frontend/src/server/core/model/`

Use `docker-compose.yml` at the repo root (frontend service only, no `api` service).
