# Acquisitions API

Express + Drizzle + Neon Postgres, dockerized for dev (Neon Local) and prod (Neon Cloud).

|                | Development                                                  | Production                         |
| -------------- | ------------------------------------------------------------ | ---------------------------------- |
| Compose file   | `docker-compose.dev.yml`                                     | `docker-compose.prod.yml`          |
| Env file       | `.env.development`                                           | `.env.production`                  |
| Database       | Neon Local proxy -> ephemeral branch                         | Neon Cloud (serverless)            |
| `DATABASE_URL` | `postgres://neon:npg@neon-local:5432/neondb?sslmode=require` | `postgres://...neon.tech/...`      |
| Docker target  | `development` (hot reload)                                   | `production` (prod deps, non-root) |

## Development (Neon Local)

1. Get a Neon API key (Account settings -> API keys) and your project ID (Project settings).
2. Fill in `.env.development`: `NEON_API_KEY`, `NEON_PROJECT_ID`, optionally `PARENT_BRANCH_ID`, plus `ARCJET_KEY`/`JWT_SECRET`.
3. Start:
    ```bash
    docker compose -f docker-compose.dev.yml --env-file .env.development up --build
    ```
4. App: http://localhost:3000. Neon Local is exposed on `localhost:5433`.

Neon Local creates a fresh branch from the parent on startup and deletes it on shutdown (`DELETE_BRANCH=true`), so each session starts clean. In `NODE_ENV=development`, `src/config/database.js` points the serverless driver at `http://<host>:5432/sql`.

Run migrations against the ephemeral branch:

```bash
docker compose -f docker-compose.dev.yml --env-file .env.development exec app npm run db:migrate
```

(Since the branch is deleted on shutdown, re-run migrations each session.)

## Production (Neon Cloud)

No proxy container. Set secrets in your host/CI environment rather than committing them:

```bash
export DATABASE_URL='postgres://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require'
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

`.env.production` only holds placeholders; real values come from your secret manager. Run migrations from CI or a one-off job: `DATABASE_URL=... npm run db:migrate`.

## How `DATABASE_URL` switches

The app only reads `process.env.DATABASE_URL`. The dev compose file sets it to the `neon-local` service; the prod compose file passes through the Neon Cloud URL. `.env.*` files are git-ignored (only `.env.example` is tracked).
