import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Vendors from "./pages/Vendors";
import CreateBooking from "./pages/CreateBooking";
import Bills from "./pages/Bills";
import AllBills from "./pages/AllBills";
import BillView1 from "./pages/BillView1";
import BillView2 from "./pages/BillView2";
import BookingsList from "./pages/BookingsList";
import Branches from "./pages/Branches";
import CashSheet from "./pages/CashSheet";
import Cities from "./pages/Cities";
import GenerateBill from "./pages/GenerateBill";
import GST from "./pages/GST";
import MISReports from "./pages/reports/MISReports";
import UnbilledReports from "./pages/reports/UnbilledReports";
import SalesReports from "./pages/reports/SalesReports";
import PurchaseReports from "./pages/reports/PurchaseReports";
import CashsheetReports from "./pages/reports/CashsheetReports";
import ClientTripReports from "./pages/reports/ClientTripReports";
import Analytics from "./pages/Analytics";

import MiscBill from "./pages/MiscBill";
import POD from "./pages/POD";
import Purchase from "./pages/Purchase";
import Rates from "./pages/Rates";
import Trips from "./pages/Trips";
import UpdateBill from "./pages/UpdateBill";
import UpdateInvoice from "./pages/UpdateInvoice";
import UploadBox from "./pages/UploadBox";
import UploadVouchers from "./pages/UploadVouchers";
import IAM from "./pages/IAM";
import SystemLogs from "./pages/SystemLogs";
import Tracking from "./pages/Tracking";
import { AuthProvider } from "./context/AuthContext";
import { DialogProvider } from "./context/DialogContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";

import Profile from "./pages/Profile";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <DialogProvider>
            <Routes>
          <Route path="/" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<DashboardLayout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* IAM - SuperAdmin Only */}
            <Route element={<ProtectedRoute requiredPermission="superadmin" />}>
              <Route path="/iam" element={<IAM />} />
              <Route path="/logs" element={<SystemLogs />} />
            </Route>

            {/* Masters */}
            <Route element={<ProtectedRoute requiredPermission="masters" />}>
              <Route path="/clients" element={<Clients />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/cities" element={<Cities />} />
              
              <Route path="/rates" element={<Rates />} />
            </Route>

            {/* Operations */}
            <Route element={<ProtectedRoute requiredPermission="operations" />}>
              <Route path="/bookings" element={<BookingsList />} />
              <Route path="/bookings/create" element={<CreateBooking />} />
              <Route path="/pod" element={<POD />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/tracking" element={<Tracking />} />
            </Route>

            {/* Billing */}
            <Route element={<ProtectedRoute requiredPermission="billing" />}>
              <Route path="/bills" element={<Bills />} />
              <Route path="/bills/all" element={<AllBills />} />
              <Route path="/bills/view1/:id" element={<BillView1 />} />
              <Route path="/bills/view2/:id" element={<BillView2 />} />
              <Route path="/bills/generate" element={<GenerateBill />} />
              <Route path="/bills/misc" element={<MiscBill />} />
              <Route path="/bills/update" element={<UpdateBill />} />
              <Route path="/invoices/update" element={<UpdateInvoice />} />
            </Route>

            {/* Accounts */}
            <Route element={<ProtectedRoute requiredPermission="accounts" />}>
              <Route path="/cash-sheet" element={<CashSheet />} />
              <Route path="/purchases" element={<Purchase />} />
            </Route>

            
            {/* Reports */}
            <Route element={<ProtectedRoute requiredPermission="reports" />}>
              <Route path="/reports/analytics" element={<Analytics />} />
              <Route path="/reports/gst" element={<GST />} />
              <Route path="/reports/mis" element={<MISReports />} />
              <Route path="/reports/unbilled" element={<UnbilledReports />} />
              <Route path="/reports/sales" element={<SalesReports />} />
              <Route path="/reports/purchases" element={<PurchaseReports />} />
              <Route path="/reports/cashsheet" element={<CashsheetReports />} />
              <Route path="/reports/client-trips" element={<ClientTripReports />} />
            </Route>

            {/* Uploads */}
            <Route element={<ProtectedRoute requiredPermission="uploads" />}>
              <Route path="/upload-box" element={<UploadBox />} />
              <Route path="/upload-vouchers" element={<UploadVouchers />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DialogProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
