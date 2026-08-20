# 🏷️ Rates, Clients & Master Data API Specification

---

## 1. GET `/api/rates` & POST `/api/rates`

* **GET `/api/rates`**: Retrieves rate matrix cards (`client`, `origin`, `destination`, `roadRate`, `trainRate`, `airRate`, `roadPickup`, `roadDelivery`, etc.).
* **POST `/api/rates`**: Creates or updates client-specific lane pricing:
```json
{
  "client": "SKY 4 LOGISTICS",
  "origin": "Delhi",
  "destination": "Mumbai",
  "roadRate": 18.5,
  "roadPickup": 150.0,
  "roadDelivery": 200.0,
  "trainRate": 15.0,
  "trainPickup": 100.0,
  "trainDelivery": 150.0,
  "airRate": 45.0,
  "airPickup": 200.0,
  "airDelivery": 300.0,
  "minWeight": 20.0,
  "minFreight": 500.0
}
```

---

## 2. GET `/api/clients` & POST `/api/clients`

* **GET `/api/clients`**: Returns client companies, GST numbers, contact persons, phones, credit limits, and billing addresses.
* **POST `/api/clients`**:
```json
{
  "name": "SKY 4 LOGISTICS",
  "contact": "Anil Sharma",
  "phone": "9811223344",
  "email": "billing@sky4.com",
  "gst": "07AAAAA0000A1Z5",
  "city": "Delhi",
  "address": "Okhla Industrial Area Phase 2, New Delhi",
  "creditDays": 30
}
```
