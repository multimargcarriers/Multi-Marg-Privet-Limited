# 🏢 Vendor Management & Purchase Invoicing API Specification

---

## 1. GET `/api/purchases` & POST `/api/purchases`

* **GET `/api/purchases`**:
  * **Access**: Authenticated
  * **Query Parameters**: `vendor` (string, optional), `status` (string, optional), `search` (string, optional).
  * **Response**: Returns list of vendor purchase bills (`id`, `vendor`, `billNo`, `date`, `total`, `paidAmount`, `status`, `notes`).

* **POST `/api/purchases`**:
  * **Access**: Authenticated
  * **Request Body**:
```json
{
  "vendor": "PRIME ROADWAYS",
  "billNo": "PR/2026/884",
  "date": "2026-04-12",
  "taxableAmount": 25000.0,
  "gst": 3000.0,
  "total": 28000.0,
  "notes": "Delhi to Mumbai Linehaul Trip #TRP-102"
}
```
  * **Success Response (201 Created)**: Returns created purchase document.

---

## 2. GET `/api/vendors` & POST `/api/vendors`

* **GET `/api/vendors`**: Returns list of logistics vendor companies, contact persons, phone numbers, GST numbers, and standard transit modes (`Road`, `Train`, `Air`).
* **POST `/api/vendors`**:
```json
{
  "name": "PRIME ROADWAYS",
  "contact": "Rajesh Kumar",
  "phone": "9811002233",
  "gst": "07AAAAA1111A1Z1",
  "city": "Delhi",
  "mode": "ROAD",
  "address": "Transport Nagar, Delhi"
}
```
