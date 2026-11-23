import { type Database, getDatabase } from './connection';

const migrations = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS employees (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(80) NOT NULL,
        last_name VARCHAR(80) NOT NULL,
        email VARCHAR(254) NOT NULL UNIQUE,
        department VARCHAR(80) NOT NULL,
        country CHAR(2) NOT NULL,
        currency CHAR(3) NOT NULL,
        start_date DATE NOT NULL,
        salary_minor BIGINT UNSIGNED NOT NULL,
        salary_effective_date DATE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX employees_name_idx (last_name, first_name, id),
        INDEX employees_country_department_idx (country, department)
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS salary_changes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        employee_id BIGINT UNSIGNED NOT NULL,
        old_salary_minor BIGINT UNSIGNED NOT NULL,
        new_salary_minor BIGINT UNSIGNED NOT NULL,
        effective_date DATE NOT NULL,
        reason VARCHAR(500) NOT NULL,
        changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX salary_changes_employee_idx (employee_id, changed_at),
        CONSTRAINT salary_changes_employee_fk FOREIGN KEY (employee_id) REFERENCES employees(id)
      ) ENGINE=InnoDB`
    ]
  },
  {
    version: 2,
    statements: [
      `ALTER TABLE employees ADD COLUMN updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
      `CREATE INDEX employees_updated_idx ON employees (updated_at, id)`
    ]
  }
  ,{ version: 3, statements: [
    `CREATE TABLE users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL, email VARCHAR(254) NOT NULL UNIQUE,
      role ENUM('admin','hr') NOT NULL DEFAULT 'hr',
      admin_slot TINYINT GENERATED ALWAYS AS (CASE WHEN role = 'admin' THEN 1 ELSE NULL END) STORED UNIQUE,
      password_salt VARCHAR(64) NOT NULL, password_hash VARCHAR(128) NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE, active BOOLEAN NOT NULL DEFAULT TRUE,
      session_version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`
  ] }
];

export async function runMigrations(db: Database = getDatabase()) {
  await db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INT NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  const applied = new Set((await db.query<{ version: number }>('SELECT version FROM schema_migrations')).map(row => Number(row.version)));
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    for (const statement of migration.statements) await db.execute(statement);
    await db.execute('INSERT IGNORE INTO schema_migrations (version) VALUES (?)', [migration.version]);
  }
}
