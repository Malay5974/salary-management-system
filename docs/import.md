# Spreadsheet import

Download the [CSV template](../public/employee-import-template.csv) from the Employees screen. CSV and XLSX files are accepted. XLSX uses the first worksheet. The file limit is 10 MB and 10,000 employee rows.

Required columns (spaces, hyphens, and underscores in headers are ignored):

| Column | Example | Rule |
|---|---|---|
| firstName | Alex | 1–80 characters |
| lastName | Example | 1–80 characters |
| email | alex@example.test | Unique matching key; case-insensitive |
| department | Engineering | 1–80 characters |
| country | US | US, IN, GB, DE, or CA |
| currency | USD | Must match country |
| startDate | 2024-01-01 | ISO date |
| annualSalary | 95000.00 | Major currency units, at most two decimals |
| salaryEffectiveDate | 2024-01-01 | ISO date, no earlier than start date |

Preview reports new, updated, unchanged, and invalid rows. Nothing is written during preview. Duplicate emails inside a file, malformed values, and conflicts are shown with row numbers. Apply is available only when every row is valid; the server parses and validates the file again on apply.

When email matches an existing employee, the import updates first name, last name, department, and salary. A changed salary adds a history entry with reason `Spreadsheet import`; an unchanged salary does not add one. Country, currency, and start date must match the existing record. Correct mismatches before import or use a future dedicated correction workflow. The apply transaction commits all rows or none.
