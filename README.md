# Salary management system

A salary record and pay insights workspace for an HR manager. Built with Next.js, TypeScript, and MySQL-compatible SQL. Local development uses MySQL; Hostinger Web/Cloud provides MariaDB, which is the intended hosted database.

## Run locally

Requires Node.js 22 or newer and a local MySQL server.

1. Start MySQL (`brew services start mysql` on macOS).
2. Create an isolated database and user. For example, in a local MySQL shell:

   ```sql
   CREATE DATABASE salary_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'salary_app'@'127.0.0.1' IDENTIFIED BY 'choose-a-local-password';
   GRANT ALL PRIVILEGES ON salary_management.* TO 'salary_app'@'127.0.0.1';
   ```

3. Copy `.env.example` to `.env.local` and replace `YOUR_PASSWORD`. Keep that file private; Git ignores it.
4. Run:

   ```bash
   npm ci
   npm run migrate
   npm run seed
   npm test
   npm run smoke
   npm run dev
   ```

Open <http://localhost:3000>. The seed creates 10,000 deterministic synthetic employees and does not overwrite existing salary changes. `npm run smoke` creates and removes a synthetic employee on the local database only. `npm run typecheck` and `npm run build` validate the TypeScript and production build.

## Deploy with Vercel and Hostinger MariaDB

1. In Hostinger hPanel, create a MySQL database and user for this app. Record the database name, username, password, and database hostname privately.
2. In Hostinger's **Remote MySQL** section, allow access from the Vercel app's outbound IP. If fixed outbound IPs are unavailable, Hostinger offers an **Any Host** setting; use it only with a strong unique database password and synthetic assessment data. See [Hostinger's remote MySQL instructions](https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/).
3. Grant Vercel's GitHub integration access to this repository and link it to the `salary-management-system` project.
4. Add `DATABASE_URL` to the Vercel project as an encrypted environment variable, in the form `mysql://USER:ENCODED_PASSWORD@HOST:3306/DATABASE`. Percent-encode reserved characters in the password. Do not commit this value.
5. Run `DATABASE_URL='...' npm run migrate` and then `DATABASE_URL='...' npm run seed` from a trusted shell, then deploy. Do not put the connection string in logs or source control.
6. Verify the live overview shows 10,000 employees and test search, employee creation, salary update, and history.

A deployed app requires `DATABASE_URL`; it never falls back to ephemeral storage. The public assessment uses synthetic records. Real salary data would require authentication, authorization, encryption, backup/restore, and an access audit.

## Documentation

- [One-page requirements](docs/requirements.md)
- [Architecture and AI use](docs/architecture.md)
- [Verification and performance](docs/verification.md)
- [Recorded demo and walkthrough](docs/demo.md)
- [Assessment source PDF](Salary%20Management%20Assessment-%20Candidates.pdf)

## API

- `GET /api/summary` — counts and salary summaries by currency, country, and department.
- `GET /api/employees` — server-side search, filters, sorting, pagination.
- `POST /api/employees` — add employee.
- `GET /api/employees/:id` — record and latest 100 salary changes.
- `POST /api/employees/:id/salary` — transactional salary update and history event.
