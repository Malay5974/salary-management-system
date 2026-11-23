# Salary management system

A salary record and pay insights workspace for an HR manager. Built with Next.js, TypeScript, PostgreSQL-compatible SQL, local PGlite, and Neon Postgres for Vercel.

## Run locally

Requires Node.js 22 or newer.

```bash
npm ci
npm run seed
npm run dev
```

Open <http://localhost:3000>. The local database lives in `.data/` and is ignored by Git. `npm run seed` creates 10,000 deterministic synthetic employees on an empty database. It does not overwrite existing data. Use `npm test`, `npm run typecheck`, and `npm run build` to verify the project.

## Deploy to Vercel

1. Connect this GitHub repository to a Vercel project.
2. Provision a Neon Postgres database through the Vercel Marketplace and expose its connection string as `DATABASE_URL` in the project.
3. Deploy the project. The app creates tables on first use.
4. Seed the production database once from a trusted local shell using `DATABASE_URL='...' npm run seed`. Do not place the connection string in Git or logs.
5. Open the deployment, confirm the overview shows 10,000 employees, search an employee, and record a test salary change.

The deployed application requires `DATABASE_URL` and will return an error rather than silently use ephemeral storage. The public assessment uses synthetic records. It is not suitable for real employee salary data without authentication, authorization, and operational controls.

## Documentation

- [One-page requirements](docs/requirements.md)
- [Architecture and AI use](docs/architecture.md)
- [Recorded demo and walkthrough](docs/demo.md)
- [Assessment source PDF](Salary%20Management%20Assessment-%20Candidates.pdf)

## API

- `GET /api/summary` — counts and salary summaries by currency, country, and department.
- `GET /api/employees` — server-side search, filters, sorting, pagination.
- `POST /api/employees` — add employee.
- `GET /api/employees/:id` — record and latest 100 salary changes.
- `POST /api/employees/:id/salary` — atomic salary update and history event.
