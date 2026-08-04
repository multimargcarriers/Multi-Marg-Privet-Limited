import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import InstallPWA from "./components/InstallPWA";
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
import PrintLR from "./pages/PrintLR";
import PrintManifest from "./pages/PrintManifest";
import PrintTripList from "./pages/PrintTripList";
import PrintSingleTrip from "./pages/PrintSingleTrip";
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
import Profile from './pages/Profile';
import EmployeeActivity from './pages/EmployeeActivity';
import POD from "./pages/POD";
import PodViewer from "./pages/PodViewer";
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
import Settings from "./pages/Settings";
import Trash from "./pages/Trash";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { DialogProvider } from "./context/DialogContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MaintenanceGuard from "./components/MaintenanceGuard";
import "./index.css";

// Prevent mouse wheel from changing number input values globally
document.addEventListener("wheel", function(event) {
  if (document.activeElement.type === "number") {
    document.activeElement.blur();
  }
});

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <DialogProvider>
              <NotificationProvider>
                <Routes>
          <Route path="/" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<DashboardLayout />}>
            <Route element={<MaintenanceGuard><ProtectedRoute /></MaintenanceGuard>}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/trash" element={<Trash />} />
            </Route>
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="dashboard" /></MaintenanceGuard>}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            {/* IAM - SuperAdmin Only */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="superadmin" /></MaintenanceGuard>}>
              <Route path="/iam" element={<IAM />} />
              <Route path="/employee-activity" element={<EmployeeActivity />} />
              <Route path="/logs" element={<SystemLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Masters */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="masters" /></MaintenanceGuard>}>
              <Route path="/clients" element={<Clients />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/cities" element={<Cities />} />
              
              <Route path="/rates" element={<Rates />} />
            </Route>

            {/* Operations */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="operations" /></MaintenanceGuard>}>
              <Route path="/bookings" element={<BookingsList />} />
              <Route path="/bookings/create" element={<CreateBooking />} />
              <Route path="/bookings/edit/:id" element={<CreateBooking />} />
              <Route path="/print-lr/:id" element={<PrintLR />} />
              <Route path="/print-manifest/:id" element={<PrintManifest />} />
              <Route path="/print-trip-list" element={<PrintTripList />} />
              <Route path="/print-single-trip/:index" element={<PrintSingleTrip />} />
              <Route path="/pod" element={<POD />} />
              <Route path="/pod/view" element={<PodViewer />} />
              <Route path="/tracking" element={<Tracking />} />
            </Route>

            {/* Trips - Has its own permission requirement because vendors need it without operations */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="trips" /></MaintenanceGuard>}>
              <Route path="/trips" element={<Trips />} />
            </Route>

            {/* Billing */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="billing" /></MaintenanceGuard>}>
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
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="accounts" /></MaintenanceGuard>}>
              <Route path="/cash-sheet" element={<CashSheet />} />
              <Route path="/purchases" element={<Purchase />} />
            </Route>

            
            {/* Reports */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="reports" /></MaintenanceGuard>}>
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
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="uploads" /></MaintenanceGuard>}>
              <Route path="/upload-box" element={<UploadBox />} />
              <Route path="/upload-vouchers" element={<UploadVouchers />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </NotificationProvider>
            </DialogProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
      <InstallPWA />
    </BrowserRouter>
  );
}

export default App;
