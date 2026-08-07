const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove requiredPermission from the parent wrappers
content = content.replace(/<ProtectedRoute requiredPermission="masters" \/>/g, '<ProtectedRoute />');
content = content.replace(/<ProtectedRoute requiredPermission="operations" \/>/g, '<ProtectedRoute />');
content = content.replace(/<ProtectedRoute requiredPermission="billing" \/>/g, '<ProtectedRoute />');
content = content.replace(/<ProtectedRoute requiredPermission="accounts" \/>/g, '<ProtectedRoute />');
content = content.replace(/<ProtectedRoute requiredPermission="reports" \/>/g, '<ProtectedRoute />');
content = content.replace(/<ProtectedRoute requiredPermission="uploads" \/>/g, '<ProtectedRoute />');
// Note: superadmin, trips, tripmis, vendormis wrappers are already single routes or admin-only, they can stay as is or be cleaned too. But I'll leave them if they are fine.

// 2. Add requiredPermission to individual routes
const routes = {
  // Masters
  '<Route path="/clients" element={<Clients />} />': '<Route path="/clients" element={<ProtectedRoute requiredPermission="clients"><Clients /></ProtectedRoute>} />',
  '<Route path="/vendors" element={<Vendors />} />': '<Route path="/vendors" element={<ProtectedRoute requiredPermission="vendors"><Vendors /></ProtectedRoute>} />',
  '<Route path="/branches" element={<Branches />} />': '<Route path="/branches" element={<ProtectedRoute requiredPermission="branches"><Branches /></ProtectedRoute>} />',
  '<Route path="/cities" element={<Cities />} />': '<Route path="/cities" element={<ProtectedRoute requiredPermission="cities"><Cities /></ProtectedRoute>} />',
  '<Route path="/rates" element={<Rates />} />': '<Route path="/rates" element={<ProtectedRoute requiredPermission="client_rates"><Rates /></ProtectedRoute>} />',
  
  // Operations
  '<Route path="/bookings" element={<BookingsList />} />': '<Route path="/bookings" element={<ProtectedRoute requiredPermission="bookings"><BookingsList /></ProtectedRoute>} />',
  '<Route path="/bookings/create" element={<CreateBooking />} />': '<Route path="/bookings/create" element={<ProtectedRoute requiredPermission="create_booking"><CreateBooking /></ProtectedRoute>} />',
  '<Route path="/bookings/edit/:id" element={<CreateBooking />} />': '<Route path="/bookings/edit/:id" element={<ProtectedRoute requiredPermission="create_booking"><CreateBooking /></ProtectedRoute>} />',
  '<Route path="/print-lr/:id" element={<PrintLR />} />': '<Route path="/print-lr/:id" element={<ProtectedRoute requiredPermission="bookings"><PrintLR /></ProtectedRoute>} />',
  '<Route path="/print-manifest/:id" element={<PrintManifest />} />': '<Route path="/print-manifest/:id" element={<ProtectedRoute requiredPermission="bookings"><PrintManifest /></ProtectedRoute>} />',
  '<Route path="/print-trip-list" element={<PrintTripList />} />': '<Route path="/print-trip-list" element={<ProtectedRoute requiredPermission="trips"><PrintTripList /></ProtectedRoute>} />',
  '<Route path="/print-single-trip/:index" element={<PrintSingleTrip />} />': '<Route path="/print-single-trip/:index" element={<ProtectedRoute requiredPermission="trips"><PrintSingleTrip /></ProtectedRoute>} />',
  '<Route path="/pod" element={<POD />} />': '<Route path="/pod" element={<ProtectedRoute requiredPermission="pod"><POD /></ProtectedRoute>} />',
  '<Route path="/pod/view" element={<PodViewer />} />': '<Route path="/pod/view" element={<ProtectedRoute requiredPermission="pod"><PodViewer /></ProtectedRoute>} />',
  '<Route path="/tracking" element={<Tracking />} />': '<Route path="/tracking" element={<ProtectedRoute requiredPermission="track_shipment"><Tracking /></ProtectedRoute>} />',

  // Billing
  '<Route path="/bills" element={<Bills />} />': '<Route path="/bills" element={<ProtectedRoute requiredPermission="all_bills"><Bills /></ProtectedRoute>} />',
  '<Route path="/bills/all" element={<AllBills />} />': '<Route path="/bills/all" element={<ProtectedRoute requiredPermission="all_bills"><AllBills /></ProtectedRoute>} />',
  '<Route path="/bills/view1/:id" element={<BillView1 />} />': '<Route path="/bills/view1/:id" element={<ProtectedRoute requiredPermission="all_bills"><BillView1 /></ProtectedRoute>} />',
  '<Route path="/bills/view2/:id" element={<BillView2 />} />': '<Route path="/bills/view2/:id" element={<ProtectedRoute requiredPermission="all_bills"><BillView2 /></ProtectedRoute>} />',
  '<Route path="/bills/generate" element={<GenerateBill />} />': '<Route path="/bills/generate" element={<ProtectedRoute requiredPermission="generate_bills"><GenerateBill /></ProtectedRoute>} />',
  '<Route path="/bills/misc" element={<MiscBill />} />': '<Route path="/bills/misc" element={<ProtectedRoute requiredPermission="misc_bill"><MiscBill /></ProtectedRoute>} />',
  '<Route path="/bills/update" element={<UpdateBill />} />': '<Route path="/bills/update" element={<ProtectedRoute requiredPermission="update_bill"><UpdateBill /></ProtectedRoute>} />',
  '<Route path="/invoices/update" element={<UpdateInvoice />} />': '<Route path="/invoices/update" element={<ProtectedRoute requiredPermission="update_bill"><UpdateInvoice /></ProtectedRoute>} />',

  // Accounts
  '<Route path="/cash-sheet" element={<CashSheet />} />': '<Route path="/cash-sheet" element={<ProtectedRoute requiredPermission="cash_sheet"><CashSheet /></ProtectedRoute>} />',
  '<Route path="/purchases" element={<Purchase />} />': '<Route path="/purchases" element={<ProtectedRoute requiredPermission="purchases"><Purchase /></ProtectedRoute>} />',

  // Reports
  '<Route path="/reports/analytics" element={<Analytics />} />': '<Route path="/reports/analytics" element={<ProtectedRoute requiredPermission="analytics"><Analytics /></ProtectedRoute>} />',
  '<Route path="/reports/gst" element={<GST />} />': '<Route path="/reports/gst" element={<ProtectedRoute requiredPermission="gst_reports"><GST /></ProtectedRoute>} />',
  '<Route path="/reports/mis" element={<MISReports />} />': '<Route path="/reports/mis" element={<ProtectedRoute requiredPermission="mis_reports"><MISReports /></ProtectedRoute>} />',
  '<Route path="/reports/unbilled" element={<UnbilledReports />} />': '<Route path="/reports/unbilled" element={<ProtectedRoute requiredPermission="unbilled_reports"><UnbilledReports /></ProtectedRoute>} />',
  '<Route path="/reports/sales" element={<SalesReports />} />': '<Route path="/reports/sales" element={<ProtectedRoute requiredPermission="sales_reports"><SalesReports /></ProtectedRoute>} />',
  '<Route path="/reports/purchases" element={<PurchaseReports />} />': '<Route path="/reports/purchases" element={<ProtectedRoute requiredPermission="purchase_reports"><PurchaseReports /></ProtectedRoute>} />',
  '<Route path="/reports/cashsheet" element={<CashsheetReports />} />': '<Route path="/reports/cashsheet" element={<ProtectedRoute requiredPermission="cashsheet_reports"><CashsheetReports /></ProtectedRoute>} />',
  '<Route path="/reports/client-trips" element={<ClientTripReports />} />': '<Route path="/reports/client-trips" element={<ProtectedRoute requiredPermission="client_trip_reports"><ClientTripReports /></ProtectedRoute>} />',

  // Uploads
  '<Route path="/upload-box" element={<UploadBox />} />': '<Route path="/upload-box" element={<ProtectedRoute requiredPermission="upload_box"><UploadBox /></ProtectedRoute>} />',
  '<Route path="/upload-vouchers" element={<UploadVouchers />} />': '<Route path="/upload-vouchers" element={<ProtectedRoute requiredPermission="upload_box"><UploadVouchers /></ProtectedRoute>} />'
};

for (const [key, value] of Object.entries(routes)) {
  if (content.includes(key)) {
    content = content.replace(key, value);
    console.log("Replaced:", key);
  } else {
    console.log("WARNING: Could not find key:", key);
  }
}

fs.writeFileSync(file, content);
console.log("App.jsx patched successfully!");
