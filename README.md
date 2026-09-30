# Ponte - Phase 1

A private job-search workspace over the owner's existing Google Sheets, with a public static entry page. Portuguese/English interface. Application board/list, literal statuses, read-only network, dashboard and limited Status/Notes editing.

## Status
Local implementation in progress. No production URL yet. Google OAuth and Picker configuration pending. Blank config fails closed; it never loads mock or private data. **Not yet accepted for use.**

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

Contacts originally used `Contatos!A:K`. Live inspection on 2026-09-30 found that tab replaced by `Pessoas - geral`, with the same A:K headers. Owner confirmed inclusion of all four Pessoas tabs on 2026-09-30. The network now reads Pessoas - geral, Pessoas - Example Corp A, Pessoas - Example Agency and Pessoas - Example Corp B, shows represented company/entity from existing Empresa column and source tab. Does not deduplicate or infer relationships. Empresas is a different model and excluded. No contact-sheet mutation. Legacy Contatos is accepted only when the four-tab layout is absent.

Before editing: validate account/session, selected files, sheets and exact headers; reload all rows, locate stable ID, compare the complete original A:N row. Write only J:K using RAW input. Read again and confirm actual stored values before showing success. Cancel never writes. Retry after an uncertain save requires refreshing to avoid blind repeat writes.

**Concurrency limit:** Google Sheets does not offer conditional updates here. Checks reduce conflicts but another writer can change/reorder a row between the read and write. Do not treat this as concurrency-safe. Avoid simultaneous edits; the limitation must be validated with the owner before enabling general use.

## Privacy/security
DOM construction uses textContent for all sheet values; no sheet HTML is executed. Only HTTPS links allowed, with noreferrer/no-referrer. No private data in source, logs, static HTML or persistent cache. Expiry/disconnect clears rendered private data. No analytics, service worker or persistent cache. Security headers provided for Cloudflare. Public deployment contains only interface assets and public Google configuration. Privacy depends also on the owner's Google account and sharing settings, not on a promise of absolute secrecy.

## Tests and acceptance
Unit tests cover exact status/type, networking exclusion, date validation, missing/duplicate IDs, schema mismatch, reorder lookup, conflict blocking, unsafe URLs and blank fields. Live OAuth, denied access, failed writes, round-trip save, phone/tablet/desktop visual checks, keyboard and screen-reader checks are still pending. No real application changes should be used as test fixtures. Private datasets must never be committed.

## Phase 1 exclusions
No new/deleted applications, drag/drop, contact editing, reminders, messages, CV downloads, Gemini or payment infrastructure. Next steps are literal contact text, not scheduled reminders.
