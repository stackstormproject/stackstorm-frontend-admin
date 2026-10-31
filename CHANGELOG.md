# Changelog

All notable changes to the admin console. Format:
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); versions follow
[Semantic Versioning](https://semver.org/). The version is set on the `release/*` branch.

## [Unreleased]

### Added

- API client matching the backend contract, with one error shape and single-flight session
  refresh; support socket without client-side role flags (#142)
- Staff sign-in, session restore from the refresh cookie, URL routing, role-aware menu and
  "not available for your role" page (#143)
- Dashboard with paid-only figures, alert tiles and daily revenue for 7/30/90 days (#144)
- Order search and detail; ship with tracking, deliver or collect, cancel with refund (#145)
- Return review: approve, reject, inspect the parcel, refund or exchange (#146)
- Product management with sizes, opening stock, archive and restore (#147)
- Stock list with low-stock filter, logged adjustments and stock history (#148)
- Customer records with paid spend, addresses and audited loyalty adjustments (#149)
- Live support console: queue, take, reply, typing, resolve (#150)
- axe-core accessibility tests for every screen and dialog (#151)
- Playwright suite for the critical flows and a nightly staging workflow (#152)
- README for a fresh machine, CSP and cache headers, reproducible Docker build (#153)
- Product photos: upload a main photo and up to three more, make any the main one or remove
  it; "New arrivals" and "Popular now" choices for the shop's home page; brand chosen from a
  list; Brands page to add, edit, hide and delete brands with logos; PDF invoice on each paid
  order (#179)
- Change an order's status from the order list: a "Change to…" menu beside each status offers
  only the allowed next statuses and confirms in the same dialog as the order page (#184)
- An "On sale" toggle on the product form with a 1-90% discount percentage, shown as a badge
  next to the price on the products list (#203)
- A "Banners" page under a new "Marketing" section manages the shop's three home page hero
  banners by slot: title, subtitle, image, button text/link and active state, or cleared back
  to the default slide (#204)

### Changed

- Linting uses the team's Airbnb ESLint config instead of oxlint; `npm run verify` runs the
  same gates as CI (#141)
- Every page reads live data; nothing falls back to built-in sample data (#143)
- Light console: white cards on a pale page with a royal-blue sidebar, gold marker on the
  current page, blue actions and a blue revenue chart (#178)

### Removed

- The default signed-in super admin with a literal token, the auto-login with a hard-coded
  password, and the demo accounts shipped in the bundle (#143)
- Fallback orders, products, returns, loyalty accounts and chats (#143, #150)
- Calls to routes the backend does not serve (`/loyalty/*`, `/inventory/adjust`,
  `PATCH /admin/returns/:id/*`, `POST /products`) (#142)
- The committed coverage report (#141)

### Fixed

- Closed phone menu no longer takes keyboard focus; tables no longer widen the page on
  phones (#151)
- Live support could crash the whole page ("destroy is not a function") when leaving the
  console while the chat socket was mid-teardown; a failure there is now contained instead of
  taking down the page (#15)

### Security

- Access token in memory only; open-redirect-safe `?next=`; agent identity taken from the
  JWT on the server (#139, #142, #143); CSP with no third-party scripts and
  `frame-ancestors 'none'` (#153)
