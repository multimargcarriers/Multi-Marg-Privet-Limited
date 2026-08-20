# 🤖 AI Coding Agent Operations & Repository Guide

This document is a mandatory guide for any **AI Assistant** or **Automated Agent** working on the Multi Marg Carriers ERP repository.

---

## ⚠️ Core System Invariants & Rules (NEVER BREAK)

### 1. Financial Year Closing & Unbilled AWB Rule
* When executing a Year-End close (`/api/opening-balances/close-fy`), completed bills and paid AWBs dated $\le$ 31st March may be archived.
* **CRITICAL**: Any AWB dated $\le$ 31st March that is **UNBILLED** (`billed !== true` and `status !== "Billed"` and no linked `billNo`) **MUST NEVER BE DELETED**. It must be strictly preserved so it can be invoiced in the new financial year.

### 2. Modes of Transit Standardization
* The platform only permits 3 standard transit modes:
  * **`Road`** (`ROAD`)
  * **`Train`** (`TRAIN`) - *Never use `RAIL`*
  * **`Air`** (`AIR`) - *Never use `FLIGHT`*
* Do not introduce `SURFACE`, `EXPRESS ROAD`, or other ad-hoc mode values.

### 3. Dual Point-of-View Accounting for TDS & DEBT
* **Client Deductions**: TDS is a tax asset; DEBT is a revenue write-off.
* **Vendor Deductions**: TDS is a tax liability to pay Govt; DEBT is cost savings / margin profit.
* Keep the two viewpoints cleanly separated on the UI and in calculation logic.

### 4. Cash Sheet Invariant
* Direct payments and cash movements must **only** be entered in the Cash Sheet (`/cash-sheet`).
* The Outstanding page is **only** for non-cash deductions: TDS & DEBT.

### 5. Modal Dialogs via Portals
* Always use `createPortal(..., document.body)` with `.modal-overlay` and fixed positioning for popups/dialogs.
* Always lock background scrolling when a modal is open.

---

## 🛠️ Verification & Testing Protocols

1. **Before Modifying Routes or Controllers**:
   * Inspect existing schemas in [`docs/DATABASE_SCHEMA.md`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/DATABASE_SCHEMA.md).
   * Ensure any database mutations invalidate the appropriate Redis cache keys (`delCache(...)`).

2. **Frontend Testing**:
   * Ensure form state changes are protected by draft persistence in `sessionStorage`.
   * Verify all table action buttons fit on a single line on mobile and desktop viewports.
