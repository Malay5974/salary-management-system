import { closeDatabase, getDatabase } from '../src/server/db/connection';
import { runMigrations } from '../src/server/db/migrations';

try {
  await runMigrations(getDatabase());
  console.log('Database migrations complete.');
} finally {
  await closeDatabase();
}
