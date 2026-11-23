# Verification and review notes

## Local checks

- `npm test` covers validation, filtered pagination, an atomic salary change with its history event, a rejected no-op, and currency-specific summary.
- `npm run typecheck` checks TypeScript types.
- `npm run build` checks the production Next.js build and API routes.
- `npm run seed` creates 10,000 synthetic records and is safe to rerun without replacing salary changes.
- With the built app running locally, `GET /api/summary` returned 10,000 employees, five currencies, and salary band counts. A filtered `GET /api/employees` returned a bounded page and matching total.

## Performance choices

- List responses use SQL `LIMIT`/`OFFSET` with a maximum page size of 100. Search, country, and department are filtered in SQL. Name and country/department indexes support common navigation. For much larger datasets, keyset pagination and a dedicated text-search index would be preferable.
- The dashboard performs grouped SQL aggregates and returns only summary rows. It never sends the full employee table to the browser.
- Salary updates and audit insertion happen in one SQL statement. The previous row is locked so concurrent changes cannot record the wrong prior salary.

## Known boundaries

- The app uses synthetic data and has no authentication. Do not enter real salaries. Production use needs access control, audit of reads, backup/restore, monitoring, and retention policy.
- Salary history displays the newest 100 changes per employee. It is an audit trail of recorded changes, not a payroll ledger or effective-date reconstruction.
- The salary bands are numeric thresholds within each currency. They should be compared only inside one currency.
