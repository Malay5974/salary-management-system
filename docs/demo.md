# Demo walkthrough

The [current browser recording](demo/salary-management-demo.webm) shows the production build running locally with synthetic data.

The recording covers HR first login and initial-password replacement; rejection of the old password; Overview charts and currency selection; employee search; CSV preview and apply; salary change/history; profile navigation and logout; and admin HR search, creation, disable/enable, and password reset. The script also asserts that HR access to account administration is forbidden, a disabled account cannot log in, a reset invalidates its former password, and reset login requires a password change.

Run against local synthetic data only:

```bash
npm run build
node --env-file=.env.local node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100
# In a second terminal:
node --env-file=.env.local --import tsx scripts/record-demo.ts
```

The recorder creates disposable HR and employee records and removes them afterward. The existing local admin must have completed initial-password setup. The admin segment uses a signed local test session; it does not demonstrate entering the admin password. Temporary demo credentials shown during account management belong to disposable accounts removed at completion.

Recording happens in an ignored temporary directory. The committed WebM is replaced only after the full workflow passes. This local video does not itself prove the hosted application works; live verification is recorded in verification notes.
