# Verification and review notes

## Local checks

- `npm test` covers identity normalization, country/currency pairing, date and salary validation, bounded pagination, and currency-specific totals and medians. These tests are fast and do not need a database.
- `npm run typecheck` checks TypeScript types; `npm run build` checks the production Next.js build and routes.
- `npm run seed` populated a local MySQL database with 10,000 synthetic records and was rerun without replacing existing changes.
- `npm run smoke` exercised the actual local MySQL database: summary, filtered pagination, employee creation, transactional salary change, audit history, and rejection of an unchanged salary. It removed its synthetic test employee afterward.
- A headless Chromium session exercised the built app through the browser and recorded the resulting WebM under `docs/demo/`.

## Performance choices

- List responses use SQL `LIMIT`/`OFFSET` with a maximum page size of 100. Search, country, and department are filtered in SQL. Name and country/department indexes support common navigation. For much larger datasets, keyset pagination and a dedicated text-search index would be preferable.
- Dashboard calculations use one 10,000-row server-side scan and return only aggregate rows to the browser. This is suitable for the assessment scale; larger organizations should use precomputed summaries or database window queries.
- Salary updates and audit insertion run in one database transaction. `SELECT ... FOR UPDATE` locks the previous row so concurrent changes cannot record the wrong prior salary.

## Known boundaries

- Hostinger MariaDB has not yet been connected or tested. The local integration run used MySQL 9.6.
- The app uses synthetic data and has no authentication. Do not enter real salaries. Production use needs access control, audit of reads, backup/restore, monitoring, and retention policy.
- Salary history displays the newest 100 changes per employee. It is an audit trail of recorded changes, not a payroll ledger or effective-date reconstruction.
- Salary bands use numeric thresholds within each currency. Compare them only inside one currency.
