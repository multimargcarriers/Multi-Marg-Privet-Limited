# ⚖️ TDS & DEBT Adjustments API Specification

---

## 1. GET `/api/outstanding`
Fetches all recorded non-cash deductions (TDS & DEBT).

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `partyType` (string, optional): `Client` or `Vendor`.
  * `particulars` (string, optional): `tds` or `debit` / `debt`.
  * `client` / `vendor` (string, optional): Party name filter.
  * `search` (string, optional): Search party name or bill number.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "adj_1029a",
      "partyType": "Client",
      "client": "SKY 4 LOGISTICS",
      "particulars": "tds",
      "amount": 900.0,
      "percentage": 2.0,
      "date": "2026-04-16",
      "billNo": "MMC/26-27/0045",
      "billAmount": 45000.0,
      "bankname": "HDFC Bank",
      "tdsStatus": "pending",
      "createdAt": "2026-04-16T15:00:00.000Z"
    },
    {
      "id": "adj_1030b",
      "partyType": "Vendor",
      "vendor": "PRIME ROADWAYS",
      "particulars": "debit",
      "amount": 500.0,
      "date": "2026-04-17",
      "billNo": "PR/2026/884",
      "billAmount": 28000.0,
      "remarks": "Penalty for 2-hour delay",
      "createdAt": "2026-04-17T11:00:00.000Z"
    }
  ]
}
```

---

## 2. POST `/api/outstanding`
Records a new TDS or DEBT adjustment.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body**:
```json
{
  "partyType": "Client",
  "client": "SKY 4 LOGISTICS",
  "particulars": "tds",
  "amount": 900.0,
  "percentage": 2.0,
  "date": "2026-04-16",
  "billNo": "MMC/26-27/0045",
  "billAmount": 45000.0,
  "bankname": "HDFC Bank",
  "tdsStatus": "pending"
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Adjustment recorded successfully",
  "data": { "id": "adj_1029a", "amount": 900.0 }
}
```

---

## 3. PUT `/api/outstanding/:id` & DELETE `/api/outstanding/:id`
* **PUT `/api/outstanding/:id`**: Update existing adjustment fields.
* **DELETE `/api/outstanding/:id`**: Delete adjustment and recalculate outstanding net due.
