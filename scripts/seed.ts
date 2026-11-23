import { closeDatabase, ensureSchema, getDatabase } from '../src/lib/db';

const db = getDatabase();
const first = ['Aarav','Mia','Noah','Isha','Liam','Emma','Oliver','Sophia','Ethan','Ava','Lucas','Amelia','Leo','Isabella','Aria','James','Riya','Daniel','Fatima','Mateo'];
const last = ['Shah','Patel','Smith','Brown','Garcia','Miller','Nguyen','Khan','Taylor','Wilson','Chen','Singh','Davis','Martin','Lee','Thomas','White','Clark','Lopez','Walker'];
const departments = ['Engineering','Product','Design','Sales','Marketing','Finance','People','Operations'];
const locations = [
  { country: 'US', currency: 'USD', base: 8_000_000 },
  { country: 'IN', currency: 'INR', base: 2_400_000 },
  { country: 'GB', currency: 'GBP', base: 5_000_000 },
  { country: 'DE', currency: 'EUR', base: 5_600_000 },
  { country: 'CA', currency: 'CAD', base: 7_000_000 }
];

await ensureSchema(db);
for (let start = 1; start <= 10_000; start += 250) {
  const values: unknown[] = [];
  const placeholders: string[] = [];
  for (let id = start; id < start + 250; id++) {
    const place = locations[(id * 7) % locations.length];
    const firstName = first[(id * 13) % first.length];
    const lastName = last[(id * 17) % last.length];
    const department = departments[(id * 11) % departments.length];
    const startDate = new Date(Date.UTC(2015 + (id % 11), (id * 3) % 12, 1 + (id % 27))).toISOString().slice(0, 10);
    const salaryMinor = place.base + ((id * 7919) % 8_000_000);
    values.push(id, firstName, lastName, `employee${id}@example.test`, department, place.country, place.currency, startDate, salaryMinor, startDate);
    placeholders.push('(?,?,?,?,?,?,?,?,?,?)');
  }
  await db.execute(`INSERT INTO employees
    (id, first_name, last_name, email, department, country, currency, start_date, salary_minor, salary_effective_date)
    VALUES ${placeholders.join(',')} ON DUPLICATE KEY UPDATE id = id`, values);
  if (start % 2500 === 1) console.log(`Seeded ${Math.min(start + 249, 10_000)}/10,000`);
}
const result = await db.query<{ count: number }>('SELECT COUNT(*) AS count FROM employees');
console.log(`Seed complete: ${result[0].count} employees. Existing records were left untouched.`);
await closeDatabase();
