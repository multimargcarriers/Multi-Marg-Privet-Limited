# 🚚 Trips, Trip MIS & Vendor MIS API Specification

---

## 1. GET `/api/trips` & POST `/api/trips`

* **GET `/api/trips`**: Returns list of internal trips and manifests.
* **POST `/api/trips`**: Creates a master trip manifest:
```json
{
  "tripNo": "TRP-2026-001",
  "date": "2026-04-10",
  "mode": "ROAD",
  "vehicleNo": "DL 1A 1234",
  "type": "FTL",
  "origin": "Delhi Hub",
  "destination": "Mumbai Hub",
  "driver": "Ramesh Kumar",
  "driverPhone": "9811223344",
  "parcels": [
    {
      "lrNo": "MMC-100234",
      "origin": "Delhi",
      "destination": "Mumbai",
      "consignor": "ACME CORP",
      "consignee": "GLOBAL IMPEX",
      "mode": "ROAD",
      "box": 5,
      "weight": 150.0,
      "rate": 18.5,
      "freight": 2775.0,
      "pickup": 150.0,
      "delivery": 200.0,
      "special": 0.0,
      "other": 50.0,
      "parking": 0.0,
      "labor": 0.0
    }
  ]
}
```

---

## 2. GET `/api/vendor-mis` & POST `/api/vendor-mis`
Tracks third-party vendor trips and linehaul manifests.

* **GET `/api/vendor-mis`**: Returns list of vendor MIS entries.
* **POST `/api/vendor-mis`**:
```json
{
  "vendorName": "PRIME ROADWAYS",
  "details": [
    {
      "date": "2026-04-10",
      "from": "DELHI",
      "to": "MUMBAI",
      "particular": "FULL TRUCK LOAD",
      "mode": "ROAD",
      "vehicleNo": "HR 55 AB 9988",
      "handoverTo": "SURESH DRIVER",
      "amount": 25000.0,
      "others": 500.0,
      "status": "Approved"
    }
  ]
}
```
*(Valid modes: `ROAD`, `TRAIN`, `AIR`)*.
