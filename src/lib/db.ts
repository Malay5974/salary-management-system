import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

export type Row = Record<string, unknown>;
export interface Database {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ insertId: number; affectedRows: number }>;
  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T>;
}

declare global {
  var salaryPool: Pool | undefined;
}

function fromConnection(connection: Pool | PoolConnection): Database {
  return {
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      const [rows] = await connection.execute<RowDataPacket[]>(sql, params as (string | number | null)[]);
      return rows as T[];
    },
    async execute(sql: string, params: unknown[] = []) {
      const [result] = await connection.execute<ResultSetHeader>(sql, params as (string | number | null)[]);
      return { insertId: result.insertId, affectedRows: result.affectedRows };
    },
    async transaction<T>(work: (tx: Database) => Promise<T>) {
      if (!('getConnection' in connection)) throw new Error('Nested transactions are not supported');
      const client = await connection.getConnection();
      try {
        await client.beginTransaction();
        const result = await work(fromConnection(client));
        await client.commit();
        return result;
      } catch (error) {
        await client.rollback();
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

export function getDatabase(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  globalThis.salaryPool ??= mysql.createPool({ uri: url, waitForConnections: true, connectionLimit: process.env.VERCEL ? 2 : 10, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true });
  return fromConnection(globalThis.salaryPool);
}

export async function closeDatabase() {
  await globalThis.salaryPool?.end();
  globalThis.salaryPool = undefined;
}

const schema = [
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
];

let ready: Promise<void> | undefined;
export function ensureSchema(db = getDatabase()): Promise<void> {
  ready ??= (async () => { for (const statement of schema) await db.execute(statement); })()
    .catch(error => { ready = undefined; throw error; });
  return ready;
}
