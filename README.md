# Salary management system

A salary record and pay insights workspace for an HR manager. Built with Next.js, TypeScript, and MySQL-compatible SQL. Local development uses MySQL; Hostinger Web/Cloud provides MariaDB, which is the hosted database.

## Review the submission

- Live application: <https://salary-management-system-ten.vercel.app>
- [One-page requirements PDF](docs/artifacts/requirements.pdf)
- [Video walkthrough by Malay](https://drive.google.com/file/d/1kLeQrgxum6jvSY-hgRy8p6i6gwQo0m9d/view?usp=sharing)
- [Demo notes and automated browser recording](docs/demo.md)
- [Architecture, schema diagrams, tradeoffs, and AI use](docs/architecture.md)
- [Verification evidence and limits](docs/verification.md)

Reviewer credentials are supplied privately. The first login requires a password change. Hosted and local accounts are separate; no credentials are committed.

## Run locally

Requires Node.js 22 or newer and a local MySQL server.

1. Start MySQL (`brew services start mysql` on macOS).
2. Create an isolated database and user. For example, in a local MySQL shell:

   ```sql
   CREATE DATABASE salary_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'salary_app'@'127.0.0.1' IDENTIFIED BY 'choose-a-local-password';
   GRANT ALL PRIVILEGES ON salary_management.* TO 'salary_app'@'127.0.0.1';
   ```

3. Copy `.env.example` to `.env.local`, replace `YOUR_PASSWORD`, and set `SESSION_SECRET` to a cryptographically random value of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep that file private; Git ignores it.
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

## Accounts and overview

- Sign in with an admin or HR account stored in MySQL. Initial and reset passwords must be changed before opening the salary workspace. After changing a password, sign in again; older sessions are revoked.
- The seed provisions `admin@acme.test` and `hr1@acme.test` through `hr20@acme.test`. Use the generated passwords from `.data/seed-user-logins.txt` privately. Seed passwords stop working after a user changes or resets them. Rerunning the seed does not reset accounts.
- Click the sidebar avatar, name, or role to open Account. All users can change their own password. The single admin can add HRs, reset passwords, and enable/disable users. HRs cannot manage accounts; no app workflow adds admins.
- The admin list includes active and disabled HR accounts, with name/email search and 10 accounts per page. New accounts appear first.
- Overview includes department headcount and salary-distribution charts with independent Bar/Donut controls. Charts follow country/department filters; salary distribution has a currency selector. Animations respect reduced-motion preferences. Add employee is available in Employees.

## Deploy with Vercel and Hostinger MariaDB

1. In Hostinger hPanel, create a MySQL database and user for this app. Record the database name, username, password, and database hostname privately.
2. In Hostinger's **Remote MySQL** section, allow access from the Vercel app's outbound IP. If fixed outbound IPs are unavailable, Hostinger offers an **Any Host** setting; use it only with a strong unique database password and synthetic assessment data. See [Hostinger's remote MySQL instructions](https://www.hostinger.com/support/1583546-how-to-set-up-remote-mysql-access-in-hostinger/).
3. Link the repository to the Vercel project when GitHub integration access is available. The current deployment was uploaded directly from the committed source; automatic deployment on push is not connected.
4. Keep `.env.production.local` separate from `.env.local`; explicit environment variables take precedence. Add `DATABASE_URL` and a random `SESSION_SECRET` (at least 32 characters) to Vercel environment settings. Run migrations and `npm run seed:users` against the target database before signing in. Share generated passwords privately.
5. Run `DATABASE_URL='...' npm run migrate` and then `DATABASE_URL='...' npm run seed` from a trusted shell, then deploy. Do not put the connection string in logs or source control.
6. Verify the live overview shows 10,000 employees and test search, employee creation, salary update, and history.

A deployed app requires `DATABASE_URL`; it never falls back to ephemeral storage. The assessment uses synthetic records.
Accounts and salted password hashes live in MySQL. Only the seed provisions the single admin; admin APIs create HR users only. Admins can create, disable, enable, and reset HR accounts. Password changes and account changes revoke existing sessions.

## Documentation

- [Requirements source](docs/requirements.md) and [one-page PDF](docs/artifacts/requirements.pdf)
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

## Account API

- `POST /api/auth/login` — authenticate a database user and issue a signed cookie.
- `POST /api/auth/logout` — clear the browser session cookie.
- `POST /api/auth/password` — verify the current password, replace it, and revoke older sessions.
- `GET /api/users` — admin-only list of all HR accounts, including disabled accounts.
- `POST /api/users` — admin-only HR creation; returns a generated temporary password once.
- `PATCH /api/users` — admin-only HR enable, disable, or password reset. Reset returns a new temporary password once.

Detailed verification evidence and demo instructions are in [verification notes](docs/verification.md) and [demo notes](docs/demo.md).
