import { chromium } from "playwright";
import { randomBytes } from "node:crypto";
import { getDatabase, closeDatabase } from "../src/server/db/connection";
import { hashPassword } from "../src/server/auth/session";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.VERIFY_BASE_URL;
if (!baseUrl || !baseUrl.startsWith("https://salary-management-system-"))
  throw Error(
    "Set VERIFY_BASE_URL to the intended HTTPS Vercel salary deployment",
  );
if (
  new URL(process.env.DATABASE_URL ?? "").pathname !== "/u657228766_salary_prod"
)
  throw Error("Expected dedicated assessment database");
const db = getDatabase();
const email = `live-check-${Date.now()}@example.test`;
const initial = randomBytes(18).toString("base64url");
const changed = randomBytes(18).toString("base64url");
const password = hashPassword(initial);
let userId: number | undefined;
let employeeId: number | undefined;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
async function status(response: { status(): number }, expected: number) {
  if (response.status() !== expected)
    throw Error(`Expected HTTP ${expected}, received ${response.status()}`);
}
async function login(value: string) {
  await page.goto(baseUrl!);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
try {
  userId = (
    await db.execute(
      "INSERT INTO users(name,email,role,password_salt,password_hash) VALUES (?,?,'hr',?,?)",
      ["Live verification HR", email, password.salt, password.hash],
    )
  ).insertId;
  await status(await context.request.get(`${baseUrl}/api/employees`), 401);
  await login(initial);
  await page
    .getByText("Change your initial password before accessing the workspace.")
    .waitFor();
  await status(await context.request.get(`${baseUrl}/api/employees`), 403);
  await page.getByLabel("Current password", { exact: true }).fill(initial);
  await page
    .getByLabel("New password (at least 12 characters)", { exact: true })
    .fill(changed);
  await page.getByLabel("Confirm new password", { exact: true }).fill(changed);
  await page
    .getByRole("button", { name: "Change password and sign in again" })
    .click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await login(changed);
  await page.getByRole("heading", { name: "People at a glance" }).waitFor();
  const summaryResponse = await context.request.get(`${baseUrl}/api/summary`);
  const summary = await summaryResponse.json();
  if (!summaryResponse.ok())
    throw Error(
      `Summary HTTP ${summaryResponse.status()}: ${JSON.stringify(summary)}`,
    );
  if (summary.employeeCount !== 10000)
    throw Error(`Expected 10000 employees, got ${summary.employeeCount}`);
  await status(await context.request.get(`${baseUrl}/api/users`), 403);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .getByLabel("Employees by department chart type")
      .selectOption("donut");
    await page
      .getByLabel("Salary distribution chart type")
      .selectOption("donut");
    await page.getByRole("img", { name: /Employees by department:/ }).waitFor();
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Chart overflow");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mkdir(".data", { recursive: true });
    await page.screenshot({
      path: `.data/live-overview-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: /Employees/ }).click();
  await page.getByLabel("Search employees").fill("employee1@example.test");
  await page
    .locator("tbody tr")
    .filter({ hasText: "employee1@example.test" })
    .waitFor();
  const create = await context.request.post(`${baseUrl}/api/employees`, {
    data: {
      firstName: "Live",
      lastName: "Verification",
      email,
      department: "Engineering",
      country: "US",
      currency: "USD",
      startDate: "2024-01-01",
      salaryMinor: 9500000,
      salaryEffectiveDate: "2024-01-01",
    },
  });
  await status(create, 201);
  const created = await create.json();
  employeeId = created.id;
  if (!employeeId) throw Error("Missing created employee ID");
  await status(
    await context.request.post(
      `${baseUrl}/api/employees/${employeeId}/salary`,
      {
        data: {
          salaryMinor: 10000000,
          effectiveDate: "2026-01-01",
          reason: "Deployment verification",
        },
      },
    ),
    200,
  );
  const history = await (
    await context.request.get(`${baseUrl}/api/employees/${employeeId}`)
  ).json();
  if (history.history[0]?.reason !== "Deployment verification")
    throw Error("Missing salary audit");
  const csv = `firstName,lastName,email,department,country,currency,startDate,annualSalary,salaryEffectiveDate\nLive,Verification,${email},Product,US,USD,2024-01-01,105000,2026-02-01\n`;
  for (const action of ["preview", "apply"]) {
    const response = await context.request.post(
      `${baseUrl}/api/imports/${action}`,
      {
        multipart: {
          file: {
            name: "live-check.csv",
            mimeType: "text/csv",
            buffer: Buffer.from(csv),
          },
        },
      },
    );
    await status(response, 200);
    const result = await response.json();
    if (result.updateCount !== 1) throw Error(`Import ${action} failed`);
  }
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await status(await context.request.get(`${baseUrl}/api/employees`), 401);
  await db.execute(
    "UPDATE users SET active=FALSE,session_version=session_version+1 WHERE id=?",
    [userId],
  );
  await status(
    await context.request.post(`${baseUrl}/api/auth/login`, {
      data: { email, password: changed },
    }),
    401,
  );
  if (errors.length) throw Error(errors.join(";"));
  console.log(
    "Hosted verification passed: 10,000 records, real first login/password replacement, HR authorization, desktop/mobile charts, employee search/create, salary audit, import preview/apply, logout and disabled-account rejection.",
  );
} finally {
  await context.close();
  await browser.close();
  if (employeeId) {
    await db.execute("DELETE FROM salary_changes WHERE employee_id=?", [
      employeeId,
    ]);
    await db.execute("DELETE FROM employees WHERE id=?", [employeeId]);
  }
  if (userId) await db.execute("DELETE FROM users WHERE id=?", [userId]);
  await closeDatabase();
}
