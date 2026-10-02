# Frontend

Minimal Next.js + Tailwind UI for the Property Valuation Compliance
Checker. See the [project root README](../README.md) for the full picture.

## Run it

```
cp .env.local.example .env.local   # points at the backend API, default localhost:3000
npm install
npm run dev                          # runs on http://localhost:3001
```

## Screens

- `/` — upload a PDF + report date, submits to the backend, redirects to `/jobs/[id]`.
- `/jobs/[id]` — polls job status every 2 seconds; shows processing state,
  then the verdict and full rule-by-rule breakdown once done.
