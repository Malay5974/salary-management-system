# Demo walkthrough

The [recorded browser demo](demo/salary-management-demo.webm) shows the locally seeded application with 10,000 synthetic employees. It opens the payroll overview, browses and searches the employee directory, inspects an employee, records a salary change with a reason, and returns to the summary.

The recording is an actual browser session against the built local application. It does not prove that the Vercel deployment is live; that is verified separately after deployment.

To regenerate after `npm run build && npm run start -- --hostname 127.0.0.1`, run `node --import tsx scripts/record-demo.ts`.
