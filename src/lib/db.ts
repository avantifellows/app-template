import { Pool, type QueryResultRow } from "pg";

/**
 * Live data, read-only. DATA_DATABASE_URL is a read-only role a dev gives you; every session is also set read-only,
 * so a write fails even if the role allowed it. Never copy what you read into the repo, a file or a log.
 *
 * This template has no database to write to on purpose. If the app needs to save anything, involve a dev.
 */
let pool: Pool | undefined;

function data(): Pool {
  const url = process.env.DATA_DATABASE_URL;
  if (!url) throw new Error("DATA_DATABASE_URL is not set: ask a dev for read-only credentials");
  pool ??= new Pool({ connectionString: url, max: 3, options: "-c default_transaction_read_only=on" });
  return pool;
}

export async function read<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await data().query<T>(sql, params)).rows;
}
