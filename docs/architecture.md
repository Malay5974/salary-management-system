# Architecture and decisions

- A React UI calls small Next.js route handlers. The handlers delegate business decisions to services, SQL to repositories, and database setup to an explicit migration script. Server-side pagination keeps employee list responses bounded at 10,000 records.
- MySQL-compatible tables and queries are used locally and in production. This follows the user's Hostinger Web/Cloud database choice: those plans provide MariaDB rather than PostgreSQL. The local MySQL server validates the implemented SQL; the Hostinger connection remains to be verified after a database is created.
- Store pay as integer minor units with an explicit currency. Never sum pay across currencies. The assessment supports five country/currency pairs with two decimal places. Inputs cap annual salary at 1,000,000,000 minor units, keeping 10,000-record payroll totals within safe JavaScript integer range.
- Salary changes lock the employee row, update current pay, and insert an audit event in one transaction. Failed or unchanged changes roll back.
- The dashboard reads 10,000 salary rows on the server and computes currency-specific medians, payroll totals, and bands. This is simple and portable across MySQL and MariaDB at the assessment's fixed scale. No employee-level salary rows are sent to the browser. At much larger scale, precomputed aggregate tables or database window queries would be preferable.
- Synthetic seed data uses a fixed algorithm and stable IDs. Rerunning it does not duplicate employees or overwrite changes.
- The API owns validation and constraints. UI validation improves feedback but is not a security boundary.
- A single HR persona is assumed. Authentication and real-data readiness are intentionally out of scope for the assessment, as stated in requirements.

## AI use

AI helped draft the requirements, implementation, and tests. Engineering checks include running the unit suite, exercising a real local MySQL database, reviewing transaction boundaries, recording a browser demo, and documenting limits. The original assessment PDF remains in the repository as the source of requirements.
