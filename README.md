# Ponte - Phase 1

[Português (Brasil)](README.pt-BR.md) | **English**

A private job-search workspace over the owner's existing Google Sheets, with a public static entry page. Portuguese/English interface.

**Interface preview:** https://ponte-vat.pages.dev/  
**Source:** private repository. Documentation reviewed on 2026-10-01.

## Status

Deployed on 2026-10-01 (Europe/Stockholm) through Cloudflare Pages Git integration from this private repository. Cloudflare Free; no paid upgrade or card added. Git deployments use `main`, no framework, build `npm test && npm run build`, output `dist`. The public deployment contains only the interface, not contact or application rows.

Google OAuth and Picker configuration is pending. Clicking Connect reports that Google is not configured and loads no private data. Blank config fails closed; it never loads mock or private data. **Not yet accepted for use.** The empty direct-upload project `ponte-preview` remains from two failed ZIP attempts; it is not the published app.

Application board/list, literal statuses, read-only network, dashboard and limited Status/Notes editing are implemented in the interface.

## Purpose and planning

Ponte organizes a real job search without moving data out of the owner's Google Sheets: applications stay in the tracker sheet, contacts stay in the people/company sheets, and the app is a careful window over them. The design rule is fail closed: any doubt about configuration, schema or identity means no data is loaded and nothing is written.

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
| `config.js` | Public Google identifiers (never secrets). |
| `build.js` | Static build into `dist/`. |
| `model.test.js`, `api.test.js` | Unit tests (`node --test`). |
| `ui-check.js` | Synthetic UI flows via Playwright (`npm run test:ui`). |

Node 22+, no production dependencies.

## Data contract and boundaries

Tracker `Candidaturas!A:N`: exact approved A:M headers plus `ID Ponte` in N. Missing/duplicate IDs fail closed. Blank rows/dates stay blank. Networking records are never applications. Literal statuses remain separate; prepared CV is not a submission, suspended/rejected is not an offer. A date by itself is not evidence of receipt.

Contacts originally used `Contatos!A:K`, later `Pessoas - geral` plus three per-company tabs. On 2026-09-30 all 10 per-company contacts were checked against `Pessoas - geral` before the Example Corp A/Example Agency/Example Corp B tabs were deleted under the owner's instruction as redundant, keeping only `Pessoas - geral` (A:K, unchanged headers) and `Empresas` (A:O). The network now reads only those two tabs and offers two views: Pessoas (individual contacts with represented company/entity from the Empresa column) and Empresas (company cards that also list the mapped people working there, matched by normalized name/prefix between the company name and each contact's Empresa, plus their contact links). It does not deduplicate contacts or infer relationships beyond that name match. No contact-sheet mutation. Legacy Contatos is accepted only when Pessoas - geral is absent; Empresas is optional.

Before editing: validate account/session, selected files, sheets and exact headers; reload all rows, locate stable ID, compare the complete original A:N row. Write only J:K using RAW input. Read again and confirm actual stored values before showing success. Cancel never writes. Retry after an uncertain save requires refreshing to avoid blind repeat writes.

**Concurrency limit:** Google Sheets does not offer conditional updates here. Checks reduce conflicts but another writer can change/reorder a row between the read and write. Do not treat this as concurrency-safe. Avoid simultaneous edits; the limitation must be validated with the owner before enabling general use.

## Google connection

Create a dedicated Google project with billing disabled. Enable Sheets, Drive and Picker APIs. Configure external OAuth in Testing, add the actual owner account as test user and register only the deployed app origin. Public `config.js` accepts an OAuth client ID, project number/app ID and an HTTP-referrer/API-restricted Picker API key. These are public browser identifiers, never a client secret. Tokens are held only in memory; no local/session storage, cookies or private rows in code.

Scopes: `openid email profile drive.file`. Picker explicitly selects tracker then contacts; no broad spreadsheets or Drive scopes. The permission covers entire selected files, while application behavior restricts writes to J:K (Status/Notas). Owner confirms email in UI and userinfo must match. Seven-day Testing authorization expiry requires reconnection; short-lived tokens are cleared at expiry and disconnect. Disconnect-and-revoke additionally revokes the Google grant.

Cost gate: the Sheets API limits page now says standard API use has no additional cost but over-quota billing is planned later in 2026. Before enabling APIs, verify a dedicated project with no linked billing cannot incur a charge; if not guaranteed, stop. No Google project created or API activated yet. Console sign-in for the intended owner account was blocked by a rejected saved password; no recovery/reset attempted.

## Security and privacy

DOM construction uses textContent for all sheet values; no sheet HTML is executed. Only HTTPS links allowed, with noreferrer/no-referrer. No private data in source, logs, static HTML or persistent cache. Expiry/disconnect clears rendered private data. No analytics, service worker or persistent cache. Security headers provided for Cloudflare. The public deployment contains only interface assets and public Google configuration. Privacy depends also on the owner's Google account and sharing settings, not on a promise of absolute secrecy.

## Testing

Unit tests cover exact status/type, networking exclusion, date validation, missing/duplicate IDs, schema mismatch, reorder lookup, conflict blocking, unsafe URLs and blank fields. 24 model/API tests passed. Synthetic OAuth/Picker/Sheets flows passed at 390, 820 and 1440 px: connection, file choice, dashboard, board/list, Cancel (zero writes), Save (one RAW write and reread), two-view network (Pessoas/Empresas), language switch and disconnect clearing private rows. Actual pixels from synthetic-flow captures were inspected.

These mocks are not evidence that real Google OAuth works. Live OAuth, denied access, failed writes, round-trip save, real-data phone/tablet/desktop checks and screen-reader checks are still pending. No real application changes should be used as test fixtures. Private datasets must never be committed.

On 2026-09-30 the `ID Ponte` header and 48 UUIDs were added only in tracker N1:N49, under owner approval. Reread confirmed exact IDs and unchanged A:M cell values, normalizing omitted trailing blanks. No application Status/Notes or contact values changed.

## Run and deployment

```bash
npm test
npm run build
```

Serve `dist` over HTTPS. Cloudflare Pages: build `npm test && npm run build`, output `dist`, no framework. Keep the repo private. No billing/card, server, analytics or Gemini integration.

## Phase 1 exclusions and roadmap

No new/deleted applications, drag/drop, contact editing, reminders, messages, CV downloads, Gemini or payment infrastructure. Next steps are literal contact text, not scheduled reminders.

- [ ] Create the dedicated Google project and complete OAuth/Picker configuration.
- [ ] Run the pending live checks (OAuth, denied access, failed writes, round-trip save, real devices, screen reader).
- [ ] Validate the concurrency limitation with the owner before general use.
- [ ] Remove the leftover empty `ponte-preview` direct-upload project.

## Credits and license status

Built with vanilla JavaScript and Node's test runner; Playwright for synthetic UI checks. No `LICENSE` file was found at the repository root during this review; this update does not introduce one.
