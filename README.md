# Ponte - Phase 1

A private job-search workspace over the owner's existing Google Sheets, with a public static entry page. Portuguese/English interface. Application board/list, literal statuses, read-only network, dashboard and limited Status/Notes editing.

## Status
Interface preview: https://ponte-vat.pages.dev/ . Deployed on 2026-10-01 (Europe/Stockholm) through Cloudflare Pages Git integration from the private repository https://github.com/iurjoh/ponte . Cloudflare Free; no paid upgrade or card added. Google OAuth and Picker configuration pending. Clicking Connect reports that Google is not configured and loads no private data. Blank config fails closed; it never loads mock or private data. **Not yet accepted for use.** The empty direct-upload project ponte-preview remains from two failed ZIP attempts; it is not the published app.

Git deployments use main, no framework, build `npm test && npm run build`, output `dist`. The public deployment contains only the interface, not contact or application rows.

## Run
Node 22+, no production dependencies:
```
npm test
npm run build
```
Serve `dist` over HTTPS. Cloudflare Pages: build `npm test && npm run build`, output `dist`, no framework. Keep repo private. No billing/card, server, analytics or Gemini integration.

## Google connection
Create a dedicated Google project with billing disabled. Enable Sheets, Drive and Picker APIs. Configure external OAuth in Testing, add the actual owner account as test user and register only the deployed app origin. Public `config.js` accepts an OAuth client ID, project number/app ID and an HTTP-referrer/API-restricted Picker API key. These are public browser identifiers, never a client secret. Tokens are held only in memory; no local/session storage, cookies or private rows in code.

Scopes: `openid email profile drive.file`. Picker explicitly selects tracker then contacts; no broad spreadsheets or Drive scopes. The permission covers entire selected files, while application behavior restricts writes to J:K (Status/Notas). Owner confirms email in UI and userinfo must match. Seven-day Testing authorization expiry requires reconnection; short-lived tokens are cleared at expiry and disconnect. Disconnect-and-revoke additionally revokes Google grant.

## Data contract and boundaries
Tracker `Candidaturas!A:N`: exact approved A:M headers plus `ID Ponte` in N. Missing/duplicate IDs fail closed. Blank rows/dates stay blank. Networking records are never applications. Literal statuses remain separate; prepared CV is not a submission, suspended/rejected is not an offer. A date by itself is not evidence of receipt.

Contacts originally used `Contatos!A:K`, later `Pessoas - geral` plus three per-company tabs. On 2026-09-30 all 10 per-company contacts were checked against `Pessoas - geral` before the Example Corp A/Example Agency/Example Corp B tabs were deleted under the owner's instruction as redundant, keeping only `Pessoas - geral` (A:K, unchanged headers) and `Empresas` (A:O). The network now reads only those two tabs and offers two views: Pessoas (individual contacts with represented company/entity from the Empresa column) and Empresas (company cards that also list the mapped people working there, matched by normalized name/prefix between the company name and each contact's Empresa, plus their contact links). It does not deduplicate contacts or infer relationships beyond that name match. No contact-sheet mutation. Legacy Contatos is accepted only when Pessoas - geral is absent; Empresas is optional.

Before editing: validate account/session, selected files, sheets and exact headers; reload all rows, locate stable ID, compare the complete original A:N row. Write only J:K using RAW input. Read again and confirm actual stored values before showing success. Cancel never writes. Retry after an uncertain save requires refreshing to avoid blind repeat writes.

**Concurrency limit:** Google Sheets does not offer conditional updates here. Checks reduce conflicts but another writer can change/reorder a row between the read and write. Do not treat this as concurrency-safe. Avoid simultaneous edits; the limitation must be validated with the owner before enabling general use.

## Privacy/security
DOM construction uses textContent for all sheet values; no sheet HTML is executed. Only HTTPS links allowed, with noreferrer/no-referrer. No private data in source, logs, static HTML or persistent cache. Expiry/disconnect clears rendered private data. No analytics, service worker or persistent cache. Security headers provided for Cloudflare. Public deployment contains only interface assets and public Google configuration. Privacy depends also on the owner's Google account and sharing settings, not on a promise of absolute secrecy.

## Tests and acceptance
Unit tests cover exact status/type, networking exclusion, date validation, missing/duplicate IDs, schema mismatch, reorder lookup, conflict blocking, unsafe URLs and blank fields. Live OAuth, denied access, failed writes, round-trip save, real-data phone/tablet/desktop checks and screen-reader checks are still pending. 24 model/API tests passed. Synthetic OAuth/Picker/Sheets flows passed at 390, 820 and 1440 px: connection, file choice, dashboard, board/list, Cancel (zero writes), Save (one RAW write and reread), two-view network (Pessoas/Empresas), language switch and disconnect clearing private rows. Actual pixels from synthetic-flow captures inspected. These mocks are not evidence that real Google OAuth works. No real application changes should be used as test fixtures. Private datasets must never be committed.

2026-09-30: added ID Ponte header and 48 UUIDs only in tracker N1:N49, under owner approval. Reread confirmed exact IDs and unchanged A:M cell values, normalizing omitted trailing blanks. No application Status/Notes or contact values changed.

Cost gate: https://developers.google.com/workspace/sheets/api/limits now says standard API use has no additional cost but over-quota billing is planned later in 2026. Before enabling APIs, verify a dedicated project with no linked billing cannot incur a charge; if not guaranteed, stop. No Google project created or API activated yet. Console sign-in for the intended owner account was blocked by rejected saved password; no recovery/reset attempted.

## Phase 1 exclusions
No new/deleted applications, drag/drop, contact editing, reminders, messages, CV downloads, Gemini or payment infrastructure. Next steps are literal contact text, not scheduled reminders.
