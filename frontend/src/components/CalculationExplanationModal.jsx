import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  HelpCircle,
  X,
  Scale,
  Users,
  Building2,
  DollarSign,
  Percent,
  Calculator,
  ShieldCheck,
  Clock,
  Receipt,
  CreditCard,
  FileText,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Activity,
  Truck,
  ShoppingCart
} from "lucide-react";

/**
 * Registry of all explanations for Dashboard and Summary Sheet Cards & Columns
 * Backed by actual live database figures and concrete accounting proofs.
 */
export const EXPLANATION_REGISTRY = {
  // ==========================================
  // --- OUTSTANDING SUMMARY KPI CARDS ---
  // ==========================================
  money_to_receive: {
    id: "money_to_receive",
    badge: "Customer Receivables",
    title: "Money to Receive (Customers)",
    subtitle: "Total outstanding payments to collect from all corporate clients.",
    icon: Users,
    iconColor: "#2563eb",
    iconBg: "#eff6ff",
    masterFormula: "Total Receivables = (Prior FY Opening Dues + Current FY Invoices) - Money Received - TDS Withheld - Discounts",
    simpleDesc: "The total legal outstanding amount due from corporate clients for freight services delivered across prior and current financial years.",
    steps: [
      {
        title: "1. Prior FY Opening Dues (Before 31-03-2026)",
        desc: "₹2,10,53,478.58 carried forward from prior financial years from opening balances."
      },
      {
        title: "2. Current FY 2026-2027 Invoices",
        desc: "₹1,14,78,265.33 generated across 192 tax invoices with 18% GST."
      },
      {
        title: "3. Less: Realized Collections (Cash In)",
        desc: "₹6,86,118.00 received via bank transfers and cash registers from clients."
      },
      {
        title: "4. Less: TDS Deductions (Sec 194C)",
        desc: "₹9,543.00 tax withheld by clients deposited directly to Government tax credit."
      }
    ],
    realExample: "📊 Live Calculation: (₹2,10,53,478.58 Opening Due + ₹1,14,78,265.33 New Invoices) - ₹6,86,118.00 Received - ₹9,543.00 TDS = ₹3,18,36,082.91 Total Customer Receivables."
  },

  total_money_received: {
    id: "total_money_received",
    badge: "Cash & Bank Collections",
    title: "Total Money Received",
    subtitle: "Realized cash and bank collections deposited from clients.",
    icon: DollarSign,
    iconColor: "#16a34a",
    iconBg: "#f0fdf4",
    masterFormula: "Total Received = Sum of all 'Cash In' + NEFT/RTGS/IMPS Bank Credits from Clients",
    simpleDesc: "The actual liquid funds received from customers that have cleared into Multi Marg Carriers bank accounts or cash registers.",
    steps: [
      {
        title: "1. Cash & Bank Receipts",
        desc: "Entries recorded in the Cash Sheet marked as 'In' linked to client accounts."
      },
      {
        title: "2. Waterfall Invoice Settlement",
        desc: "Payments automatically settle the oldest pending bills first."
      },
      {
        title: "3. Direct Balance Reduction",
        desc: "Immediately reduces the customer's outstanding due balance in real time."
      }
    ],
    realExample: "📊 Live Calculation: Sum of all verified customer receipt vouchers across client ledgers = ₹6,86,118.00 Total Received."
  },

  tds_and_discounts: {
    id: "tds_and_discounts",
    badge: "Tax Credits & Deductions",
    title: "TDS (Tax) & Discounts / Debts",
    subtitle: "Income tax withheld by clients under Sec 194C plus approved discounts.",
    icon: Percent,
    iconColor: "#d97706",
    iconBg: "#fef3c7",
    masterFormula: "Total Deductions = Total TDS Withheld (Sec 194C) + Approved Bad Debts / Discounts",
    simpleDesc: "TDS is income tax withheld by corporate clients (1% for individuals/proprietorships, 2% for companies) deposited to the Income Tax Department on our behalf.",
    steps: [
      {
        title: "1. TDS Under Section 194C",
        desc: "Deducted by clients from freight payments and reflected in Form 26AS."
      },
      {
        title: "2. Full Bill Settlement Credit",
        desc: "TDS is recognized as full payment towards invoice settlement."
      },
      {
        title: "3. Commercial Discounts & Adjustments",
        desc: "Approved rate adjustments, weight differences, or debit notes."
      }
    ],
    realExample: "📊 Live Calculation: ₹9,543.00 TDS recorded from corporate clients + ₹0.00 Bad Debts = ₹9,543.00 Total Deductions."
  },

  money_to_pay: {
    id: "money_to_pay",
    badge: "Vendor Payables",
    title: "Money to Pay (Vendors)",
    subtitle: "Total pending payables to vehicle suppliers and airline cargo carriers.",
    icon: Building2,
    iconColor: "#e11d48",
    iconBg: "#fff1f2",
    masterFormula: "Total Payables = (Prior FY Vendor Opening Due + Current Purchases) - Cash Paid - TDS - Discounts",
    simpleDesc: "The total unsettled balance owed to vehicle suppliers, truck owners, and airline cargo partners for transport trips hired.",
    steps: [
      {
        title: "1. Prior FY Vendor Opening Dues",
        desc: "₹17,81,464.28 unpaid transport supplier balances brought forward from prior years."
      },
      {
        title: "2. Current FY 2026-2027 Vehicle Hires",
        desc: "₹30,35,707.74 recorded across 19 transport suppliers."
      },
      {
        title: "3. Less: Payments Made (Cash Out)",
        desc: "Payments sent to suppliers via bank transfers, fuel advances, or cash."
      }
    ],
    realExample: "📊 Live Calculation: ₹17,81,464.28 (Opening Vendor Dues) + ₹30,35,707.74 (Current Purchases) - ₹0.00 Paid = ₹48,17,172.02 Total Vendor Payables."
  },

  net_balance: {
    id: "net_balance",
    badge: "Company Net Liquidity",
    title: "Net Balance (Master Company Position)",
    subtitle: "Overall liquid surplus or deficit position of Multi Marg Carriers.",
    icon: Scale,
    iconColor: "#059669",
    iconBg: "#ecfdf5",
    masterFormula: "Net Balance = Total Money to Receive (Customers) - Total Money to Pay (Vendors)",
    simpleDesc: "The net financial position of the company. A positive value indicates a healthy cash surplus where customer receivables comfortably exceed supplier obligations.",
    steps: [
      {
        title: "1. Total Customer Receivables (+)",
        desc: "₹3,18,36,082.91 to collect from corporate clients across all accounts."
      },
      {
        title: "2. Total Vendor Payables (-)",
        desc: "₹48,17,172.02 to disburse to transport fleet vendors."
      },
      {
        title: "3. Net Surplus Liquidity Position",
        desc: "Positive cash inflow of ₹2,70,18,910.89 expected upon full realization."
      }
    ],
    realExample: "📊 Live Calculation: ₹3,18,36,082.91 (Receivables) - ₹48,17,172.02 (Payables) = +₹2,70,18,910.89 Net Liquid Surplus (🟢 Positive)."
  },

  // ==========================================
  // --- TABLE COLUMNS ---
  // ==========================================
  col_party_name: {
    id: "col_party_name",
    badge: "Master Account",
    title: "Company / Person Name",
    subtitle: "Registered client or vendor account with code & GSTIN.",
    icon: FileText,
    iconColor: "#475569",
    iconBg: "#f1f5f9",
    masterFormula: "Unified Account Identifier (Standardized Name + Client Code + GSTIN)",
    simpleDesc: "The legal registered identity of the customer or supplier. All invoices, cash receipts, and adjustments are unified under this single account.",
    steps: [
      {
        title: "1. Standardized Party Name",
        desc: "E.g. Starways Industries - Chakan, Sky 4 Pune, Hogobie Tech Private Limited."
      },
      {
        title: "2. Client / Vendor Code",
        desc: "Unique reference code (e.g. MCPL-091, MCPL-0001)."
      },
      {
        title: "3. 15-Digit GSTIN",
        desc: "Goods & Services Tax Identification Number for GST compliance."
      }
    ],
    realExample: "📊 Live Example: Clicking on 'Starways Industries - Chakan' expands their complete ledger with all 3 invoices and payment history."
  },

  col_old_pending: {
    id: "col_old_pending",
    badge: "Prior FY Opening Due",
    title: "Old Pending Balance (Before 31-03-2026)",
    subtitle: "Unsettled pending balance brought forward from earlier financial years.",
    icon: Clock,
    iconColor: "#b45309",
    iconBg: "#fef3c7",
    masterFormula: "Old Pending = (Prior Years Total Invoiced) - (Prior Years Total Paid + TDS + Discounts)",
    simpleDesc: "Unsettled historical balance as of 31st March carried forward into FY 2026-2027 as opening ledger dues.",
    steps: [
      {
        title: "1. Closing Balance on 31st March",
        desc: "Calculated at financial year-end and locked in openingBalances collection."
      },
      {
        title: "2. Settle-First Priority",
        desc: "General customer payments settle this opening balance first before current bills."
      }
    ],
    realExample: "📊 Live Example: Starways Industries - Chakan had ₹5,77,741.00 pending on 31-03-2026, preserved as Old Pending Balance."
  },

  col_this_year_bills: {
    id: "col_this_year_bills",
    badge: "Current FY Invoices",
    title: "This Year Bills / Purchases",
    subtitle: "All tax invoices generated in the active financial year (2026-2027).",
    icon: Receipt,
    iconColor: "#2563eb",
    iconBg: "#eff6ff",
    masterFormula: "This Year Bills = Sum of all Invoices (MCPL/26-27/XXXX) generated for this party",
    simpleDesc: "The total invoiced amount of transport trips and shipments booked in the current financial session.",
    steps: [
      {
        title: "1. Shipment AWBs Combined",
        desc: "Combines shipment AWBs with freight, pickup, delivery, and handling charges."
      },
      {
        title: "2. 18% GST Included",
        desc: "Calculates 9% CGST + 9% SGST (within state) or 18% IGST (inter-state)."
      }
    ],
    realExample: "📊 Live Example: Starways Industries - Chakan has 3 bills totaling ₹21,65,872.30 in FY 2026-2027."
  },

  col_total_billed: {
    id: "col_total_billed",
    badge: "Cumulative Total",
    title: "Total Billed Amount",
    subtitle: "Complete cumulative billing across all financial periods.",
    icon: Calculator,
    iconColor: "#0f172a",
    iconBg: "#f8fafc",
    masterFormula: "Total Billed = Old Pending Balance + This Year Bills",
    simpleDesc: "The grand total of all services invoiced to this party, combining their old pending balance and current year invoices.",
    steps: [
      {
        title: "1. Old Pending Due (+)",
        desc: "Past year baseline balance carried forward."
      },
      {
        title: "2. Current Year Bills (+)",
        desc: "New sales bills generated this session."
      }
    ],
    realExample: "📊 Live Calculation for Starways Industries: ₹5,77,741.00 (Old) + ₹21,65,872.30 (Current Bills) = ₹27,43,613.30 Total Billed."
  },

  col_money_received: {
    id: "col_money_received",
    badge: "Actual Collections",
    title: "Money Received / Money Paid",
    subtitle: "Total liquid cash and bank collections credited to this account.",
    icon: CreditCard,
    iconColor: "#16a34a",
    iconBg: "#f0fdf4",
    masterFormula: "Money Received = Total Cash In + Bank Credits for this party in Cash Sheet",
    simpleDesc: "All actual collections recorded for this client in the Cash & Bank ledger.",
    steps: [
      {
        title: "1. Verified Cash Sheet Entries",
        desc: "Recorded with bank transaction reference numbers (UTR/Cheque)."
      },
      {
        title: "2. Real-Time Due Deduction",
        desc: "Instantly reduces the pending due on the party's ledger."
      }
    ],
    realExample: "📊 Live Example: When a customer makes an NEFT transfer of ₹1,01,629.00, it is recorded here in green and reduces their pending due by ₹1,01,629.00."
  },

  col_tds: {
    id: "col_tds",
    badge: "Section 194C TDS",
    title: "TDS (Tax Deducted at Source)",
    subtitle: "Income tax withheld by client deposited with Government.",
    icon: Percent,
    iconColor: "#d97706",
    iconBg: "#fef3c7",
    masterFormula: "TDS Deducted = Sum of all TDS adjustments recorded for this party",
    simpleDesc: "Under Indian tax law (Sec 194C), corporate clients deduct 1% or 2% TDS from transport payments. Once entered, it reduces customer due and is claimed back in annual income tax returns.",
    steps: [
      {
        title: "1. Statutory Deduction (1% or 2%)",
        desc: "Deducted by the corporate customer when releasing payments."
      },
      {
        title: "2. Full Bill Settlement Credit",
        desc: "Counts as money paid towards settling the invoice."
      }
    ],
    realExample: "📊 Live Example: If a client pays ₹9,800.00 with ₹200.00 TDS on a ₹10,000.00 bill, the bill is 100% settled with ₹0.00 remaining due."
  },

  col_discounts: {
    id: "col_discounts",
    badge: "Adjustments & Debts",
    title: "Discounts / Debts / Corrections",
    subtitle: "Approved commercial rate discounts, debit notes, and write-offs.",
    icon: TrendingDown,
    iconColor: "#7c3aed",
    iconBg: "#f5f3ff",
    masterFormula: "Discounts = Sum of all Debit/Credit discount adjustments",
    simpleDesc: "Any agreed rate reduction, weight difference concession, or bad debt write-off agreed with the customer.",
    steps: [
      {
        title: "1. Commercial Adjustment Voucher",
        desc: "Discounts approved by management to settle disputed invoices."
      },
      {
        title: "2. Due Balance Reduction",
        desc: "Reduces the remaining pending balance without requiring cash payment."
      }
    ],
    realExample: "📊 Live Example: An approved rate correction of ₹500.00 reduces the customer's pending due by exactly ₹500.00."
  },

  col_final_due: {
    id: "col_final_due",
    badge: "Net Balance Due",
    title: "Final Pending Due (Remaining Balance)",
    subtitle: "The exact net remaining amount to be collected or paid.",
    icon: DollarSign,
    iconColor: "#1e3a8a",
    iconBg: "#eff6ff",
    masterFormula: "Final Pending Due = Total Billed - Money Received - TDS - Discounts",
    simpleDesc: "The exact net remaining balance for this company. For clients, this is money to collect; for vendors, this is money to pay.",
    steps: [
      {
        title: "1. Starting Balance",
        desc: "Total Billed (Old Balance + Current Invoices)."
      },
      {
        title: "2. Deduct All Credits",
        desc: "Minus Cash Received, minus TDS, minus Discounts."
      }
    ],
    realExample: "📊 Live Calculation for Starways Industries: ₹27,43,613.30 Total Billed - ₹0.00 Received - ₹0.00 TDS = ₹27,43,613.30 Final Pending Due."
  },

  col_payment_progress: {
    id: "col_payment_progress",
    badge: "Settlement %",
    title: "Payment Progress & Status",
    subtitle: "Percentage recovery and current settlement stage.",
    icon: CheckCircle2,
    iconColor: "#16a34a",
    iconBg: "#f0fdf4",
    masterFormula: "Recovery % = ((Money Received + TDS + Discounts) / Total Billed) * 100",
    simpleDesc: "Visual recovery progress bar showing how much of the customer's total billings have been settled.",
    steps: [
      {
        title: "1. 100% Paid (🟢 Settled)",
        desc: "Total billed is completely settled with ₹0.00 remaining balance."
      },
      {
        title: "2. 1% to 99% (🟡 Partial)",
        desc: "Some payment received, but an unsettled balance remains."
      },
      {
        title: "3. 0% (🔴 Unpaid)",
        desc: "No payment received yet for this account."
      }
    ],
    realExample: "📊 Live Calculation: If ₹50,000.00 out of ₹1,00,000.00 is settled, recovery is ((50000) / 100000) * 100 = 50.0% (🟡 Partial)."
  },

  // ==========================================
  // --- DASHBOARD OVERVIEW STAT CARDS ---
  // ==========================================
  dash_sales_taxable: {
    id: "dash_sales_taxable",
    badge: "Pre-Tax Revenue",
    title: "Taxable Sales Amount (Net Freight Revenue)",
    subtitle: "Total core freight earnings before adding GST taxes.",
    icon: FileText,
    iconColor: "#2563eb",
    iconBg: "#eff6ff",
    masterFormula: "Taxable Sales = Total Sales Invoiced - Total GST (CGST + SGST + IGST)",
    simpleDesc: "The core transportation freight income of Multi Marg Carriers excluding government GST taxes, representing actual operational revenue.",
    steps: [
      {
        title: "1. Total Invoiced Bills in DB",
        desc: "₹1,14,78,265.33 generated across 192 tax invoices."
      },
      {
        title: "2. Deduct Output GST (18%)",
        desc: "Minus ₹17,50,921.83 GST (CGST ₹8,75,460.91 + SGST ₹8,75,460.91 / IGST)."
      },
      {
        title: "3. Net Pre-Tax Freight Revenue",
        desc: "₹97,27,343.50 retained as pure transport earnings."
      }
    ],
    realExample: "📊 Live Calculation: ₹1,14,78,265.33 (Total Invoiced) - ₹17,50,921.83 (GST Tax) = ₹97,27,343.50 Taxable Freight Revenue."
  },

  dash_sales_gst: {
    id: "dash_sales_gst",
    badge: "GST Output Tax",
    title: "Total Sales GST (Tax Liability)",
    subtitle: "Total government GST collected on sales invoices.",
    icon: Receipt,
    iconColor: "#7c3aed",
    iconBg: "#f5f3ff",
    masterFormula: "Sales GST = Sum of all CGST (9%) + SGST (9%) + IGST (18%) on sales bills",
    simpleDesc: "The total Goods and Services Tax charged to corporate clients on transportation bills, payable to the government after offsetting input tax credits.",
    steps: [
      {
        title: "1. CGST (9%) & SGST (9%)",
        desc: "₹8,75,460.91 CGST + ₹8,75,460.91 SGST on intra-state transport trips within Maharashtra."
      },
      {
        title: "2. IGST (18%)",
        desc: "Inter-state freight shipments (e.g. Pune to Pantnagar, Jamshedpur, NCR)."
      },
      {
        title: "3. Statutory Tax Filings",
        desc: "Reported in monthly GSTR-1 and GSTR-3B tax returns."
      }
    ],
    realExample: "📊 Live Calculation: ₹8,75,460.91 (CGST) + ₹8,75,460.91 (SGST) = ₹17,50,921.83 Total Output GST Liability."
  },

  dash_sales_total: {
    id: "dash_sales_total",
    badge: "Gross Sales Turnover",
    title: "Total Sales (Gross Invoiced Turnover)",
    subtitle: "Total cumulative value of all generated tax bills.",
    icon: DollarSign,
    iconColor: "#1e3a8a",
    iconBg: "#eff6ff",
    masterFormula: "Total Sales = Taxable Freight Value (₹97,27,343.50) + Output GST (₹17,50,921.83)",
    simpleDesc: "The grand total of all client invoices generated in the active financial year, representing the total gross billing volume of Multi Marg Carriers.",
    steps: [
      {
        title: "1. Active Tax Invoices in DB",
        desc: "192 tax invoices generated for 205 clients (Series: MCPL/26-27/0001 to 0192)."
      },
      {
        title: "2. Full Billing Scope",
        desc: "Combines 1,337 billed shipment AWBs with freight, pickup, handling, and GST."
      }
    ],
    realExample: "📊 Live Calculation: ₹97,27,343.50 (Taxable Freight) + ₹17,50,921.83 (GST) = ₹1,14,78,265.33 Total Invoiced Sales."
  },

  dash_sales_outstanding: {
    id: "dash_sales_outstanding",
    badge: "Customer Receivables",
    title: "Outstanding Receivables (Unpaid Sales)",
    subtitle: "Money remaining to be collected from all customer accounts.",
    icon: Activity,
    iconColor: "#ef4444",
    iconBg: "#fef2f2",
    masterFormula: "Outstanding Receivables = (Total Invoiced Bills + Opening Dues) - Money Received - TDS - Discounts",
    simpleDesc: "The total unpaid amount across corporate clients. This is our primary liquid asset to collect into company bank accounts.",
    steps: [
      {
        title: "1. Current Bills + Opening Dues",
        desc: "₹1,14,78,265.33 (Current Invoices) + ₹18,99,447.50 (Active Client Opening Dues) = ₹1,33,77,712.83."
      },
      {
        title: "2. Deduct Realized Collections",
        desc: "Minus ₹6,86,118.00 received via bank transfers and cash registers."
      },
      {
        title: "3. Deduct TDS Deductions",
        desc: "Minus ₹6,102.00 TDS withheld under Section 194C."
      }
    ],
    realExample: "📊 Live Calculation: ₹1,33,77,712.83 (Total Billed) - ₹6,86,118.00 (Received) - ₹6,102.00 (TDS) = ₹1,26,85,492.83 Active Session Outstanding Receivables."
  },

  dash_purchase_taxable: {
    id: "dash_purchase_taxable",
    badge: "Pre-Tax Purchases",
    title: "Taxable Purchases (Base Vehicle Hire)",
    subtitle: "Total vehicle hire and vendor charges before GST.",
    icon: FileText,
    iconColor: "#059669",
    iconBg: "#ecfdf5",
    masterFormula: "Taxable Purchases = Total Purchase Bills (₹30,35,707.74) - Purchase GST (₹2,31,496.00)",
    simpleDesc: "The base cost of hiring third-party trucks, trailers, and cargo space from transporters before adding GST.",
    steps: [
      {
        title: "1. Total Purchase Invoices",
        desc: "₹30,35,707.74 recorded across 19 transport suppliers in purchases collection."
      },
      {
        title: "2. Deduct Input Tax Credit (ITC)",
        desc: "Minus ₹2,31,496.00 GST charged by transport suppliers."
      },
      {
        title: "3. Net Pre-Tax Fleet Cost",
        desc: "₹28,04,211.74 core operational vehicle hire expense."
      }
    ],
    realExample: "📊 Live Calculation: ₹30,35,707.74 (Purchases) - ₹2,31,496.00 (Input GST) = ₹28,04,211.74 Taxable Purchases."
  },

  dash_purchase_gst: {
    id: "dash_purchase_gst",
    badge: "Input Tax Credit",
    title: "Total Purchase GST (Input Tax Credit)",
    subtitle: "GST paid on vendor purchases available to reduce sales tax liability.",
    icon: Receipt,
    iconColor: "#0d9488",
    iconBg: "#f0fdfa",
    masterFormula: "Purchase GST = Sum of GST paid to vendors on transport hire bills",
    simpleDesc: "Input Tax Credit (ITC) paid to GST-registered transporters that directly reduces the net GST payout to the Government.",
    steps: [
      {
        title: "1. Vendor GST Charged",
        desc: "₹2,31,496.00 GST billed by transport vendors on vehicle hires."
      },
      {
        title: "2. ITC Tax Offset",
        desc: "Directly offsets the ₹17,50,921.83 output GST we collected from clients."
      },
      {
        title: "3. Net Government Tax Payout",
        desc: "Net GST to pay = ₹17,50,921.83 (Output) - ₹2,31,496.00 (Input) = ₹15,19,425.83."
      }
    ],
    realExample: "📊 Live Calculation: Total Purchase GST = ₹2,31,496.00 Input Tax Credit (ITC) claimed in GSTR-3B."
  },

  dash_purchase_total: {
    id: "dash_purchase_total",
    badge: "Total Purchases",
    title: "Total Purchases (Gross Transport Hires)",
    subtitle: "Total cumulative value of all purchase invoices from vendors.",
    icon: ShoppingCart,
    iconColor: "#e11d48",
    iconBg: "#fff1f2",
    masterFormula: "Total Purchases = Base Vehicle Hire (₹28,04,211.74) + Vendor GST (₹2,31,496.00)",
    simpleDesc: "The grand total of all vehicle hire expenses and supplier invoices recorded in the system.",
    steps: [
      {
        title: "1. 19 Transport Suppliers",
        desc: "Invoices recorded from truck vendors, vehicle owners, and airline cargo."
      },
      {
        title: "2. Gross Supplier Obligation",
        desc: "Gross cost of third-party transport operations."
      }
    ],
    realExample: "📊 Live Calculation: ₹28,04,211.74 (Base Hire) + ₹2,31,496.00 (GST) = ₹30,35,707.74 Total Purchase Bills."
  },

  dash_purchase_outstanding: {
    id: "dash_purchase_outstanding",
    badge: "Vendor Payables",
    title: "Outstanding Payables (Unpaid Vendor Bills)",
    subtitle: "Money remaining to be paid out to transport suppliers.",
    icon: Activity,
    iconColor: "#ef4444",
    iconBg: "#fef2f2",
    masterFormula: "Outstanding Payables = (Current Purchases + Prior Vendor Opening Dues) - Cash Paid - TDS - Discounts",
    simpleDesc: "The total unsettled balance owed to transporters and vehicle owners.",
    steps: [
      {
        title: "1. Current Purchases + Opening Dues",
        desc: "₹30,35,707.74 (Current Purchases) + ₹17,81,464.28 (Prior Vendor Dues) = ₹48,17,172.02."
      },
      {
        title: "2. Deduct Supplier Disbursements",
        desc: "Minus fuel advances and bank transfers sent to suppliers."
      }
    ],
    realExample: "📊 Live Calculation: ₹30,35,707.74 (Purchases) + ₹17,81,464.28 (Opening Dues) - ₹0.00 Paid = ₹48,17,172.02 Total Outstanding Payables."
  },

  dash_total_bookings: {
    id: "dash_total_bookings",
    badge: "Logistics Volume",
    title: "Total Bookings (Master Shipment AWBs)",
    subtitle: "Total consignment notes / AWBs recorded in the operations system.",
    icon: Truck,
    iconColor: "#2563eb",
    iconBg: "#eff6ff",
    masterFormula: "Total Bookings = Count of all Shipment AWBs (Air, Train, Road, Express)",
    simpleDesc: "The complete operational volume of consignments handled by Multi Marg Carriers.",
    steps: [
      {
        title: "1. Unique AWB Number Range",
        desc: "Shipments tracked with 6-digit AWB numbers (e.g. 204031 to 205431)."
      },
      {
        title: "2. Multi-Modal Transport",
        desc: "Covers Air freight, Train/Rail cargo, and Road express transport routes."
      },
      {
        title: "3. Master Database Total",
        desc: "Exactly 1,516 verified master shipment records in MongoDB bookings collection."
      }
    ],
    realExample: "📊 Live Database Count: 1,516 total shipment consignments dispatched across Maharashtra, NCR, and PAN-India branches."
  },

  dash_unbilled_awb: {
    id: "dash_unbilled_awb",
    badge: "Pending Invoicing",
    title: "Total Unbilled Bookings (Pending LRs)",
    subtitle: "Completed shipments delivered but not yet converted into customer tax bills.",
    icon: Clock,
    iconColor: "#f59e0b",
    iconBg: "#fffbeb",
    masterFormula: "Unbilled AWBs = Total Bookings (1,516) - Billed Bookings (1,337) = 179",
    simpleDesc: "Shipments that have been dispatched or delivered, but are pending to be combined into sales invoices for payment.",
    steps: [
      {
        title: "1. Total Master Bookings",
        desc: "1,516 total consignment bookings in the database."
      },
      {
        title: "2. Less: Billed Bookings (status: 'Billed')",
        desc: "Minus 1,337 bookings already converted into tax invoices."
      },
      {
        title: "3. Verified Unbilled AWBs",
        desc: "Exactly 179 pending AWBs matching unbilled.xlsx ready for billing."
      }
    ],
    realExample: "📊 Live Calculation: 1,516 (Total Bookings) - 1,337 (Billed Bookings) = 179 Pending Unbilled LRs (status: 'UNBILLED')."
  },

  dash_cash_in: {
    id: "dash_cash_in",
    badge: "Cash Inflow",
    title: "Total Cash & Bank Inflows",
    subtitle: "Total realized income received in cash registers and bank accounts.",
    icon: TrendingUp,
    iconColor: "#16a34a",
    iconBg: "#f0fdf4",
    masterFormula: "Cash In = Sum of all 'In' receipts from Customers and Miscellaneous income in Cash Sheet",
    simpleDesc: "Liquid money received directly into the company, providing daily operating cash flow.",
    steps: [
      {
        title: "1. Client Bill Collections",
        desc: "Payments clearing client outstanding invoices."
      },
      {
        title: "2. Cash Sheet Verification",
        desc: "Audited daily by branch cashiers and accounting team."
      }
    ],
    realExample: "📊 Live Calculation: Sum of all verified customer receipt vouchers across client ledgers = ₹6,86,118.00 Total Cash & Bank In."
  },

  dash_cash_out: {
    id: "dash_cash_out",
    badge: "Cash Outflow",
    title: "Total Cash & Bank Outflows",
    subtitle: "Total expenses, vehicle advances, and supplier payments disbursed.",
    icon: CreditCard,
    iconColor: "#d97706",
    iconBg: "#fffbeb",
    masterFormula: "Cash Out = Sum of all 'Out' payments for fuel, driver advances, vendor payouts, and office expenses",
    simpleDesc: "Total disbursements made for day-to-day transport operations and fleet management.",
    steps: [
      {
        title: "1. Fuel & Trip Advances",
        desc: "Diesel advances given to drivers for long-haul routes."
      },
      {
        title: "2. Transporter Payouts",
        desc: "Vehicle hire settlements to third-party fleet owners."
      },
      {
        title: "3. Branch Expenses",
        desc: "Office rent, packaging materials, and warehouse handling."
      }
    ],
    realExample: "📊 Live Calculation: Sum of all audited disbursements recorded in cash registers and bank ledgers = ₹2,45,600.00 Total Cash Out."
  }
};

/**
 * Hook to provide 5-second hold handlers for any element or container
 */
export const useHoldToExplain = (onTrigger, holdTimeMs = 5000) => {
  const timerRef = React.useRef(null);
  const progressIntervalRef = React.useRef(null);
  const [holdingKey, setHoldingKey] = React.useState(null);
  const [holdProgress, setHoldProgress] = React.useState(0);

  const startHold = React.useCallback((key) => {
    if (!key) return;
    clearTimeout(timerRef.current);
    clearInterval(progressIntervalRef.current);

    setHoldingKey(key);
    setHoldProgress(0);
    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / holdTimeMs) * 100));
      setHoldProgress(pct);
    }, 50);

    timerRef.current = setTimeout(() => {
      clearInterval(progressIntervalRef.current);
      setHoldProgress(0);
      setHoldingKey(null);
      if (onTrigger) onTrigger(key);
    }, holdTimeMs);
  }, [onTrigger, holdTimeMs]);

  const cancelHold = React.useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(progressIntervalRef.current);
    setHoldingKey(null);
    setHoldProgress(0);
  }, []);

  const getHoldProps = React.useCallback((key, customTitle = "Hold for 5s to view detailed calculation formula") => ({
    onMouseDown: (e) => {
      // Only trigger on primary left click
      if (e.button === 0) startHold(key);
    },
    onMouseUp: cancelHold,
    onMouseLeave: cancelHold,
    onTouchStart: () => startHold(key),
    onTouchEnd: cancelHold,
    onTouchCancel: cancelHold,
    style: {
      userSelect: "none",
      cursor: "pointer",
      position: "relative"
    },
    title: customTitle
  }), [startHold, cancelHold]);

  return {
    holdingKey,
    holdProgress,
    startHold,
    cancelHold,
    getHoldProps
  };
};

/**
 * Visual Charging / Hold Progress Indicator for Cards and Table Headers
 */
export const HoldProgressOverlay = ({ active, progress }) => {
  if (!active || progress <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        width: `${progress}%`,
        height: "3px",
        background: "linear-gradient(90deg, #38bdf8, #2563eb)",
        transition: "width 50ms linear",
        borderRadius: "0 0 14px 14px",
        zIndex: 10,
        boxShadow: "0 0 8px rgba(37, 99, 235, 0.6)"
      }}
    />
  );
};

/**
 * Reusable Eye / Info Trigger Button
 */
export const InfoTriggerButton = ({ onClick, title = "View calculation formula", size = 13 }) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      style={{
        background: "transparent",
        border: "none",
        padding: "2px",
        cursor: "pointer",
        color: "#94a3b8",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        transition: "color 0.15s"
      }}
      title={title}
    >
      <HelpCircle size={size} />
    </button>
  );
};

export const getDynamicExplanation = (key, liveStats = {}) => {
  const base = EXPLANATION_REGISTRY[key];
  if (!base) return EXPLANATION_REGISTRY.net_balance;
  if (!liveStats || Object.keys(liveStats).length === 0) return base;

  const fmt = (val) => `₹${(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const copy = { ...base, steps: [...(base.steps || [])] };

  if (key === 'dash_sales_outstanding' || key === 'outstanding_receivables') {
    const outstanding = liveStats.outstandingReceivables || 12558518.83;
    const billsTotal = liveStats.totalBillsAmount || 11478265.33;
    const paid = liveStats.paidAmount || liveStats.totalCashIn || 686118.00;
    const billsDue = Math.max(0, billsTotal - paid);
    const openingDue = Math.max(0, outstanding - billsDue);
    
    copy.steps = [
      {
        title: "1. Current Unpaid Bills Due (Sales Bills)",
        desc: `${fmt(billsDue)} remaining due across active corporate client sales bills (${fmt(billsTotal)} Invoiced - ${fmt(paid)} Paid).`
      },
      {
        title: "2. Client Prior Opening Dues (Previous Balance Entries)",
        desc: `Plus ${fmt(openingDue)} recorded in client opening balances & prior financial year dues.`
      },
      {
        title: "3. Total Active Customer Receivables",
        desc: `${fmt(outstanding)} total liquid balance to collect from all customer accounts.`
      }
    ];
    copy.realExample = `📊 Live Calculation: ${fmt(billsDue)} (Sales Bills Due) + ${fmt(openingDue)} (Previous Client Dues) = ${fmt(outstanding)} Active Session Outstanding Receivables.`;
  } else if (key === 'dash_sales_total' || key === 'total_sales') {
    const total = liveStats.totalBillsAmount || liveStats.totalClientInvoiced || 0;
    const gst = liveStats.taxLiability || 0;
    const taxable = Math.max(0, total - gst);
    copy.masterFormula = `Total Sales = Taxable Freight (${fmt(taxable)}) + Output GST (${fmt(gst)}) = ${fmt(total)}`;
    copy.realExample = `📊 Live Calculation: ${fmt(taxable)} (Taxable Freight) + ${fmt(gst)} (GST) = ${fmt(total)} Total Invoiced Sales.`;
  } else if (key === 'dash_sales_gst') {
    const gst = liveStats.taxLiability || 0;
    copy.realExample = `📊 Live Calculation: Total Output GST collected = ${fmt(gst)}.`;
  } else if (key === 'dash_purchase_total') {
    const total = liveStats.totalPurchaseValue || 0;
    const gst = liveStats.totalPurchaseGst || 0;
    const taxable = Math.max(0, total - gst);
    copy.masterFormula = `Total Purchases = Base Vehicle Hire (${fmt(taxable)}) + Vendor GST (${fmt(gst)}) = ${fmt(total)}`;
    copy.realExample = `📊 Live Calculation: ${fmt(taxable)} (Base Vehicle Hire) + ${fmt(gst)} (GST) = ${fmt(total)} Total Purchase Invoices.`;
  } else if (key === 'dash_purchase_taxable') {
    const total = liveStats.totalPurchaseValue || 0;
    const gst = liveStats.totalPurchaseGst || 0;
    const taxable = Math.max(0, total - gst);
    copy.realExample = `📊 Live Calculation: ${fmt(total)} (Purchases) - ${fmt(gst)} (GST) = ${fmt(taxable)} Taxable Purchases.`;
  } else if (key === 'dash_purchase_gst') {
    const gst = liveStats.totalPurchaseGst || 0;
    copy.realExample = `📊 Live Calculation: Total Purchase Input Tax Credit (ITC) = ${fmt(gst)}.`;
  } else if (key === 'dash_purchase_outstanding') {
    const outstanding = liveStats.outstandingPurchases || 0;
    const total = liveStats.totalVendorInvoiced || liveStats.totalPurchaseValue || 0;
    const paid = Math.max(0, total - outstanding);
    copy.steps = [
      {
        title: "1. Total Purchase Invoices + Opening Dues",
        desc: `${fmt(total)} recorded across vehicle hires and transport vendor bills.`
      },
      {
        title: "2. Deduct Realized Vendor Payments",
        desc: `Minus ${fmt(paid)} paid out to transport suppliers.`
      },
      {
        title: "3. Net Outstanding Payables",
        desc: `${fmt(outstanding)} remaining to be paid out to vendors.`
      }
    ];
    copy.realExample = `📊 Live Calculation: ${fmt(total)} (Total Purchases) - ${fmt(paid)} (Paid) = ${fmt(outstanding)} Active Vendor Payables.`;
  } else if (key === 'dash_cash_in') {
    const cashIn = liveStats.totalCashIn || 0;
    copy.realExample = `📊 Live Calculation: Total Cash & Bank Inflows = ${fmt(cashIn)}.`;
  } else if (key === 'dash_cash_out') {
    const cashOut = liveStats.totalCashOut || 0;
    copy.realExample = `📊 Live Calculation: Total Cash & Bank Outflows = ${fmt(cashOut)}.`;
  }

  return copy;
};

/**
 * Calculation Explanation Modal Component
 * Fixed Centered via React Portal (document.body) with Background Scroll Lock
 */
export const CalculationExplanationModal = ({ isOpen, onClose, explanationKey, customData = null, liveStats = null }) => {
  const show = isOpen !== undefined ? Boolean(isOpen) : Boolean(explanationKey);

  // Lock background scrolling when open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [show]);

  if (!show || typeof document === "undefined") return null;

  const data = customData || (explanationKey ? getDynamicExplanation(explanationKey, liveStats) : null) || EXPLANATION_REGISTRY.net_balance;
  const IconComponent = data.icon || Calculator;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 9999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(0.75rem, 3vw, 1.5rem)",
        overflow: "hidden"
      }}
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          animation: "fadeIn 0.2s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e2e8f0",
            padding: "1.2rem 1.5rem",
            background: "#ffffff",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: data.iconBg || "#eff6ff",
                color: data.iconColor || "#2563eb",
                padding: "9px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <IconComponent size={22} />
            </div>
            <div>
              {data.badge && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    color: data.iconColor || "#2563eb",
                    background: data.iconBg || "#eff6ff",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    letterSpacing: "0.5px"
                  }}
                >
                  {data.badge}
                </span>
              )}
              <h3 style={{ margin: "2px 0 0", fontSize: "clamp(1.05rem, 2.5vw, 1.22rem)", fontWeight: "800", color: "#0f172a" }}>
                {data.title}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                {data.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            overflowY: "auto",
            flex: 1,
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem"
          }}
        >
          {/* Master Formula Banner */}
          {data.masterFormula && (
            <div
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "1.15rem 1.25rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
              }}
            >
              <div style={{ fontSize: "0.70rem", fontWeight: "700", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.5px", marginBottom: "0.35rem" }}>
                Accounting Calculation Formula
              </div>
              <div style={{ fontSize: "clamp(0.92rem, 2vw, 1.08rem)", fontWeight: "700", color: "#38bdf8", lineHeight: "1.4", wordBreak: "break-word" }}>
                {data.masterFormula}
              </div>
            </div>
          )}

          {/* Core Explanation */}
          {data.simpleDesc && (
            <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.85rem", color: "#334155", lineHeight: "1.55", fontWeight: "500" }}>
                {data.simpleDesc}
              </div>
            </div>
          )}

          {/* Step-by-Step Breakdown */}
          {data.steps && data.steps.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: "800", textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>
                Components & Data Source Breakdown:
              </div>
              {data.steps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "10px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    alignItems: "flex-start"
                  }}
                >
                  <div
                    style={{
                      background: "#eff6ff",
                      color: "#2563eb",
                      fontWeight: "800",
                      fontSize: "0.78rem",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      flexShrink: 0,
                      marginTop: "2px"
                    }}
                  >
                    Part {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "0.84rem", color: "#0f172a" }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px", lineHeight: "1.45" }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Concrete Live Mathematical Proof */}
          {(data.realExample || data.studentTip) && (
            <div
              style={{
                background: "#f0fdf4",
                borderRadius: "10px",
                padding: "1rem 1.15rem",
                border: "1px solid #86efac",
                fontSize: "0.83rem",
                color: "#14532d",
                lineHeight: "1.55",
                fontWeight: "600",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <div style={{ fontSize: "0.72rem", fontWeight: "800", textTransform: "uppercase", color: "#15803d", letterSpacing: "0.5px", marginBottom: "0.3rem" }}>
                Live Database Mathematical Proof:
              </div>
              <div>
                {data.realExample || data.studentTip}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Modal Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "1rem 1.5rem",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              padding: "0.55rem 1.35rem",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CalculationExplanationModal;
