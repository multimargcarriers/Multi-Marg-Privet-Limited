<?php 
// Database connection
include('../config.php');

// Set headers to download as CSV
header('Content-Type: text/csv; charset=utf-8');  
header('Content-Disposition: attachment; filename=gst_report.csv'); 

// Open output stream
$output = fopen('php://output', 'w');

// Output column headings
fputcsv($output, [
    'Date', 'Invoice No', 'Client', 'GSTIN', 'SAC/HSN', 'Taxable Value',
    'IGST', 'CGST', 'SGST', 'Total Tax',
    'Grand Total'
]);

// Fetch filter dates
$fr = $_GET['from'] ?? '';
$to = $_GET['to'] ?? '';

$where = "";
if (!empty($fr) && !empty($to)) {
    $fr_esc = mysqli_real_escape_string($con, $fr);
    $to_esc = mysqli_real_escape_string($con, $to);
    $where = "WHERE b.invoice_date BETWEEN '$fr_esc' AND '$to_esc'";
}

// Query
$sql = "
SELECT 
    b.invoice,
    b.invoice_date,
    b.client,
  b.mode,
    b.gst AS gst_applicable,
    c.gst AS client_gst,
    SUM(
        IFNULL(b.frieght,0) +
        IFNULL(b.awb_charge,0) +
        IFNULL(b.pickup,0) +
        IFNULL(b.delivery,0) +
        IFNULL(b.special_delivery,0) +
        IFNULL(b.other_charge,0)
    ) AS sub_total
FROM bills b
LEFT JOIN client c ON c.client = b.client
$where
GROUP BY b.invoice, b.invoice_date, b.client, b.mode, b.gst, c.gst
ORDER BY b.invoice ASC
";

$result = mysqli_query($con, $sql) or die(mysqli_error($con));

$gst_change_date = "2025-09-20";

while ($row = mysqli_fetch_assoc($result)) {

    // SAC Code
    if ($row['mode'] == 'AIR') {
        $sac = 996531;
    } elseif ($row['mode'] == 'TRAIN') {
        $sac = 996512;
    } else {
        $sac = 996511;
    }

    $sub_total = $row['sub_total'];
    $igst = $cgst = $sgst = 0;

    if ($row['gst_applicable'] == 'YES') {
        $client_upper = strtoupper($row['client']);
        $state_code = substr($row['client_gst'], 0, 2);

        // Special client rules
        if ($client_upper === 'CJ DARCL LOGISTICS LIMITED') {
            $igst = $sub_total * 0.18;
        } elseif (stripos($client_upper, 'BELRISE') !== false) {
            $cgst = $sub_total * 0.09;
            $sgst = $sub_total * 0.09;
        } 
        // Normal GST logic
        else {
            if ($row['invoice_date'] > $gst_change_date) {
                if ($state_code == "05") {
                    $cgst = $sub_total * 0.09;
                    $sgst = $sub_total * 0.09;
                } else {
                    $igst = $sub_total * 0.18;
                }
            } else {
                if ($row['mode'] == 'AIR') {
                    if ($state_code == "05") {
                        $cgst = $sub_total * 0.09;
                        $sgst = $sub_total * 0.09;
                    } else {
                        $igst = $sub_total * 0.18;
                    }
                } else {
                    if ($state_code == "05") {
                        $cgst = $sub_total * 0.06;
                        $sgst = $sub_total * 0.06;
                    } else {
                        $igst = $sub_total * 0.12;
                    }
                }
            }
        }
    }

    $gst_total = $igst + $cgst + $sgst;
    $grand_total = $sub_total + $gst_total;

    fputcsv($output, [
        date("d-m-Y", strtotime($row['invoice_date'])),
        $row['invoice'],
        strtoupper($row['client']),
        strtoupper($row['client_gst']),
        
        $sac,
        round($sub_total,2),
        round($igst,2),
        round($cgst,2),
        round($sgst,2),
        round($gst_total,2),
        round($grand_total,2)
    ]);
}

fclose($output);
exit;
?>
