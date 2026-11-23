import { chromium, type Page } from "playwright";
import { randomBytes } from "node:crypto";
import { mkdir, rename, rm } from "node:fs/promises";
import { getDatabase, closeDatabase } from "../src/server/db/connection";
import {
  createSession,
  hashPassword,
  type User,
} from "../src/server/auth/session";

// Operates only against local synthetic data. Replace the video only after success.
const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3100";
if (
  !["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname) ||
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL ?? "").hostname,
  )
)
  throw Error("Demo recording requires a local app and database");
const db = getDatabase();
const email = `demo-${Date.now()}@example.test`;
const temporary = randomBytes(18).toString("base64url");
const changed = randomBytes(18).toString("base64url");
const saltHash = hashPassword(temporary);
let userId: number | undefined;
let employeeId: number | undefined;
let adminCreatedId: number | undefined;
const recordingDir = `.data/recording-${Date.now()}`;
await mkdir(recordingDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: recordingDir, size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const pause = () => page.waitForTimeout(1100);
async function login(target: Page, password: string) {
  await target.goto(baseUrl);
  await target.getByLabel("Email", { exact: true }).fill(email);
  await target.getByLabel("Password", { exact: true }).fill(password);
  await target.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function expectStatus(response: { status(): number }, expected: number) {
  if (response.status() !== expected)
    throw Error(`Expected HTTP ${expected}, received ${response.status()}`);
}
let complete = false;
try {
  userId = (
    await db.execute(
      "INSERT INTO users(name,email,role,password_salt,password_hash) VALUES (?,?,'hr',?,?)",
      ["Demo HR", email, saltHash.salt, saltHash.hash],
    )
  ).insertId;
  await expectStatus(
    await context.request.get(`${baseUrl}/api/employees`),
    401,
  );
  await login(page, temporary);
  await page
    .getByText("Change your initial password before accessing the workspace.")
    .waitFor();
  await expectStatus(
    await context.request.get(`${baseUrl}/api/employees`),
    403,
  );
  await page.getByLabel("Current password", { exact: true }).fill(temporary);
  await page
    .getByLabel("New password (at least 12 characters)", { exact: true })
    .fill(changed);
  await page.getByLabel("Confirm new password", { exact: true }).fill(changed);
  await page
    .getByRole("button", { name: "Change password and sign in again" })
    .click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await login(page, temporary);
  await page
    .getByRole("alert")
    .filter({ hasText: "Invalid email or password" })
    .waitFor();
  await login(page, changed);
  await page.getByRole("heading", { name: "People at a glance" }).waitFor();
  await expectStatus(await context.request.get(`${baseUrl}/api/users`), 403);
  await pause();
  await page
    .getByLabel("Employees by department chart type")
    .selectOption("donut");
  await page.getByLabel("Salary distribution chart type").selectOption("donut");
  await page.getByLabel("Salary distribution currency").selectOption("GBP");
  await page.locator(".overview-charts").scrollIntoViewIfNeeded();
  await pause();
  await page.getByRole("button", { name: /Employees/ }).click();
  await page.getByLabel("Search employees").fill("employee1");
  await page.locator("tbody tr").first().waitFor();
  await pause();
  await page
    .getByRole("button", { name: "Import spreadsheet", exact: true })
    .click();
  const csv = `firstName,lastName,email,department,country,currency,startDate,annualSalary,salaryEffectiveDate\nDemo,Employee,${email},Engineering,US,USD,2024-01-01,95000,2024-01-01\n`;
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "demo.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await page.getByRole("button", { name: "Preview import" }).click();
  await page.getByText("Review changes").waitFor();
  await pause();
  await page.getByRole("button", { name: /Apply/ }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("button", { name: "Close", exact: true })
    .waitFor({ state: "hidden" });
  const [employee] = await db.query<{ id: number }>(
    "SELECT id FROM employees WHERE email=?",
    [email],
  );
  employeeId = employee.id;
  await page.getByLabel("Search employees").fill(email);
  await page.locator("tbody tr").filter({ hasText: email }).click();
  await page
    .getByRole("button", { name: "Change salary", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: /New annual salary/ })
    .fill("100000");
  await page
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Annual review");
  await page
    .getByRole("button", { name: "Save salary change", exact: true })
    .click();
  await page
    .locator(".history-item")
    .getByText("Annual review", { exact: true })
    .waitFor();
  await pause();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("link", { name: "Open profile" }).click();
  await page.getByRole("heading", { name: "Account", exact: true }).waitFor();
  await pause();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await expectStatus(
    await context.request.get(`${baseUrl}/api/employees`),
    401,
  );
  // Admin controls use an existing local admin session; no admin credentials are changed.
  const [admin] = await db.query<User>(
    "SELECT id,name,email,role,must_change_password AS mustChangePassword,active,session_version AS sessionVersion FROM users WHERE role='admin'",
  );
  if (!admin || admin.mustChangePassword)
    throw Error(
      "Finish local admin initial-password setup before recording admin controls",
    );
  await context.addCookies([
    {
      name: "salary_session",
      value: createSession(admin),
      domain: new URL(baseUrl).hostname,
      path: "/",
    },
  ]);
  await page.goto(`${baseUrl}/account`);
  await page.getByLabel("Search HR accounts").fill(email);
  await pause();
  const row = page.locator(".hr-row").filter({ hasText: email });
  await row.getByRole("button", { name: "Disable", exact: true }).click();
  await row.getByRole("button", { name: "Enable", exact: true }).waitFor();
  const loginContext = await browser.newContext();
  await expectStatus(
    await loginContext.request.post(`${baseUrl}/api/auth/login`, {
      data: { email, password: changed },
    }),
    401,
  );
  await row.getByRole("button", { name: "Enable", exact: true }).click();
  await row.getByRole("button", { name: "Disable", exact: true }).waitFor();
  await row
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: `Temporary password for ${email}` })
    .waitFor();
  const resetText = await page.getByRole("status").innerText();
  const resetPassword = resetText.slice(resetText.indexOf(": ") + 2);
  await expectStatus(
    await loginContext.request.post(`${baseUrl}/api/auth/login`, {
      data: { email, password: changed },
    }),
    401,
  );
  await expectStatus(
    await loginContext.request.post(`${baseUrl}/api/auth/login`, {
      data: { email, password: resetPassword },
    }),
    200,
  );
  await expectStatus(
    await loginContext.request.get(`${baseUrl}/api/employees`),
    403,
  );
  await loginContext.close();
  // Remove the temporary password from the recorded viewport before pausing.
  await page
    .getByRole("heading", { name: "Account", exact: true })
    .scrollIntoViewIfNeeded();
  await pause();
  await page.getByLabel("Name", { exact: true }).fill("Demo New HR");
  await page.getByLabel("Email", { exact: true }).fill(`new-${email}`);
  await page.getByRole("button", { name: "Add HR user", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Temporary password:" })
    .waitFor();
  const [created] = await db.query<{ id: number }>(
    "SELECT id FROM users WHERE email=?",
    [`new-${email}`],
  );
  adminCreatedId = created.id;
  await page.getByLabel("Search HR accounts").fill(`new-${email}`);
  await page
    .locator(".hr-row")
    .filter({ hasText: `new-${email}` })
    .waitFor();
  await pause();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  await pause();
  if (errors.length) throw Error(errors.join(";"));
  complete = true;
  console.log(
    "Full browser workflow passed: first password, old-password rejection, HR authorization, import apply, salary history, logout, admin creation, disable/enable and reset login.",
  );
} finally {
  await context.close();
  await browser.close();
  if (!employeeId) {
    const [leftover] = await db.query<{ id: number }>(
      "SELECT id FROM employees WHERE email=?",
      [email],
    );
    employeeId = leftover?.id;
  }
  if (employeeId) {
    await db.execute("DELETE FROM salary_changes WHERE employee_id=?", [
      employeeId,
    ]);
    await db.execute("DELETE FROM employees WHERE id=?", [employeeId]);
  }
  if (adminCreatedId)
    await db.execute("DELETE FROM users WHERE id=?", [adminCreatedId]);
  if (userId) await db.execute("DELETE FROM users WHERE id=?", [userId]);
  await closeDatabase();
  if (complete) {
    const video = page.video();
    if (!video) throw Error("Missing video");
    await mkdir("docs/demo", { recursive: true });
    await rename(await video.path(), "docs/demo/salary-management-demo.webm");
    await rm(recordingDir, { recursive: true, force: true });
    console.log("Saved docs/demo/salary-management-demo.webm");
  }
}
