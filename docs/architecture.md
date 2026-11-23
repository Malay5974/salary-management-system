# Architecture and decisions

- A React UI calls a small HTTP API. Server-side pagination and aggregate SQL keep the data transfer bounded at 10,000 employees.
- PostgreSQL-compatible storage is used in both environments: PGlite persists locally for development, while deployed Vercel functions use Neon Postgres. This keeps SQL and constraints consistent without relying on an ephemeral Vercel filesystem.
- Store pay as integer minor units with an explicit currency. Never sum pay across currencies. Salary changes use one transaction and retain an append-only event.
- Synthetic seed data uses a fixed algorithm and stable IDs. Running it twice does not duplicate employees.
- The API owns validation and constraints. UI validation improves feedback but is not a security boundary.
- A single HR persona is assumed. Authentication and real-data readiness are intentionally out of scope for the assessment, as stated in requirements.

## AI use

AI helped draft the requirements, implementation, and tests. Engineering checks include running the test suite, exercising the seeded API, reviewing SQL queries and transaction boundaries, and documenting limits. The original assessment PDF remains in the repository as the source of requirements.
