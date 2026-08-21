# 🚚 Multi Marg Carriers ERP & Logistics Management System

Welcome to the **Multi Marg Carriers Logistics Management System** codebase. This repository contains the complete, production-grade logistics and enterprise resource planning (ERP) platform for freight forwarding, shipment booking, trip tracking, client billing, vendor invoicing, dual TDS/DEBT accounting, and automated financial year-end closing.

This documentation is curated so that human engineers and AI coding assistants can rapidly understand the system architecture, operational flows, database schemas, and coding conventions.

---

## 📑 Master Documentation Index

All in-depth specifications and operational guides are organized in the [`/docs`](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs) directory:

1. 🏛️ **[System Architecture & Tech Stack](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/ARCHITECTURE.md)**:
   * Tech stack details (React, Node.js/Express, MongoDB, Redis).
   * Firestore-to-MongoDB Compatibility Adapter (`dbAdapter.js`).
   * JWT Authentication & Role-Based Access Control (RBAC).
   * Redis caching and cache invalidation protocols.

2. 🔄 **[End-to-End Business Logic & Workflows](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/FLOWS_BUSINESS_LOGIC.md)**:
   * AWB Booking & Shipment Lifecycle.
   * Internal Trips & Trip MIS manifesting.
   * Vendor Trips & Vendor MIS workflows.
   * Client Invoicing (Sales Bills) & Vendor Invoicing (Purchase Bills).
   * Cash / Bank Settlement Ledger (`CashSheet`).
   * Dual Point-of-View TDS & DEBT Accounting (Client Loss/Tax Asset vs Vendor Profit/Tax Payable).
   * Prior Financial Year Opening Balances & Safe Year-End Closing (Unbilled AWB preservation).

3. 🗄️ **[Database Schema & Data Models](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/DATABASE_SCHEMA.md)**:
   * Complete schema definitions for all collections: `bookings`, `bills`, `purchases`, `cashEntries`, `outstanding`, `openingBalances`, `trips`, `trip_mis`, `vendor_mis`, `clients`, `vendors`, `rates`, `users`, `branches`.

4. 🌐 **[REST API Reference](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/API_DOCUMENTATION.md)**:
   * Comprehensive endpoint catalog with request/response examples for all `/api/*` endpoints.

5. 🎨 **[Frontend UI/UX Guidelines](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/FRONTEND_GUIDELINES.md)**:
   * UI components, modal dialog portal rules (`createPortal`), form draft persistence patterns, responsive single-line table action buttons, and printing templates.

6. 🤖 **[AI Coding Agent Operations & Rules Guide](file:///c:/Users/impra/OneDrive/Desktop/Logistics%20Softwares/soft.multimargcarriers.co.in/docs/AI_AGENT_OPERATIONS_GUIDE.md)**:
   * Critical instructions for future AI assistants working on this repo: accounting invariants, AWB retention rules, mode constraints (`Road`, `Train`, `Air`), and safe modification workflows.

---

## 🛠️ Technology Stack

| Layer | Technology | Key Libraries & Tooling |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Vanilla CSS, Lucide React, Axios, PapaParse, QRCode.react, JsBarcode, React-to-Print |
| **Backend** | Node.js (v18+), Express | MongoDB Native Driver, `ioredis` / Redis, JWT (`jsonwebtoken`), Bcrypt, Dotenv, CORS |
| **Database** | MongoDB (Atlas / Local) | Custom `dbAdapter.js` supporting standard Firestore-like chaining (`where`, `doc`, `get`, `add`, `update`, `delete`) |
| **Caching** | Redis (Upstash / Local) | In-memory key caching for fast query delivery with automated invalidation |

---

## 📂 Project Directory Structure

```plaintext
soft.multimargcarriers.co.in/
├── backend/                         # Node.js + Express Backend
│   ├── scripts/                     # Utility and maintenance scripts
│   ├── src/
│   │   ├── config/                  # Database, Redis & Adapter configs
│   │   │   ├── database.js          # MongoDB connection initializer
│   │   │   ├── dbAdapter.js         # Collection/Query adapter
│   │   │   └── redis.js             # Redis cache client & helpers
│   │   ├── controllers/             # Core business logic controllers
│   │   │   ├── bookingController.js # AWB shipment booking
│   │   │   ├── billController.js    # Sales invoicing
│   │   │   ├── purchaseController.js# Vendor purchase billing
│   │   │   ├── cashController.js    # Cash/Bank ledger entries
│   │   │   ├── outstandingController.js # TDS & DEBT adjustment logic
│   │   │   ├── openingBalanceController.js # Prior FY & Year-End Close
│   │   │   └── ...                  # Other controllers (trips, rates, auth)
│   │   ├── middleware/              # Auth & RBAC middlewares
│   │   ├── routes/                  # Express route definitions
│   │   └── utils/                   # Helper functions (numbers to words, etc.)
│   ├── server.js                    # Main server entrypoint
│   └── package.json
│
├── frontend/                        # React + Vite Frontend
│   ├── public/                      # Static assets & public reports
│   ├── src/
│   │   ├── components/              # Shared UI components & Modals
│   │   │   ├── Navbar.jsx           # Top navigation header
│   │   │   ├── Sidebar.jsx          # Left-hand module navigation
│   │   │   ├── QuickAddModal.jsx    # Quick entity creation modal
│   │   │   └── trips/               # Trip MIS & Vendor MIS modules
│   │   ├── context/                 # AuthContext, ToastContext, ThemeContext
│   │   ├── hooks/                   # Custom React hooks (useTableSort, etc.)
│   │   ├── pages/                   # Application Pages & Dashboards
│   │   │   ├── CreateBooking.jsx    # AWB Booking Form
│   │   │   ├── AllBills.jsx         # Sales Invoices List
│   │   │   ├── Purchase.jsx         # Vendor Purchase Invoices
│   │   │   ├── CashSheet.jsx        # Cash/Bank Financial Ledger
│   │   │   ├── TdsDebtManagement.jsx# Dual View TDS & DEBT Management
│   │   │   ├── OpeningOutstanding.jsx# Prior FY Opening Balances & FY Close
│   │   │   ├── Settings.jsx         # System Configs, FY Close Card
│   │   │   └── ...                  # Rates, Branches, Tracking, Users
│   │   ├── utils/                   # Formatters, calculations & PDF generators
│   │   ├── App.jsx                  # Main App router
│   │   ├── main.jsx                 # React root
│   │   └── index.css                # Global Design System & Utility CSS
│   └── package.json
│
├── docs/                            # Comprehensive System Documentation
│   ├── ARCHITECTURE.md              # Tech Stack & System Architecture
│   ├── FLOWS_BUSINESS_LOGIC.md      # Operational & Accounting Flows
│   ├── DATABASE_SCHEMA.md           # Database Models & Field Specs
│   ├── API_DOCUMENTATION.md         # API Endpoints Catalog
│   ├── FRONTEND_GUIDELINES.md       # UI/UX & Modal Portal Guidelines
│   └── AI_AGENT_OPERATIONS_GUIDE.md # Operating Rules for AI Assistants
│
└── README.md                        # Master Index (This File)
```

---

## ⚡ Quick Start & Development Setup

### 1. Backend Setup
```bash
cd backend
npm install
# Create .env with MONGODB_URI, REDIS_URL (optional), JWT_SECRET, PORT=5000
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Create .env with VITE_API_URL=http://localhost:5000/api
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 💎 Core Accounting & Real-Time Ledger Engine

### 1. TDS & Deductions Accounting
- **Client TDS**: Direct deduction by clients from invoices under Section 194C. Deducted directly from client outstanding liability.
- **Form 26AS Status**: Tracked as `Claimable` (Pending) vs `Recovered` (Verified / Received) directly in the UI.
- **Formula**:
  $$\text{Net Client Outstanding} = \text{Total Prior/Current Invoiced} - \text{Total Cash/Bank Received} - \text{Total TDS} - \text{Total Debt}$$

### 2. Waterfall Cascade Order (`paymentUtils.js`)
1. **Direct Tagged Payments & TDS**: Applied directly to the tagged invoice.
2. **Prior FY Opening Settlement**: General payments/TDS **first settle Prior FY Opening Balances** (`openingOutstanding`).
3. **Current Bills Cascade**: Leftover payments/TDS cascade sequentially across unpaid sales/purchase bills chronologically.
4. **Permanent Zeroing Rule**: Setting `totalBilledPrior = 0` or `openingOutstanding = 0` permanently fixes initial baseline due to 0 without stale recalculation regressions.

### 3. Automated CRUD Sync
All create, edit, delete, and restore actions on `cashEntries`, `outstanding`, `openingBalances`, `bills`, and `purchases` automatically invoke `recalculatePartyPayments` and bust dependent Redis caches for 100% production reliability.
