# UI v3 build notes

Implementation of `docs/ui-v3.md` (direction "Ortho Console").

## Structure
- `src/app/layout.tsx`: Archivo (wdth axis), Instrument Sans, Geist Mono via `next/font`; theme boot script (stored choice, else system preference, else dark); `CropPatternDefs` once; providers: I18n → `FieldDataProvider` → `TraceProvider`.
- `src/lib/ui/fieldStore.ts`: the one persistent Tarla object (geometry, answers, scenario, prices, custom plans, saved fields, rainfall choice, view mode), `useSyncExternalStore` + localStorage (try/catch). Share links: `#ornek=<pilot>` or `#f=<ring>` (hash only, never sent to the server).
- `src/components/data/FieldData.tsx`: fetches `/api/field`, `/api/climate`, `/api/ndvi` (bundled snapshots first for the five pilots) and runs `analyze` in the existing Web Worker; survives navigation.
- Routes: `/` Tarla (`components/tarla/*`), `/plan` Ekim nöbeti (`components/plan/*`), `/dayanak` (`components/dayanak/EvidencePage.tsx`), `/yontem` (`components/yontem/MethodsPage.tsx`), auth pages (restyled `AuthShell`), `not-found.tsx`, new `GET /api/geocode` (Nominatim proxy: identifying User-Agent and Referer, one upstream request per second, 24 h cache, submit-only search).
- Map: plain Leaflet, no new dependency. Drawing (polygon, rectangle, pivot circle, pin + dekar, vertex edit with mid-edge insert and right-click delete, undo/redo, Enter adds a vertex at the centre cross, coordinate dialog), geodesic area from `src/lib/data/geometry.ts`.
- Strings: `src/lib/i18n/v3.ts`, `v3plan.ts`, `v3doc.ts` merged over the legacy dictionary in `dict.ts`.

## Workarounds (engine / data layer not edited)
- Engine Turkish narrative uses "rotasyon" and "brüt marj"; `useL()` in `components/plan/planKit.tsx` replaces whole phrases on display.
- `POST /api/field` returns terrain, soil layers and the ERA5 cross-check together; off the pilots the cross-check needs the POWER series, so the first terrain/soil cards can wait 30 s or more on a cold cache. A split route (terrain + soil first) would fix it.
- GIBS `Reference_Labels_15m` answers HTTP 500 below zoom 8; the labels overlay starts at zoom 8.
- The pilot terrain shown before the polygon terrain arrives is the snapshot's 3×3 point stencil, labelled as such.
- Monthly irrigation, windows, trade, confidence come from the engine; "kaç sulama" uses a labelled 60 ton/da assumption.
