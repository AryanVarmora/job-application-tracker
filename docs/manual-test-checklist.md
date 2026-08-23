# Manual Test Checklist

Automated coverage lives in `server/src/__tests__/smoke.e2e.test.ts` (unit + API-level, AI call
stubbed). Use this checklist against a real deployed environment to verify the parts automation
can't: the actual browser UI, and a real call to the production AI provider (Gemini).

Run through this after every deploy of a change that touches the AI analysis path, the API, or the
frontend build.

## Setup
- [ ] Open the deployed frontend URL
- [ ] Confirm the page loads with no console errors (check browser devtools console)

## Core flow: create -> analyze -> dashboard
- [ ] Click "New Application", fill in company name, role, applied date, status = Applied, submit
- [ ] New application appears in the "Applied" column of the kanban board
- [ ] Open the application, paste a real job description into the analyze panel, submit
- [ ] Analysis returns within a few seconds: required skills, preferred skills, seniority level,
      2-sentence summary, and a fit score (0-100) are all populated
- [ ] Skill breakdown shows matched vs. missing skills against your verified skill set
- [ ] Resume suggestion panel shows a suggested variant based on the breakdown
- [ ] Navigate to the Dashboard — the new application appears in "applications over time",
      the fit-score trend chart, and the status pie chart
- [ ] Drag the application card to a different column (e.g. Applied -> Interviewing); status
      persists after a page refresh

## Edit / delete
- [ ] Edit the application (change role or notes), save, confirm changes persist after refresh
- [ ] Delete the application, confirm it disappears from the board and dashboard

## Provider check (production only)
- [ ] Confirm the analysis in the core flow above came from Gemini, not Ollama — check backend
      logs/response for no Ollama-connection errors, and that `NODE_ENV=production` /
      `GEMINI_API_KEY` are set on the deployed backend
- [ ] Confirm no `OLLAMA_*` variables are required for the deployed backend to work

## Cross-service sanity
- [ ] Backend `GET /health` returns `{"status":"ok"}`
- [ ] CORS: frontend can call the backend without CORS errors (`CLIENT_ORIGIN` matches the
      deployed frontend origin)
- [ ] Reload the frontend after backend redeploy — data still loads (Postgres persisted correctly
      through `prisma migrate deploy`)
