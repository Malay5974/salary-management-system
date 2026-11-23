import { chromium } from "playwright";
import { createSession } from "../src/server/auth/session";
import { getDatabase, closeDatabase } from "../src/server/db/connection";
import type { User } from "../src/server/auth/session";
if (
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL ?? "").hostname,
  )
)
  throw Error("UI checks require a local database");
const browser = await chromium.launch({ headless: true });
try {
  const users = await getDatabase().query<User>(
    "SELECT id,name,email,role,must_change_password AS mustChangePassword,active,session_version AS sessionVersion FROM users WHERE active=TRUE ORDER BY role,id LIMIT 2",
  );
  for (const user of users) {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "salary_session",
        value: createSession(user),
        domain: "localhost",
        path: "/",
      },
    ]);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("http://localhost:3000/account");
      await page
        .getByRole("heading", { name: "Account", exact: true })
        .waitFor();
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error(`Overflow ${user.role} ${width}`);
      const styles = await page
        .locator("button")
        .evaluateAll((buttons) =>
          buttons.map((b) => ({
            bg: getComputedStyle(b).backgroundColor,
            radius: getComputedStyle(b).borderRadius,
          })),
        );
      if (styles.some((s) => s.radius === "0px"))
        throw Error("Unstyled button");
      await page.screenshot({
        path: `.data/account-${user.role}-${width}.png`,
        fullPage: true,
      });
    }
    if (user.role === "admin" && !user.mustChangePassword) {
      await page.goto("http://localhost:3000/");
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const profile = page.getByRole("link", {
          name: "Open profile",
          exact: true,
        });
        const logout = page.getByRole("button", {
          name: "Logout",
          exact: true,
        });
        await profile.waitFor();
        const box = await logout.boundingBox();
        if (!box || box.y < 650 || box.x > 250)
          throw Error("Logout is not at sidebar bottom");
        await page.screenshot({ path: `.data/sidebar-${width}.png` });
      }
      await page
        .getByLabel("Employees by department chart type")
        .selectOption("donut");
      await page
        .getByRole("img", { name: /Employees by department:/ })
        .waitFor();
      await page
        .getByLabel("Salary distribution chart type")
        .selectOption("donut");
      await page.getByLabel("Salary distribution currency").selectOption("INR");
      await page.getByRole("img", { name: /Salary distribution:/ }).waitFor();
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/summary?country=GB") && r.status() === 200,
        ),
        page.getByLabel("Summary country").selectOption("GB"),
      ]);
      await page.waitForFunction(
        () =>
          (
            document.querySelector(
              '[aria-label="Salary distribution currency"]',
            ) as HTMLSelectElement
          )?.value === "GBP",
      );
      await page
        .getByLabel("Salary distribution currency")
        .getByRole("option", { name: "GBP", exact: true })
        .waitFor({ state: "attached" });
      if (
        (await page.getByLabel("Salary distribution currency").inputValue()) !==
        "GBP"
      )
        throw Error("Chart currency did not follow filter");
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Chart mobile overflow");
      await page.screenshot({
        path: ".data/overview-charts-mobile.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: ".data/overview-charts-desktop.png",
        fullPage: true,
      });
      console.log(
        "Chart type switching, currency selection and country filters passed",
      );
      await page
        .getByRole("link", { name: "Open profile", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Account", exact: true })
        .waitFor();
      console.log(
        "Bottom-left user profile link and Logout verified on desktop and mobile",
      );
      const search = page.getByRole("searchbox", {
        name: "Search HR accounts",
      });
      await page.locator(".hr-row").first().waitFor();
      const firstEmail = await page.locator(".hr-row").first().innerText();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      if ((await page.locator(".hr-row").first().innerText()) === firstEmail)
        throw Error("Pagination did not change rows");
      await search.fill("hr1@acme.test");
      await page
        .locator(".hr-row")
        .filter({ hasText: "hr1@acme.test" })
        .waitFor();
      if ((await page.locator(".hr-row").count()) !== 1)
        throw Error("Email search failed");
      await search.fill("no-such-hr-account");
      await page.getByText("No HR accounts match your search.").waitFor();
      await search.fill("");
      console.log("HR pagination, email search and empty results passed");
      const email = `ui-check-${Date.now()}@example.test`;
      let id: number | undefined;
      try {
        await page.getByLabel("Name", { exact: true }).fill("UI Check");
        await page.getByLabel("Email", { exact: true }).fill(email);
        await page
          .getByRole("button", { name: "Add HR user", exact: true })
          .click();
        await page
          .getByRole("status")
          .filter({ hasText: "Temporary password:" })
          .waitFor();
        const [row] = await getDatabase().query<{ id: number }>(
          "SELECT id FROM users WHERE email=?",
          [email],
        );
        id = row.id;
        const item = page.locator(".hr-row").filter({ hasText: email });
        await item
          .getByRole("button", { name: "Disable", exact: true })
          .click();
        await item
          .getByRole("button", { name: "Enable", exact: true })
          .waitFor();
        await item.getByRole("button", { name: "Enable", exact: true }).click();
        await item
          .getByRole("button", { name: "Disable", exact: true })
          .waitFor();
        await item
          .getByRole("button", { name: "Reset password", exact: true })
          .click();
        await page
          .getByRole("status")
          .filter({ hasText: `Temporary password for ${email}` })
          .waitFor();
        console.log("Admin create, disable, enable and reset controls passed");
      } finally {
        if (id)
          await getDatabase().execute("DELETE FROM users WHERE id=?", [id]);
      }
    }
    if (errors.length) throw Error(errors.join(";"));
    console.log(`${user.role}: desktop/mobile layouts and buttons passed`);
    await context.close();
  }
} finally {
  await browser.close();
  await closeDatabase();
}
