# Verification and known limits

## Reproducible checks

| Check | Command | Evidence |
|---|---|---|
| Unit tests | `npm test` | 19 tests passed: validation, currency aggregates, salary service rules, import parsing, password hashing, session revocation, and account authorization. No database required. |
| Type checking | `npm run typecheck` | Passed. |
| Production build | `npm run build` | Passed. |
| SQL integration | `npm run smoke` | Passed on local MySQL: pagination/filtering, create/duplicate rejection, salary history, transaction rollback, and import preview/apply/conflict handling. Disposable records are cleaned up. |
| Responsive UI | `node --env-file=.env.local --import tsx scripts/check-account-ui.ts` | Admin/HR pages at 1440px and 390px; search/pagination, account controls, profile navigation, and chart controls. Uses signed test sessions. |
| Full local workflow/demo | `node --env-file=.env.local --import tsx scripts/record-demo.ts` | Passed against the built local app: real HR login, initial-password replacement, old-password rejection, HR authorization, import apply, salary history, logout, admin creation, disable/enable, and password reset/login. |

See [demo instructions](demo.md) for the local server prerequisite. Browser scripts use disposable synthetic records. The admin segment uses an existing admin's signed test session, so it does not establish admin password-entry coverage. Screenshots and temporary credentials remain Git-ignored.

## Hosted evidence

The application is deployed at <https://salary-management-system-ten.vercel.app> with Hostinger MariaDB 11.8.9. Migrations and seeds completed for 10,000 employees, one admin, and 20 HR accounts. Direct database queries returned 10,000 total employees, 2,000 GB employees, and 223 combined GB/employee1 search matches.

Live browser automation completed initial-password replacement and subsequent login. The final automated run timed out requesting `/api/summary`, so the complete hosted workflow is **not** recorded as an automated pass. The application owner subsequently confirmed that the live app worked. Full hosted checks can be rerun with `scripts/verify-deployment.ts` using the dedicated assessment database and `VERIFY_BASE_URL`; they create and clean up temporary records.

## Performance decisions

- Employee search/filtering and pagination run in SQL with a maximum page size of 100. Name, country/department, and update-time indexes support common navigation. HR account search and 10-row pagination run client-side over the small admin-only account directory.
- Overview aggregates one server-side scan of 10,000 salary rows and returns grouped data. Precomputed summaries and keyset pagination would be appropriate at a larger scale.
- Salary updates lock the employee and save current pay plus history in one transaction. Obsolete search/filter requests are cancelled to prevent stale results overwriting current filters.
- No before/after latency benchmark was recorded; passing functional checks does not establish response-time targets.

## Known limits

- Synthetic assessment data only. SSO, email recovery, read/access auditing, backup/restore procedures, monitoring, and retention controls are outside the implemented scope. Salary history does not identify the acting HR user.
- Employee history returns the newest 100 events and is not an effective-date payroll ledger. Salary bands are compared within one currency; totals never combine currencies.
- The test runner was patched to Vitest 4.1.12. The dependency audit still reports a moderate advisory in ExcelJS's transitive uuid dependency; a forced import-library downgrade was not applied.
- Production uses application login; Vercel Authentication protects previews. The source was uploaded directly to Vercel. GitHub automatic deployment is not connected, so pushing a commit alone does not deploy it.
