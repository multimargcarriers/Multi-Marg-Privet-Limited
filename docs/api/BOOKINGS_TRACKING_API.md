# 📦 AWB Bookings, Manifests, POD & Tracking API Specification

---

## 1. GET `/api/bookings`
Fetches a list of AWB bookings with optional filters and pagination.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `client` (string, optional): Filter by client name.
  * `status` (string, optional): `Booked`, `In Transit`, `Delivered`, `Billed`.
  * `billed` (boolean, optional): `true` (billed) or `false` (unbilled).
  * `startDate` / `endDate` (string, YYYY-MM-DD, optional): Filter by dispatch date range.
  * `search` (string, optional): Free text search across AWB number, consignor, consignee, origin, destination.
* **Success Response (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "bkg_91823a",
      "awbNo": "MMC-100234",
      "date": "2026-04-05",
      "dispatch_date": "2026-04-05",
      "client": "SKY 4 LOGISTICS",
      "consignor": "ACME CORP",
      "consignorGst": "07AAAAA0000A1Z5",
      "consignee": "GLOBAL IMPEX",
      "consigneeGst": "27BBBBB1111B2Z6",
      "origin": "Delhi",
      "destination": "Mumbai",
      "mode": "Road",
      "paymentMode": "Credit",
      "type_of_delivery": "Door",
      "total_boxes": 5,
      "actual_weight": 120.5,
      "charge_wt": 150.0,
      "rate": 18.5,
      "freight": 2775.0,
      "pickup": 150.0,
      "delivery": 200.0,
      "special": 0.0,
      "other": 50.0,
      "taxableAmount": 3175.0,
      "cgst": 0.0,
      "sgst": 0.0,
      "igst": 571.5,
      "total": 3746.5,
      "billed": false,
      "billNo": null,
      "status": "Booked",
      "invoiceDetails": [
        {
          "invoiceNo": "INV-9921",
          "invoiceDate": "2026-04-04",
          "partNumber": "PN-44",
          "quantity": 100,
          "invoiceValue": 85000,
          "ewayBill": "10029384819"
        }
      ],
      "createdAt": "2026-04-05T10:30:00.000Z"
    }
  ]
}
```

---

## 2. POST `/api/bookings`
Creates a new AWB booking with automatic rate calculation.

* **Access**: Authenticated
* **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body Schema**:
```json
{
  "awbNo": "MMC-100235",
  "dispatch_date": "2026-04-06",
  "client": "SKY 4 LOGISTICS",
  "consignor": "ACME CORP",
  "consignee": "GLOBAL IMPEX",
  "origin": "Delhi",
  "destination": "Mumbai",
  "mode": "Road",
  "paymentMode": "Credit",
  "type_of_delivery": "Door",
  "total_boxes": 2,
  "actual_weight": 50.0,
  "charge_wt": 60.0,
  "rate": 20.0,
  "freight": 1200.0,
  "pickup": 100.0,
  "delivery": 150.0,
  "special": 0.0,
  "other": 0.0,
  "total": 1711.0,
  "invoiceDetails": [
    {
      "invoiceNo": "INV-102",
      "invoiceDate": "2026-04-05",
      "quantity": 50,
      "invoiceValue": 45000,
      "ewayBill": "19283746501"
    }
  ]
}
```
* **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": { "id": "bkg_992a8b", "awbNo": "MMC-100235", "total": 1711.0 }
}
```

---

## 3. GET `/api/tracking/:awbNo` & POST `/api/pod/upload`
* **GET `/api/tracking/:awbNo`**: Retrieves real-time milestone checkpoints and delivery tracking history.
* **POST `/api/pod/upload`**: Uploads physical or digital Proof of Delivery image to Cloudinary and marks AWB as `Delivered`.
