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
import PrintSingleVendorTrip from "./pages/PrintSingleVendorTrip";
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
import TripMIS from "./components/trips/TripMIS";
import VendorMIS from "./components/trips/VendorMIS";
import UpdateBill from "./pages/UpdateBill";
import UpdateInvoice from "./pages/UpdateInvoice";
import UploadBox from "./pages/UploadBox";
import UploadVouchers from "./pages/UploadVouchers";
import IAM from "./pages/IAM";
import SystemLogs from "./pages/SystemLogs";
import Tracking from "./pages/Tracking";
import Settings from "./pages/Settings";
import Quotes from "./pages/Quotes";
import Trash from "./pages/Trash";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { DialogProvider } from "./context/DialogContext";
import { NotificationProvider } from "./context/NotificationContext";
import { BadgeProvider } from "./context/BadgeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MaintenanceGuard from "./components/MaintenanceGuard";
import "./index.css";

// Prevent mouse wheel from changing number input values globally
document.addEventListener("wheel", function(_event) {
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
                <BadgeProvider>
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
              <Route path="/quotes" element={<Quotes />} />
            </Route>

            {/* Masters */}
            <Route element={<MaintenanceGuard><ProtectedRoute /></MaintenanceGuard>}>
              <Route path="/clients" element={<ProtectedRoute requiredPermission="clients"><Clients /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute requiredPermission="vendors"><Vendors /></ProtectedRoute>} />
              <Route path="/branches" element={<ProtectedRoute requiredPermission="branches"><Branches /></ProtectedRoute>} />
              <Route path="/cities" element={<ProtectedRoute requiredPermission="cities"><Cities /></ProtectedRoute>} />
              
              <Route path="/rates" element={<ProtectedRoute requiredPermission="client_rates"><Rates /></ProtectedRoute>} />
            </Route>

            {/* Operations */}
            <Route element={<MaintenanceGuard><ProtectedRoute /></MaintenanceGuard>}>
              <Route path="/bookings" element={<ProtectedRoute requiredPermission="bookings"><BookingsList /></ProtectedRoute>} />
              <Route path="/bookings/create" element={<ProtectedRoute requiredPermission="create_booking"><CreateBooking /></ProtectedRoute>} />
              <Route path="/bookings/edit/:id" element={<ProtectedRoute requiredPermission="create_booking"><CreateBooking /></ProtectedRoute>} />
              <Route path="/print-lr/:id" element={<ProtectedRoute requiredPermission="bookings"><PrintLR /></ProtectedRoute>} />
              <Route path="/print-manifest/:id" element={<ProtectedRoute requiredPermission="bookings"><PrintManifest /></ProtectedRoute>} />
              <Route path="/print-trip-list" element={<ProtectedRoute requiredPermission="trips"><PrintTripList /></ProtectedRoute>} />
              <Route path="/print-single-trip/:index" element={<ProtectedRoute requiredPermission="trips"><PrintSingleTrip /></ProtectedRoute>} />
              <Route path="/print-vendor-trip/:index" element={<ProtectedRoute requiredPermission="trips"><PrintSingleVendorTrip /></ProtectedRoute>} />
              <Route path="/pod" element={<ProtectedRoute requiredPermission="pod"><POD /></ProtectedRoute>} />
              <Route path="/pod/view" element={<ProtectedRoute requiredPermission="pod"><PodViewer /></ProtectedRoute>} />
              <Route path="/tracking" element={<Tracking />} />
            </Route>

            {/* Trips - Has its own permission requirement because vendors need it without operations */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="trips" /></MaintenanceGuard>}>
              <Route path="/trips" element={<Trips />} />
            </Route>
            
            {/* Trip MIS */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="tripmis" /></MaintenanceGuard>}>
              <Route path="/trip-mis" element={<TripMIS />} />
            </Route>

            {/* Vendor MIS */}
            <Route element={<MaintenanceGuard><ProtectedRoute requiredPermission="vendormis" /></MaintenanceGuard>}>
              <Route path="/vendor-mis" element={<VendorMIS />} />
            </Route>

            {/* Billing */}
            <Route element={<MaintenanceGuard><ProtectedRoute /></MaintenanceGuard>}>
              <Route path="/bills" element={<ProtectedRoute requiredPermission="all_bills"><Bills /></ProtectedRoute>} />
              <Route path="/bills/all" element={<ProtectedRoute requiredPermission="all_bills"><AllBills /></ProtectedRoute>} />
              <Route path="/bills/view1/:id" element={<ProtectedRoute requiredPermission="all_bills"><BillView1 /></ProtectedRoute>} />
              <Route path="/bills/view2/:id" element={<ProtectedRoute requiredPermission="all_bills"><BillView2 /></ProtectedRoute>} />
              <Route path="/bills/generate" element={<ProtectedRoute requiredPermission="generate_bills"><GenerateBill /></ProtectedRoute>} />
              <Route path="/bills/misc" element={<ProtectedRoute requiredPermission="misc_bill"><MiscBill /></ProtectedRoute>} />
              <Route path="/bills/update" element={<ProtectedRoute requiredPermission="update_bill"><UpdateBill /></ProtectedRoute>} />
              <Route path="/invoices/update" element={<ProtectedRoute requiredPermission="update_bill"><UpdateInvoice /></ProtectedRoute>} />
            </Route>

            {/* Accounts */}
            <Route element={<MaintenanceGuard><ProtectedRoute /></MaintenanceGuard>}>
              <Route path="/cash-sheet" element={<ProtectedRoute requiredPermission="cash_sheet"><CashSheet /></ProtectedRoute>} />
              <Route path="/purchases" element={<ProtectedRoute requiredPermission="purchases"><Purchase /></ProtectedRoute>} />
            </Route>

            
            {/* Reports */}
            <Route element={<MaintenanceGuard><ProtectedRoute /></MaintenanceGuard>}>
              <Route path="/reports/analytics" element={<ProtectedRoute requiredPermission="analytics"><Analytics /></ProtectedRoute>} />
              <Route path="/reports/gst" element={<ProtectedRoute requiredPermission="gst_reports"><GST /></ProtectedRoute>} />
              <Route path="/reports/mis" element={<ProtectedRoute requiredPermission="mis_reports"><MISReports /></ProtectedRoute>} />
              <Route path="/reports/unbilled" element={<ProtectedRoute requiredPermission="unbilled_reports"><UnbilledReports /></ProtectedRoute>} />
              <Route path="/reports/sales" element={<ProtectedRoute requiredPermission="sales_reports"><SalesReports /></ProtectedRoute>} />
              <Route path="/reports/purchases" element={<ProtectedRoute requiredPermission="purchase_reports"><PurchaseReports /></ProtectedRoute>} />
              <Route path="/reports/cashsheet" element={<ProtectedRoute requiredPermission="cashsheet_reports"><CashsheetReports /></ProtectedRoute>} />
              <Route path="/reports/client-trips" element={<ProtectedRoute requiredPermission="client_trip_reports"><ClientTripReports /></ProtectedRoute>} />
            </Route>

            {/* Uploads */}
            <Route element={<MaintenanceGuard><ProtectedRoute /></MaintenanceGuard>}>
              <Route path="/upload-box" element={<ProtectedRoute requiredPermission="upload_box"><UploadBox /></ProtectedRoute>} />
              <Route path="/upload-vouchers" element={<ProtectedRoute requiredPermission="upload_box"><UploadVouchers /></ProtectedRoute>} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BadgeProvider>
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
