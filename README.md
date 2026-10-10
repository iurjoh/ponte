# Ponte

[Português (Brasil)](README.pt-BR.md) | **English**

A free, open-source job-search organizer. Your applications and contacts stay in your own Google Sheets; Ponte is a careful window over them. Portuguese/English interface, no server, no analytics, no cost.

**Live app:** https://ponte-vat.pages.dev/  
**Privacy policy:** https://ponte-vat.pages.dev/privacy.html  
**Questions and ideas:** [GitHub issues](https://github.com/iurjoh/ponte/issues)

## Status

Public and published. The Google OAuth app is in production (not in testing mode) and the public page is deployed from `main` through Cloudflare Pages Free (build `npm test && npm run build`, output `dist`). Live sign-in, Picker selection and round-trip saves with a real sheet are still being verified by the owner. See the roadmap below.

## What it does

- Application board and list with literal statuses.
- Read-only network view: people per company.
- Dashboard.
- Limited editing: only Status and Notes (columns J:K) of an application, confirmed by reading the cell back.

Everything else stays untouched. The design rule is fail closed: any doubt about configuration, schema or identity means nothing is loaded and nothing is written.

## How your data is handled

- Data lives only in your Google Sheets. The repository and the public page contain no personal data. All tests and examples use invented data.
- Sign-in uses Google OAuth with the `drive.file` scope plus `openid email profile`. You pick the tracker and contacts files with Google Picker; Ponte cannot see other files. Google's permission covers the whole selected files, while the app itself only writes Status and Notes.
- The access token lives in memory only. No cookies, no local storage of sheet content, no analytics, no server.
- Details: the [privacy policy](https://ponte-vat.pages.dev/privacy.html).

## Architecture

```text
Browser -> static interface (no framework, no production dependencies)
        -> Google OAuth + Picker (token in memory only)
        -> Google Sheets API: read tracker + people/company tabs
        -> limited writes: Status/Notes (columns J:K) with read-back confirmation
```

| File | Responsibility |
| --- | --- |
| `index.html`, `style.css` | Static interface shell and layout. |
| `app.js` | UI behavior, views, language switch. |
| `model.js` | Data rules: statuses, validation, matching. |
| `api.js` | Google OAuth, Picker and Sheets access. |
| `i18n.js` | Portuguese/English strings. |
| `config.js` | Public Google identifiers (client ID, Picker key). Never secrets. |
| `build.js` | Static build into `dist/`. |
| `*.test.js` | Unit tests (`node --test`). |
| `ui-check.js` | Synthetic UI flows via Playwright (`npm run test:ui`). |

Node 22+, no production dependencies.

## Data contract

Tracker `Candidaturas!A:N`: the approved A:M headers plus `ID Ponte` in N. Missing or duplicate IDs fail closed. Networking records are never applications. Contacts are read from separate people/company tabs and never modified.

Before an edit: validate the session, files, sheets and exact headers; reload the rows, find the stable ID, compare the full original row; write only J:K with RAW input; read again and confirm before showing success.

**Concurrency limit:** Google Sheets has no conditional update here. The checks reduce conflicts, but another writer can still change a row between read and write. Avoid editing the same row from two places at once.

## Run it yourself

```bash
npm test
npm run build
```

Serve `dist` over HTTPS. To use your own Google project, create an OAuth web client and a Picker API key, then put the client ID, project number and key in `config.js`. Restrict the key to the Picker API and your site. Never commit a client secret.

## Roadmap

Done:
- [x] Interface, data rules and tests (31 passing, synthetic data only).
- [x] Public deployment, privacy policy, Google branding, OAuth app published.
- [x] Google client ID and Picker key configured.

Next:
- [ ] Live checks with a real account: sign-in, denied access, failed write, round-trip save, phone/tablet/desktop, screen reader.
- [ ] Decide how to handle the concurrency limit.
- [ ] Ideas tracked as `future` issues (not commitments): Gmail alert reading, LinkedIn alert forwarding, a dedicated contact email, Google brand verification.

## Development history

Ponte started as an idea for organizing a job search without handing data to another service. The commit history was kept from the first documents to the public app and shows the whole path:

- 2026-09-30: privacy, scope and setup defined; model, API layer, bilingual interface, build, tests, company/people network views.
- 2026-10-01: first Cloudflare Pages preview, README restructured, Portuguese README added.
- 2026-10-07/08: bilingual documentation standard, Google setup notes, recovery and ambiguous-write tests.
- 2026-10-10: public repository with a rewritten history using invented names, privacy page, OAuth branding, app published, Google config in place. The earlier private repository is kept as an archive.

## License

[MIT](LICENSE) (c) 2026 Iuri Johansson.
