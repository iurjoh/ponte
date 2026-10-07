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
