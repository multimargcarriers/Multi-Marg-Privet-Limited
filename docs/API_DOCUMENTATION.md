# 🌐 Multi Marg Carriers - Master REST API Catalog

Base URL: `http://localhost:5000/api` (or configured `VITE_API_URL`)

All endpoints (except public authentication and tracking lookups) require the HTTP Authorization header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 📑 Detailed Subsystem API Guides

For exhaustive schema fields, query parameters, request bodies, success/error responses, and side-effect mechanics, reference the dedicated subsystem guides:

| Subsystem | Scope & Endpoints | Detailed Spec Guide |
| :--- | :--- | :--- |
| **Authentication & Users** | Login, Profile, Users, Branches, RBAC | 🔐 **[`AUTH_USERS_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/AUTH_USERS_API.md)** |
| **AWB Bookings & Tracking** | Bookings, POD upload, Milestone Checkpoints, Tracking | 📦 **[`BOOKINGS_TRACKING_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/BOOKINGS_TRACKING_API.md)** |
| **Client Sales Invoicing** | Bill generation, GST calculation, Unbilled AWB reports | 🧾 **[`BILLS_INVOICING_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/BILLS_INVOICING_API.md)** |
| **Vendor Management & Purchases** | Vendor master, Purchase invoices, Linehaul expenses | 🏢 **[`PURCHASES_VENDORS_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/PURCHASES_VENDORS_API.md)** |
| **Cash Sheet & Settlements** | Receipts (`in`), Payments (`out`), Vouchers, Bank allocations | 💵 **[`CASH_SETTLEMENTS_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/CASH_SETTLEMENTS_API.md)** |
| **TDS & DEBT Adjustments** | Dual Client/Vendor non-cash deductions, Form 26AS tracking | ⚖️ **[`TDS_DEBT_ADJUSTMENTS_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/TDS_DEBT_ADJUSTMENTS_API.md)** |
| **Opening Balances & FY Close** | Stored prior FY balances, Automated Year-End Rollover | 📈 **[`OPENING_BALANCES_FY_CLOSE_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/OPENING_BALANCES_FY_CLOSE_API.md)** |
| **Trips, Trip MIS & Vendor MIS** | Internal manifests, Vendor trips, Linehaul tracking | 🚚 **[`TRIPS_MIS_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/TRIPS_MIS_API.md)** |
| **Rate Master & Directory** | Lane rates per kg, Client directory, City master | 🏷️ **[`RATES_MASTERS_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/RATES_MASTERS_API.md)** |
| **Settings, Trash & Audit Logs** | Trash soft-delete, Restore, CSV backups, Audit logs | ⚙️ **[`SETTINGS_SYSTEM_API.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/api/SETTINGS_SYSTEM_API.md)** |

---

## ⚡ Global Response Envelope Standards

### Standard Success Envelope (200 / 201):
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Standard Error Envelope (400 / 401 / 403 / 404 / 500):
```json
{
  "success": false,
  "error": "Detailed error description",
  "details": [ ... ]
}
```
