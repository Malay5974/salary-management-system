# Verification and review notes

## Local checks

- `npm test` covers identity normalization, country/currency pairing, date and salary validation, bounded pagination, currency-specific totals and medians, salary change service rules, CSV/XLSX parsing, and salted password hashing and database-backed session validation. These tests are fast and do not need a database.
- `npm run typecheck` checks TypeScript types; `npm run build` checks the production Next.js build and routes.
- `npm run seed` populated a local MySQL database with 10,000 synthetic records and was rerun without replacing existing changes.
- `npm run smoke` exercised the actual local MySQL database: summary filtering, pagination, employee creation, duplicate-email rejection, salary history, rollback, import preview, audited update of an existing employee, creation of a new employee, and conflict detection. It removed its synthetic test employees afterward.
- A headless Chromium session exercised the built app through the browser and recorded the resulting WebM under `docs/demo/`.
- Earlier browser checks confirmed unauthenticated dashboard/API protection and login/logout for the original shared login. That evidence predates the database-account change and does not establish the full current login workflow.

## Current account and chart evidence

- `npm run seed:users` created one admin and 20 HR accounts locally. Temporary passwords are private and Git-ignored. Re-running the seed preserves existing accounts.
- Unit tests verify independent salted password hashes, incorrect-password rejection, token tampering/expiry, inactive-user rejection, and session-version revocation using a mocked database.
- `node --env-file=.env.local --import tsx scripts/check-account-ui.ts` checks admin and HR layouts at 1440px and 390px, button styling, overflow, and browser errors. It uses database-backed signed test sessions, so it does **not** test credential entry or first-login password changes.
- That browser script checks admin creation, disable/enable, and reset controls with a temporary HR account removed afterward; HR search, pagination, and empty results; sidebar profile navigation; chart type switching, currency selection, and country-filter currency fallback.
- The rebuilt local application passed `scripts/record-demo.ts`: temporary-password login, mandatory replacement, old-password rejection, subsequent login, HR admin-access denial, spreadsheet apply, salary history, logout, admin creation, disabled-account login rejection, and reset-password login requiring replacement. The recorder uses disposable synthetic accounts and employees; admin controls use a signed test session.
- The latest recorded local checks passed 19 unit tests, TypeScript checking, and a production build. This document records prior execution evidence; editing documentation does not rerun those checks.

## Performance choices

- List responses use SQL `LIMIT`/`OFFSET` with a maximum page size of 100. Search, country, and department are filtered in SQL. Name and country/department indexes support common navigation. For much larger datasets, keyset pagination and a dedicated text-search index would be preferable.
- Dashboard calculations use one 10,000-row server-side scan and return only aggregate rows to the browser. This is suitable for the assessment scale; larger organizations should use precomputed summaries or database window queries.
- Salary updates and audit insertion run in one database transaction. `SELECT ... FOR UPDATE` locks the previous row so concurrent changes cannot record the wrong prior salary.

## Known boundaries

- The dedicated Hostinger MariaDB 11.8.9 database accepted the connection, migrations, 10,000-employee seed, and one-admin/20-HR seed. Local transaction integration checks used MySQL 9.6.
- The app uses synthetic data with database-backed admin and HR accounts. SSO, email recovery, access/read auditing, backup/restore, monitoring, and retention policy are outside the implemented assessment scope.
- Salary history displays the newest 100 changes per employee. It is an audit trail of recorded changes, not a payroll ledger or effective-date reconstruction.
- Salary bands use numeric thresholds within each currency. Compare them only inside one currency.

Account styling verification: Playwright checked admin and HR account pages at 1440px and 390px, button styling, horizontal overflow, and browser errors. Admin create, disable, enable, and password-reset controls passed using a temporary local account that was removed afterward. Re-run with `node --env-file=.env.local --import tsx scripts/check-account-ui.ts`. Screenshots are saved under ignored `.data/`.

Overview charts: browser checks cover Bar/Donut switching, salary currency selection, country-filter currency fallback, and mobile overflow. Charts use the existing filtered summary and respect reduced-motion preferences.

## Submission hardening

Authorization regression tests cover anonymous/HR/initial-password admin rejection for HR-management routes, extra-role-field rejection preventing admin creation, and initial-password gating on salary APIs. The test runner was upgraded to Vitest 4.1.12 after audit identified vulnerable development dependencies. A remaining moderate advisory is in ExcelJS's transitive uuid dependency; no forced ExcelJS downgrade was applied because it would change the import stack. Review this dependency before real-data use.
