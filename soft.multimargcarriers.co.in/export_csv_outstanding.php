<?php
include('config.php');

$client = mysqli_real_escape_string($con, $_GET['client']);

// Headers
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="Client_'.$client.'_Full_Report.csv"');

$output = fopen('php://output', 'w');

// ================= HEADER =================
fputcsv($output, ["Client Outstanding Report"]);
fputcsv($output, ["Client:", $client]);
fputcsv($output, []);

// ================= GET GSTIN =================
$gstin_no = '';
$gstRes = mysqli_query($con, "SELECT gst FROM client WHERE client='$client' LIMIT 1");
if ($g = mysqli_fetch_assoc($gstRes)) {
    $gstin_no = $g['gst'];
}
$state_code = substr($gstin_no, 0, 2);
$client_upper = strtoupper($client);

// ================= INVOICES =================
fputcsv($output, ["INVOICES"]);
fputcsv($output, ["Bill No", "Date", "Sub Total", "GST", "Grand Total"]);

$st = $gt = $tt = 0;

$query = mysqli_query($con, "
    SELECT * FROM bills 
    WHERE client='$client' 
    GROUP BY invoice 
    ORDER BY invoice DESC
");

while ($row = mysqli_fetch_assoc($query)) {

    $invoice = $row['invoice'];
    $date1 = $row['invoice_date'];
    $mode = strtoupper($row['mode']);
    $gstin = $row['gst'];

    // SUBTOTAL
    $sub = 0;
    $res = mysqli_query($con, "SELECT * FROM bills WHERE invoice='$invoice'");
    while ($r = mysqli_fetch_assoc($res)) {
        $sub += $r['frieght'] + $r['awb_charge'] + $r['pickup'] +
                $r['delivery'] + $r['special_delivery'] + $r['other_charge'];
    }

    // ================= GST LOGIC =================
    $cgst = $sgst = $igst = 0;
    $gst = 0;
    $date = "2025-09-20";

    if ($gstin == "YES") {

        // BELRISE
        if (stripos($client_upper, 'BELRISE') !== false) {
            $cgst = $sub * 0.09;
            $sgst = $sub * 0.09;
        }

        // CJ DARCL
        elseif ($client_upper === 'CJ DARCL LOGISTICS LIMITED') {
            if ($state_code == '05') {
                $cgst = $sub * 0.09;
                $sgst = $sub * 0.09;
            } else {
                $igst = $sub * 0.18;
            }
        }

        // NORMAL CLIENTS
        else {

            if ($date1 > $date) {
                // AFTER RATE CHANGE
                if ($state_code === '05') {
                    $cgst = $sub * 0.09;
                    $sgst = $sub * 0.09;
                } else {
                    $igst = $sub * 0.18;
                }
            } else {
                // BEFORE RATE CHANGE
                if ($state_code === '05') {
                    if ($mode === 'AIR') {
                        $cgst = $sub * 0.09;
                        $sgst = $sub * 0.09;
                    } else {
                        $cgst = $sub * 0.06;
                        $sgst = $sub * 0.06;
                    }
                } else {
                    if ($mode === 'AIR') {
                        $igst = $sub * 0.18;
                    } else {
                        $igst = $sub * 0.12;
                    }
                }
            }
        }

        $gst = $cgst + $sgst + $igst;
    }

    $total = $sub + $gst;

    $st += $sub;
    $gt += $gst;
    $tt += $total;

    fputcsv($output, [
        $invoice,
        date("d-m-Y", strtotime($date1)),
        number_format($sub,2),
        number_format($gst,2),
        number_format($total,2)
    ]);
}

// TOTAL
fputcsv($output, ["TOTAL", "", $st, $gt, $tt]);
fputcsv($output, []);

// ================= PAYMENTS =================
fputcsv($output, ["PAYMENTS"]);
fputcsv($output, ["Date", "Particular", "Bank", "Amount"]);

$total_received = 0;

$res = mysqli_query($con, "
    SELECT * FROM outstanding 
    WHERE client='$client' 
    ORDER BY date ASC
");

while ($row = mysqli_fetch_assoc($res)) {
    $total_received += $row['amount'];

    fputcsv($output, [
        date("d-m-Y", strtotime($row['date'])),
        $row['particulars'],
        $row['bankname'],
        $row['amount']
    ]);
}

fputcsv($output, ["TOTAL", "", "", $total_received]);
fputcsv($output, []);

// ================= SUMMARY =================
fputcsv($output, ["SUMMARY"]);

$outstanding = $tt - $total_received;

fputcsv($output, ["Total Bill Amount", $tt]);
fputcsv($output, ["Total Received", $total_received]);
fputcsv($output, ["Outstanding", $outstanding]);

fclose($output);
exit;
?>