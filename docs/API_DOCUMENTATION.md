# 🌐 REST API Documentation

Base URL: `http://localhost:5000/api` (or configured `VITE_API_URL`)

All endpoints (except `/api/auth/login`) require the HTTP Authorization Header:
`Authorization: Bearer <JWT_TOKEN>`

---

## 1. Authentication (`/api/auth`)

* `POST /api/auth/login`: Authenticates user by username and password. Returns JWT token and user profile.
* `GET /api/auth/profile`: Returns active user identity and role.

---

## 2. Opening Balances & FY Close (`/api/opening-balances`)

* `GET /api/opening-balances`: List all opening balances (supports `?financialYear=2026-2027&partyType=Client`).
* `POST /api/opening-balances`: Create manual opening balance entry.
* `PUT /api/opening-balances/:id`: Update existing opening balance entry.
* `DELETE /api/opening-balances/:id`: Delete opening balance entry.
* `POST /api/opening-balances/close-fy`:
  * **Payload**: `{ cutoffDate: "2026-03-31", targetFY: "2026-2027", effectiveDate: "2026-04-01", notes: "..." }`
  * **Action**: Calculates net party closing balances, saves opening balance records, archives completed prior bills and AWBs, and strictly preserves unbilled AWBs.

---

## 3. TDS & DEBT Adjustments (`/api/outstanding`)

* `GET /api/outstanding`: Returns all TDS & DEBT entries.
* `POST /api/outstanding`: Create new adjustment (requires `partyType`, `client` or `vendor`, `particulars` (`tds`/`debit`), `amount`, `date`).
* `PUT /api/outstanding/:id`: Edit adjustment entry.
* `DELETE /api/outstanding/:id`: Delete adjustment entry.

---

## 4. Bookings & Shipments (`/api/bookings`)

* `GET /api/bookings`: Fetch list of all AWB bookings.
* `POST /api/bookings`: Create new booking with rate calculations.
* `GET /api/bookings/:id`: Retrieve single booking details.
* `PUT /api/bookings/:id`: Update booking.
* `DELETE /api/bookings/:id`: Delete booking.

---

## 5. Billing & Purchase (`/api/bills` & `/api/purchases`)

* `GET /api/bills`: List sales invoices.
* `POST /api/bills`: Generate new invoice and link unbilled AWBs.
* `DELETE /api/bills/:id`: Cancel / delete invoice (resets linked AWBs to unbilled).
* `GET /api/purchases`: List vendor purchase invoices.
* `POST /api/purchases`: Create vendor invoice.
* `DELETE /api/purchases/:id`: Delete vendor invoice.

---

## 6. Cash Sheet (`/api/cash`)

* `GET /api/cash`: Fetch transaction ledger entries.
* `POST /api/cash`: Record cash in (receipt) or cash out (payment).
* `DELETE /api/cash/:id`: Delete transaction entry.

---

## 7. Trips & Vendor MIS (`/api/trips`, `/api/vendor-mis`)

* `GET /api/trips`: List all trip manifests.
* `POST /api/trips`: Create new trip manifest.
* `GET /api/vendor-mis`: List vendor line-haul entries.
* `POST /api/vendor-mis`: Create vendor MIS entry.
