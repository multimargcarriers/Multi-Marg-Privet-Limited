# 📈 Opening Balances & Year-End Close API Specification

---

## 1. GET `/api/opening-balances`
Fetches all stored Prior Financial Year reference opening balances.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `financialYear` (string, optional): e.g. `2026-2027` or `All`.
  * `partyType` (string, optional): `Client`, `Vendor`, or `All`.
  * `search` (string, optional): Filter by party name.
  * `sync` (boolean, optional): Set to `true` to force recalculation against live database state before returning.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Opening balances fetched successfully",
  "data": [
    {
      "id": "opb_9918a",
      "financialYear": "2026-2027",
      "asOfDate": "2026-03-31",
      "effectiveFrom": "2026-04-01",
      "partyType": "Client",
      "partyName": "SKY 4 LOGISTICS",
      "openingOutstanding": 739474.19,
      "totalBilledPrior": 6424122.19,
      "totalPaidPrior": 5684648.0,
      "totalTdsPrior": 0.0,
      "totalDebtPrior": 0.0,
      "notes": "Carried forward from FY ending 2026-03-31",
      "isManual": false,
      "createdAt": "2026-04-01T00:00:00.000Z"
    }
  ]
}
```

---

## 2. POST `/api/opening-balances`
Creates a manual opening balance record.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body**:
```json
{
  "financialYear": "2026-2027",
  "asOfDate": "2026-03-31",
  "effectiveFrom": "2026-04-01",
  "partyType": "Client",
  "partyName": "NEW CLIENT LTD",
  "openingOutstanding": 50000.0,
  "totalBilledPrior": 50000.0,
  "totalPaidPrior": 0.0,
  "totalTdsPrior": 0.0,
  "totalDebtPrior": 0.0,
  "notes": "Audited opening balance"
}
```
* **Success Response (201 Created)**: Returns created opening balance document.

---

## 3. POST `/api/opening-balances/close-fy`
Executes the automated Financial Year Close, archival, and balance rollover.

* **Access**: SuperAdmin
* **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body**:
```json
{
  "cutoffDate": "2026-03-31",
  "targetFY": "2026-2027",
  "effectiveDate": "2026-04-01",
  "notes": "Annual Year-End Close as of 31-03-2026"
}
```
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Financial Year Close for 2026-03-31 completed successfully",
  "data": {
    "targetFY": "2026-2027",
    "cutoffDate": "2026-03-31",
    "effectiveDate": "2026-04-01",
    "clientsCarriedForward": 17,
    "vendorsCarriedForward": 11,
    "billsDeleted": 45,
    "purchasesDeleted": 30,
    "cashEntriesDeleted": 112,
    "adjustmentsDeleted": 14,
    "awbsDeleted": 150,
    "awbsRetainedUnbilled": 8
  }
}
```
* **Critical Operational Guarantees**:
  * Calculates `Billed - Paid - TDS - DEBT` per party and saves to `openingBalances`.
  * Purges completed sales bills, purchase bills, cash entries, and adjustments dated $\le$ `cutoffDate`.
  * **Strictly preserves unbilled / pending AWBs** for billing in the new year.
