# 🗄️ Database Schemas & Data Models

This document outlines the schema structure, data types, and key attributes for each MongoDB collection managed by `dbAdapter.js`.

---

## 1. `bookings` (AWB Consignments)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Unique AWB identifier |
| `awbNo` | String | AWB / LR Number (Unique) |
| `date` / `dispatch_date` | String (YYYY-MM-DD) | Booking date |
| `consignor` | String | Sender name |
| `consignee` | String | Receiver name |
| `client` | String | Billed-to client party name |
| `origin` | String | Origin city / hub |
| `destination` | String | Destination city / hub |
| `mode` | String | Transit mode (`Road`, `Train`, `Air`, `Sea`) |
| `paymentMode` | String | `To Pay`, `Paid`, `Credit` |
| `total_boxes` | Number | Total parcel boxes |
| `actual_weight` | Number | Physical weight in KG |
| `charge_wt` | Number | Chargeable weight in KG |
| `rate` | Number | Rate per KG |
| `freight` | Number | Base freight amount |
| `total` | Number | Grand total including GST |
| `billed` | Boolean | True if included in a sales invoice |
| `billNo` | String | Invoice number if billed |
| `status` | String | `Booked`, `In Transit`, `Delivered`, `Billed` |
| `invoiceDetails` | Array of Objects | `[{ invoiceNo, invoiceDate, partNumber, quantity, invoiceValue, ewayBill }]` |

---

## 2. `bills` (Client Sales Invoices)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Unique invoice ID |
| `invoice` / `billNo` | String | Invoice Number (e.g. `MMC/26-27/001`) |
| `date` | String (YYYY-MM-DD) | Invoice Date |
| `client` | String | Client Company Name |
| `total` / `amount` | Number | Total invoice payable amount |
| `taxableAmount` | Number | Subtotal before taxes |
| `cgst` / `sgst` / `igst` | Number | GST breakdown amounts |
| `awbCount` | Number | Number of AWBs covered |
| `awbList` | Array of Strings | Array of AWB numbers included |

---

## 3. `purchases` (Vendor Purchase Bills)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Unique purchase bill ID |
| `vendor` | String | Vendor Name |
| `billNo` | String | Vendor Bill / Invoice Number |
| `date` | String (YYYY-MM-DD) | Purchase bill date |
| `total` / `amount` | Number | Purchase invoice total amount |
| `taxableAmount` | Number | Subtotal before tax |
| `gst` | Number | Tax amount |
| `notes` | String | Expense / line-haul remarks |

---

## 4. `cashEntries` (Cash & Bank Transactions)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Unique cash entry ID |
| `date` | String (YYYY-MM-DD) | Transaction date |
| `type` | String | `in` (Receipt) or `out` (Payment) |
| `amount` | Number | Transaction amount |
| `paymentMode` | String | `Bank`, `Cash`, `Cheque`, `UPI` |
| `bankName` | String | Associated bank account name |
| `partyType` | String | `Client`, `Vendor`, `Driver`, `Expense` |
| `partyName` | String | Associated party name |
| `billNo` | String | Reference invoice number (optional) |
| `remarks` | String | Description / narration |

---

## 5. `outstanding` (TDS & DEBT Adjustments)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Unique adjustment ID |
| `partyType` | String | `Client` or `Vendor` |
| `client` / `vendor` | String | Party name |
| `particulars` | String | `tds` or `debit` / `debt` |
| `amount` | Number | Adjustment amount |
| `percentage` | Number | TDS percentage (e.g. 2% or 1%) |
| `date` | String (YYYY-MM-DD) | Adjustment date |
| `billNo` | String | Linked bill / invoice number |
| `billAmount` | Number | Linked bill amount |
| `bankname` | String | Bank account details |
| `tdsStatus` | String | `pending` or `verified` |

---

## 6. `openingBalances` (Prior FY Reference Balances)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Unique opening balance ID |
| `financialYear` | String | Target FY (e.g. `2026-2027`) |
| `asOfDate` | String (YYYY-MM-DD) | Closing cutoff date (e.g. `2026-03-31`) |
| `effectiveFrom` | String (YYYY-MM-DD) | Opening start date (e.g. `2026-04-01`) |
| `partyType` | String | `Client` or `Vendor` |
| `partyName` | String | Client or Vendor name |
| `openingOutstanding` | Number | Net opening balance carried forward |
| `totalBilledPrior` | Number | Audited prior invoiced amount |
| `totalPaidPrior` | Number | Audited prior payments settled |
| `totalTdsPrior` | Number | Audited prior TDS deductions |
| `totalDebtPrior` | Number | Audited prior DEBT adjustments |
| `notes` | String | Reference / audit notes |
| `isManual` | Boolean | True if created manually |

---

## 7. `trips` and `trip_mis` (Shipment Trips & Manifests)

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Unique trip ID |
| `tripNo` | String | Trip Identifier (e.g. `TRP-001`) |
| `date` | String (YYYY-MM-DD) | Trip dispatch date |
| `mode` | String | `ROAD`, `TRAIN`, `AIR` |
| `vehicleNo` | String | Vehicle / Train / Flight number |
| `parcels` | Array of Objects | `[{ lrNo, origin, destination, consignor, consignee, mode, box, weight, rate, freight, pickup, delivery, special, other, parking, labor }]` |
