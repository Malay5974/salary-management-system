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
4. Run `npm ci`, then `npm run seed:users` to create one admin and 20 HR users. Generated initial passwords are in ignored `.data/seed-user-logins.txt`. Rerunning preserves existing users.
5. Run:

   ```bash
   npm run migrate
   npm run seed
   npm test
   npm run smoke
   npm run dev
   ```

Open <http://localhost:3000> and use `.data/seed-user-logins.txt`. Every account must change its initial password. The admin manages HR users from Account / Manage HR users; HR users can change their own password under Account. Run `npm run seed` for the synthetic employee data.

## Deploy with Vercel and Hostinger MariaDB

1. In Hostinger hPanel, create a MySQL database and user for this app. Record the database name, username, password, and database hostname privately.
2. In Hostinger's **Remote MySQL** section, allow access from the Vercel app's outbound IP. If fixed outbound IPs are unavailable, Hostinger offers an **Any Host** setting; use it only with a strong unique database password and synthetic assessment data. See [Hostinger's remote MySQL instructions](https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/).
3. Grant Vercel's GitHub integration access to this repository and link it to the `salary-management-system` project.
4. Add `DATABASE_URL` and a random `SESSION_SECRET` (at least 32 characters) to Vercel environment settings. Run migrations and `npm run seed:users` against the target database before signing in. Share generated passwords privately.
5. Run `DATABASE_URL='...' npm run migrate` and then `DATABASE_URL='...' npm run seed` from a trusted shell, then deploy. Do not put the connection string in logs or source control.
6. Verify the live overview shows 10,000 employees and test search, employee creation, salary update, and history.

A deployed app requires `DATABASE_URL`; it never falls back to ephemeral storage. The assessment uses synthetic records.
Accounts and salted password hashes live in MySQL. Only the seed provisions the single admin; admin APIs create HR users only. Admins can create, disable, enable, and reset HR accounts. Password changes and account changes revoke existing sessions.

## Documentation

- [One-page requirements](docs/requirements.md)
- [Architecture and AI use](docs/architecture.md)
- [Verification and performance](docs/verification.md)
- [Spreadsheet import format and behavior](docs/import.md)
- [Recorded demo and walkthrough](docs/demo.md)
- [Assessment source PDF](Salary%20Management%20Assessment-%20Candidates.pdf)

## API

- `GET /api/summary` — counts and salary summaries by currency, country, and department.
- `GET /api/employees` — server-side search, filters, sorting, pagination.
- `POST /api/employees` — add employee.
- `GET /api/employees/:id` — record and latest 100 salary changes.
- `POST /api/employees/:id/salary` — transactional salary update and history event.
- `POST /api/imports/preview` — multipart file preview with row classification and errors.
- `POST /api/imports/apply` — revalidate and apply CSV/XLSX import in one transaction.
