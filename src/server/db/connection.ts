import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

export type Row = Record<string, unknown>;
export interface Database {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(
    sql: string,
    params?: unknown[],
  ): Promise<{ insertId: number; affectedRows: number }>;
  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T>;
}

declare global {
  var salaryPool: Pool | undefined;
}

function fromConnection(connection: Pool | PoolConnection): Database {
  return {
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        sql,
        params as (string | number | null)[],
      );
      return rows as T[];
    },
    async execute(sql: string, params: unknown[] = []) {
      const [result] = await connection.execute<ResultSetHeader>(
        sql,
        params as (string | number | null)[],
      );
      return { insertId: result.insertId, affectedRows: result.affectedRows };
    },
    async transaction<T>(work: (tx: Database) => Promise<T>) {
      if (!("getConnection" in connection))
        throw new Error("Nested transactions are not supported");
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
    },
  };
}

export function getDatabase(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  globalThis.salaryPool ??= mysql.createPool({
    uri: url,
    charset: "utf8mb4_unicode_ci",
    waitForConnections: true,
    connectionLimit: process.env.VERCEL ? 2 : 10,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
  return fromConnection(globalThis.salaryPool);
}

export async function closeDatabase() {
  await globalThis.salaryPool?.end();
  globalThis.salaryPool = undefined;
}
