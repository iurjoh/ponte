# Regression and gotcha register

Quality trial started 2026-10-20. Review friction around 2026-11-20. Pass counters below record new, independently evidenced runs only, not historical results.

## Regressions

No regression checks recorded yet. Entry format: - [YYYY-MM-DD] <bug> -> check: <deterministic re-run command> | consecutive passes: n/5. Do not record historical results as passes.

Five recorded consecutive passes make a check eligible for automation; adding CI is a separate code change. Record revision, environment and evidence before increasing a count. No automatic edits or release approval follow from a counter.

## Gotchas


- [2026-10-20] Fictitious data only in this public repo; the real-history archive lives in a separate private repo | source: owner instruction 2026-10-09 | version: current | validity: permanent | projects: ponte.
- [2026-10-20] In-app browsers (e.g. WhatsApp) behave differently; the README carries a one-line notice. Test share/open flows inside in-app browsers, not only desktop Chrome | source: owner session 2026-10-10 | version: current | validity: standing | projects: ponte (shared rule candidate: all public apps).
- [2026-10-20] The close (X) button flow was a fixed bug - keep it consistent when touching navigation | source: owner session 2026-10-10 | version: current | validity: recheck after navigation changes | projects: ponte.

## Check entry points

Inspect package.json scripts. Preview deploy on Cloudflare Pages with sample data - report exactly what ran and where.

If a gotcha is independently observed in a second project, propose a shared rule with both sources.
