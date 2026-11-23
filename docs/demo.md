# Demo walkthrough

The [existing browser recording](demo/salary-management-demo.webm) demonstrates the earlier local application: shared HR sign-in, 10,000 synthetic employees, salary overview, employee search, salary change/history, spreadsheet preview, and sign-out.

**This recording is outdated.** It predates database-backed admin/HR accounts, mandatory password changes, HR account management, the revised sidebar, and configurable charts. It is not evidence that the current authentication workflow or hosted deployment has been verified.

## Replacement recording checklist

After completing authentication verification and deployment, record the current app showing:

1. HR sign-in and initial-password replacement, without exposing credentials in the final video.
2. Overview filters and Bar/Donut charts, including salary-currency selection.
3. Employee search, sorting, pagination, salary change, and history.
4. Spreadsheet preview and apply with a valid sample.
5. Admin-only HR search/pagination, creation, disable/enable, and password reset.
6. Profile navigation through the sidebar identity and Logout.

`scripts/record-demo.ts` is also outdated: it reads the former `.data/demo-login.txt`, assumes the former login workflow, and uses the old Sign out label. Update and verify that script as part of the separate demo-recording step before running it. It deletes the existing WebM before recording, so preserve the current artifact until its replacement succeeds.

The recording uses synthetic data. Local video does not prove that Vercel or Hostinger MariaDB is live; verify the hosted application separately and document the final URL.
