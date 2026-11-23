import type { Database } from "../db/connection";

export type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  country: string;
  currency: string;
  startDate: string;
  salaryMinor: string;
  salaryEffectiveDate: string;
};
export type HistoryRow = {
  id: string;
  oldSalaryMinor: string;
  newSalaryMinor: string;
  effectiveDate: string;
  reason: string;
  changedAt: string;
};
export type SalaryRow = {
  country: string;
  department: string;
  currency: string;
  salaryMinor: string;
};

const employeeColumns = `id, first_name AS firstName, last_name AS lastName, email,
  department, country, currency, start_date AS startDate,
  salary_minor AS salaryMinor, salary_effective_date AS salaryEffectiveDate`;

export type ListFilter = {
  q: string;
  country: string;
  department: string;
  page: number;
  pageSize: number;
  sort: "name" | "salary_asc" | "salary_desc" | "recently_updated";
};
export async function listEmployeeRows(db: Database, filter: ListFilter) {
  const { where, params } = employeeWhere(filter);
  const order = {
    name: "last_name ASC, first_name ASC, id ASC",
    salary_asc: "salary_minor ASC, id ASC",
    salary_desc: "salary_minor DESC, id ASC",
    recently_updated: "updated_at DESC, id DESC",
  }[filter.sort];
  const [items, counts] = await Promise.all([
    db.query<EmployeeRow>(
      `SELECT ${employeeColumns} FROM employees ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, filter.pageSize, (filter.page - 1) * filter.pageSize],
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*) AS count FROM employees ${where}`,
      params,
    ),
  ]);
  return { items, total: Number(counts[0].count) };
}

export async function findEmployee(
  db: Database,
  id: number,
): Promise<EmployeeRow | null> {
  return (
    (
      await db.query<EmployeeRow>(
        `SELECT ${employeeColumns} FROM employees WHERE id = ?`,
        [id],
      )
    )[0] ?? null
  );
}
export async function findEmployeeByEmail(
  db: Database,
  email: string,
): Promise<EmployeeRow | null> {
  return (
    (
      await db.query<EmployeeRow>(
        `SELECT ${employeeColumns} FROM employees WHERE email = ?`,
        [email],
      )
    )[0] ?? null
  );
}
export async function findSalaryHistory(db: Database, id: number) {
  return db.query<HistoryRow>(
    `SELECT id, old_salary_minor AS oldSalaryMinor, new_salary_minor AS newSalaryMinor,
    effective_date AS effectiveDate, reason, changed_at AS changedAt
    FROM salary_changes WHERE employee_id = ? ORDER BY changed_at DESC, id DESC LIMIT 100`,
    [id],
  );
}
export type NewEmployee = Omit<EmployeeRow, "id">;
export async function insertEmployee(db: Database, employee: NewEmployee) {
  const result = await db.execute(
    `INSERT INTO employees
    (first_name, last_name, email, department, country, currency, start_date, salary_minor, salary_effective_date)
    VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.department,
      employee.country,
      employee.currency,
      employee.startDate,
      employee.salaryMinor,
      employee.salaryEffectiveDate,
    ],
  );
  return result.insertId;
}
export async function lockEmployee(
  db: Database,
  id: number,
): Promise<EmployeeRow | null> {
  return (
    (
      await db.query<EmployeeRow>(
        `SELECT ${employeeColumns} FROM employees WHERE id = ? FOR UPDATE`,
        [id],
      )
    )[0] ?? null
  );
}
export async function updateSalary(
  db: Database,
  id: number,
  salaryMinor: number,
  effectiveDate: string,
) {
  await db.execute(
    "UPDATE employees SET salary_minor = ?, salary_effective_date = ? WHERE id = ?",
    [salaryMinor, effectiveDate, id],
  );
}
export async function insertSalaryHistory(
  db: Database,
  id: number,
  oldSalaryMinor: number,
  newSalaryMinor: number,
  effectiveDate: string,
  reason: string,
) {
  await db.execute(
    `INSERT INTO salary_changes (employee_id, old_salary_minor, new_salary_minor, effective_date, reason)
    VALUES (?,?,?,?,?)`,
    [id, oldSalaryMinor, newSalaryMinor, effectiveDate, reason],
  );
}
export async function listSalaryRows(
  db: Database,
  filter: { country: string; department: string },
) {
  const { where, params } = employeeWhere(filter);
  return db.query<SalaryRow>(
    `SELECT country, department, currency, salary_minor AS salaryMinor FROM employees ${where}`,
    params,
  );
}

function employeeWhere(filter: {
  q?: string;
  country: string;
  department: string;
}) {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter.q) {
    conditions.push(
      "LOCATE(LOWER(?), LOWER(CONCAT(first_name, ' ', last_name, ' ', email))) > 0",
    );
    params.push(filter.q);
  }
  if (filter.country) {
    conditions.push("country = ?");
    params.push(filter.country);
  }
  if (filter.department) {
    conditions.push("department = ?");
    params.push(filter.department);
  }
  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}
