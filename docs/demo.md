# Demo walkthrough

The [recorded browser demo](demo/salary-management-demo.webm) shows the local MySQL-backed application with 10,000 synthetic employees. It signs in as the HR demo user, opens the payroll overview, browses and searches the employee directory, records a salary change with a reason, previews a spreadsheet import, and signs out.

The recording is an actual browser session against the built local application. It does not prove that the Hostinger database or Vercel deployment is live; those require separate verification after deployment.

To regenerate after `npm run auth:setup && npm run build && npm run start -- --hostname 127.0.0.1`, run `node --import tsx scripts/record-demo.ts`. Set `DEMO_BASE_URL` when the app runs on another local port.
