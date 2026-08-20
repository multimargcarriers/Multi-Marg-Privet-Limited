# ⚙️ Settings, Trash Lifecycle, CSV & System Logs API Specification

---

## 1. GET `/api/trash` & POST `/api/trash/restore/:id`

* **GET `/api/trash`**: Lists soft-deleted items across all collections with deletion metadata.
* **POST `/api/trash/restore/:id`**:
  * Restores item back into its active collection.
  * Triggers automatic payment recalculation (`recalculatePartyPayments`) and cache invalidation.
* **DELETE `/api/trash/force/:id`**: Permanently purges document and any attached Cloudinary files.
* **DELETE `/api/trash/clear`**: Empties the entire trash bin (SuperAdmin only).

---

## 2. GET `/api/logs`
Audit log inspection.

* **Access**: SuperAdmin
* **Returns**: User audit trail with timestamps, IP addresses, action types, collection names, and change diffs.

---

## 3. GET `/api/analytics` & GET `/api/dashboard`
* Aggregated revenue, outstanding aging reports, branch shipment volume, and operational metrics.
