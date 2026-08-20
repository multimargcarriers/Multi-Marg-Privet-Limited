# 💵 Cash Sheet & Bank Settlements API Specification

---

## 1. GET `/api/cash`
Retrieves bank and cash transaction entries.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `startDate` / `endDate` (string, optional): Filter by date.
  * `partyType` (string, optional): `Client`, `Vendor`, `Driver`, `Expense`.
  * `type` (string, optional): `in` (Receipt) or `out` (Payment).
  * `search` (string, optional): Party name or narration search.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Cash entries fetched successfully",
  "data": [
    {
      "id": "csh_9921a",
      "date": "2026-04-15",
      "type": "in",
      "amount": 50000.0,
      "partyType": "Client",
      "partyName": "SKY 4 LOGISTICS",
      "paymentMode": "Bank",
      "bankName": "HDFC Current A/c",
      "billNo": "MMC/26-27/0045",
      "remarks": "NEFT ref #992838183",
      "cloudinaryUrl": "https://res.cloudinary.com/...",
      "createdAt": "2026-04-15T14:30:00.000Z"
    }
  ]
}
```

---

## 2. POST `/api/cash`
Records a new cash/bank receipt or disbursement.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json` or `multipart/form-data`
* **Request Body**:
```json
{
  "date": "2026-04-15",
  "type": "in",
  "amount": 50000.0,
  "partyType": "Client",
  "partyName": "SKY 4 LOGISTICS",
  "paymentMode": "Bank",
  "bankName": "HDFC Current A/c",
  "billNo": "MMC/26-27/0045",
  "remarks": "April Part Payment",
  "fileData": "data:image/jpeg;base64,..."
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Cash entry created successfully",
  "data": { "id": "csh_9921a", "amount": 50000.0, "type": "in" }
}
```
* **Side Effects**:
  * Triggers `recalculatePartyPayments(partyType, partyName)`.
  * If no `billNo`, offsets Prior Opening Outstanding first, then FIFO bills.
  * If `billNo` present, directly credits that specific invoice.
  * Invalidation of `delCache("cashEntries")`, `delCache("bills")`, `delCache("outstanding")`, `delCache("openingBalances")`.

---

## 3. DELETE `/api/cash/:id`
Deletes a cash transaction and re-adjusts party allocations.

* **Access**: SuperAdmin / Admin
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Cash entry deleted successfully"
}
```
