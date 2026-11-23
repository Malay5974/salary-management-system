# Salary management — product requirements

**User:** ACME HR manager. **Goal:** replace spreadsheets for 10,000 employees across countries with searchable salary records and understandable pay insights. This is the current agreed scope; Git history preserves the original pre-build document.

## Scope and acceptance

- Find employees by name/email, country, and department; sort and paginate without downloading the employee directory. Add employees from the Employees section.
- View current pay and recorded salary history. Save salary changes with effective date, reason, and previous amount atomically; reject unchanged amounts and dates before employment began.
- Import CSV/XLSX with preview and row errors. Apply all valid rows in one transaction. Match email to update name, department, and salary; audit salary changes. Reject country/currency/start-date conflicts.
- Require individual admin/HR sign-in. Seed one admin and 20 HR users; the admin manages HR accounts but cannot create additional admins. Require initial/reset password replacement; revoke sessions after password or account changes.
- Show employee counts, currency-specific payroll/ranges/medians, and country/department summaries. Department headcount and salary-band charts support Bar/Donut views, filters, currency selection, and reduced motion.
- Seed 10,000 deterministic synthetic employees. Use a relational database, server validation, bounded API responses, and fast deterministic unit tests. Provide reproducible setup, a working deployment, and a current video demo.

## Rules and tradeoffs

Store salary as nonnegative integer minor units; support US/USD, IN/INR, GB/GBP, DE/EUR, and CA/CAD. Never combine unlike currencies. Current pay reflects the latest recorded change; history is an audit trail, not an effective-date payroll reconstruction. Summary aggregation over 10,000 server-side rows is acceptable at this scale. HR account pagination is client-side for the small account directory; employee pagination is SQL-backed.

## Deliberately excluded

Payroll payments, taxes, benefits, payslips, and bonuses need country-specific rules beyond salary records. Currency conversion needs an exchange-rate policy. Employee self-service, approval chains, SSO, email recovery, and spreadsheet export are outside the agreed assessment scope. Real-data operations would additionally need access auditing, backup/restore procedures, monitoring, and retention controls.

## Success

An HR reviewer can sign in, find seeded records, import changes, inspect history, and answer pay questions. An admin can manage HR access. The README links to runnable setup, tests, a verified hosted app, and the demo; credentials are shared privately.
