# 🧾 Client Billing & Invoicing API Specification

---

## 1. GET `/api/bills`
Retrieves sales bills and invoices.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `client` (string, optional): Filter by client name.
  * `status` (string, optional): `Unpaid`, `Partial`, `Paid`.
  * `financialYear` (string, optional): e.g. `2026-2027`.
  * `search` (string, optional): Search invoice number or client name.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "bill_0918a",
      "billNo": "MMC/26-27/0045",
      "invoice": "MMC/26-27/0045",
      "date": "2026-04-10",
      "client": "SKY 4 LOGISTICS",
      "taxableAmount": 45000.0,
      "cgst": 4050.0,
      "sgst": 4050.0,
      "igst": 0.0,
      "total": 53100.0,
      "paidAmount": 0.0,
      "status": "Unpaid",
      "awbCount": 12,
      "awbList": ["MMC-100234", "MMC-100235", "MMC-100236"],
      "createdAt": "2026-04-10T12:00:00.000Z"
    }
  ]
}
```

---

## 2. POST `/api/bills`
Generates a new invoice by linking and locking unbilled AWB bookings.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body**:
```json
{
  "billNo": "MMC/26-27/0045",
  "date": "2026-04-10",
  "client": "SKY 4 LOGISTICS",
  "selectedAwbs": ["bkg_91823a", "bkg_992a8b"],
  "taxableAmount": 4886.0,
  "cgst": 0.0,
  "sgst": 0.0,
  "igst": 879.48,
  "total": 5765.48,
  "notes": "Consolidated April Billing"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Bill generated successfully",
  "data": {
    "id": "bill_0918a",
    "billNo": "MMC/26-27/0045",
    "awbsLinked": 2,
    "total": 5765.48
  }
}
```
* **Side Effects**:
  * The selected AWBs in `bookings` are updated with `billed: true`, `billNo: "MMC/26-27/0045"`, `status: "Billed"`.
  * Invalidation of `delCache("bills")` and `delCache("bookings")`.

---

## 3. DELETE `/api/bills/:id`
Deletes/Cancels an invoice and releases all linked AWBs back to `billed: false`.

* **Access**: SuperAdmin / Admin
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Bill deleted and 2 AWBs reset to unbilled status"
}
```
