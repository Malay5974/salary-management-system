# Salary management — product requirements

## Goal and user

Give an HR manager one reliable place to manage salary records for an organization of 10,000 employees across countries, and answer basic questions about how the organization pays people. Replace error-prone spreadsheet lookups with searchable records and clear salary summaries.

## In scope

- Browse employees with server-side search, country/department filters, sorting, and pagination that remain responsive with 10,000 records.
- View an employee's current salary, currency, location, department, and effective date.
- Add an employee and change salary through a deliberate workflow. Record every salary change with effective date, reason, and previous value for auditability.
- Answer questions through dashboard summaries: employee count, total payroll by currency, median salary by country and department, and distribution by salary band. Keep currencies separate; adding unlike currencies would be misleading.
- Seed 10,000 realistic but synthetic employee records, with deterministic results for repeatable review.
- Validate inputs on the server, show useful errors in the UI, and cover core rules and API behavior with automated tests.

## Rules and acceptance

- Salary is a nonnegative integer in minor currency units, so decimal rounding does not corrupt pay. The assessment supports US/USD, IN/INR, GB/GBP, DE/EUR, and CA/CAD; each has two minor units per major unit.
- Each employee has one current salary. Salary changes append an immutable history event and update the current value in one database transaction.
- Effective dates cannot precede the employee's start date. A change may be backdated, but the current salary reflects the latest recorded change, not a reconstructed historical payroll ledger.
- At 10,000 employees, list and dashboard requests use database queries and indexes rather than downloading all rows to the browser.
- No real employee data is required or included.

## Deliberately out of scope

- Payroll calculation, tax, benefits, bonuses, payslips, and payments: these require local legal and financial rules beyond salary record management.
- Currency conversion and cross-currency totals: exchange rates vary over time and would imply unsupported precision.
- Bulk spreadsheet import/export: useful next step, but mapping, duplicate handling, and sensitive data controls deserve their own workflow.
- Employee self-service, approval chains, and role-based access: this assessment demonstrates the HR workflow. Production use with real data would require SSO, authorization, encryption, retention policy, and an access audit before launch.

## Success

An HR manager can find any seeded employee, inspect salary history, record a change, and obtain salary summaries by country and department. The seeded app can be run and tested from the documented commands.
