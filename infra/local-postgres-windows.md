# Local PostgreSQL (Windows, no Docker)

## 1. Install PostgreSQL

Download and install **PostgreSQL 16** from:
https://www.postgresql.org/download/windows/

During setup:
- Port: **5432** (default)
- Set a **postgres superuser password** (remember it)
- Install **pgAdmin** (optional, helpful)

Or via winget (PowerShell as Administrator):

```powershell
winget install PostgreSQL.PostgreSQL.16
```

## 2. Create database and user

Open **SQL Shell (psql)** from Start Menu, or PowerShell:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

Then paste (or run the script file):

```sql
CREATE USER nexusedge WITH PASSWORD 'nexusedge_secret';
CREATE DATABASE nexusedge OWNER nexusedge;
GRANT ALL PRIVILEGES ON DATABASE nexusedge TO nexusedge;
```

Or from repo root:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f infra\setup-local-postgres.sql
```

## 3. Configure the app

`frontend/.env` should already contain:

```env
DATABASE_URL=postgresql://nexusedge:nexusedge_secret@localhost:5432/nexusedge
```

If you used different credentials, update `DATABASE_URL` accordingly.

## 4. Push schema and seed

```powershell
cd frontend
npm run db:push
npm run db:seed
npm run dev
```

## 5. Verify

```powershell
curl http://localhost:3000/api/health
```

Expect: `"database": "connected"`

## Redis & Qdrant (optional without Docker)

- **Redis** — not required for core login/interview flow
- **Qdrant** — semantic memory falls back gracefully if unavailable

Install later if needed, or use Docker only for those two services.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Can't reach database server` | Start PostgreSQL service: `services.msc` → postgresql-x64-16 → Start |
| `password authentication failed` | Wrong password in `DATABASE_URL` or user not created |
| `database "nexusedge" does not exist` | Run `setup-local-postgres.sql` |
| `role "nexusedge" does not exist` | Run CREATE USER step |
