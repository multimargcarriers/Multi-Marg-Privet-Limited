# POD Upload Migration & Tracking State Reversion Cheatsheet

This cheatsheet documents the changes, script designs, and logic implemented during this session for reference in future sessions.

---

## 1. POD CSV Upload Migration
* **CSV File Location:** [pod_upload.csv](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/frontend/public/pod_upload.csv) containing mappings: `awb,pod_name`
* **Local Images Directory:** [upload-pod](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/frontend/public/upload-pod) containing all POD images.
* **Migration Logic:**
  * Runs inside the active server process to resolve DNS issues.
  * Resolves AWBs from the CSV using parsed string and integer match queries against the MongoDB `bookings` collection.
  * Reads the matching files as binary buffers, streams them directly to Cloudinary (`uploadStream` to prevent file deletions on completion), and inserts a document in the `pod` collection.
  * Updates the corresponding booking status to `"Delivered"` and sets `podUploaded: true` and `podUrl`.

---

## 2. POD Duplicate Cleanup Routine
* **What Happened:** Concurrent processing of duplicate AWBs in the CSV resulted in race conditions that created duplicate Cloudinary uploads.
* **Cleanup Strategy:**
  * Fetched all POD documents in Firestore/MongoDB and grouped them by AWB.
  * For groups with multiple documents, queried the booking collection to find the active `podUrl`.
  * Preserved the active POD, deleted duplicate assets from Cloudinary using `deleteFile`, and deleted duplicate POD documents from the database.
  * Reclaimed all wasted Cloudinary storage quota and reduced the database count to **exactly 933 unique active POD records**.

---

## 3. Booking List UI eye Icon Fixes
* **File Modified:** [BookingsList.jsx](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/frontend/src/pages/BookingsList.jsx)
* **Bug Fixed:** Previously, the variable `hasPodEntry` was evaluated as a raw boolean (`Boolean(...)`), causing clicking the button to crash (evaluating `true.podUrl` as undefined).
* **Fix Implemented:** Replaced the boolean wrapper with the actual mapped `podEntry` object. The button now displays an **Eye** icon instead of the "+ POD" upload button when a POD is uploaded, and clicking it redirects cleanly to the Cloudinary image preview.

---

## 4. Revert to Transit Status on Deletion
* **File Modified:** [trackingController.js](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/backend/src/controllers/trackingController.js)
* **Logic Implemented:**
  * When a tracking checkpoint is deleted, the server queries the database to see if a POD is uploaded or if other checkpoints exist.
  * If no POD exists and all checkpoints are deleted, the booking status automatically reverts back to **`"Picked Up"`** (or the latest remaining checkpoint status if some are kept), rather than remaining stuck on `"Delivered"`.
