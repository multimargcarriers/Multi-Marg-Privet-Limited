<?php
include('../config.php');

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=all_bills_report.csv');

$output = fopen('php://output', 'w');

fputcsv($output, [
    'Date', 'Invoice No', 'Client', 'Mode',
    'Taxable Value', 'Total Tax', 'Grand Total'
]);

$fr = mysqli_real_escape_string($con, $_GET['from'] ?? '');
$to = mysqli_real_escape_string($con, $_GET['to'] ?? '');

$where = (!empty($fr) && !empty($to))
    ? "WHERE invoice_date BETWEEN '$fr' AND '$to'"
    : "";

$sql = "
SELECT invoice, client, mode, invoice_date, gst,
SUM(frieght + awb_charge + pickup + delivery + special_delivery + other_charge) AS sub_total
FROM bills
$where
GROUP BY invoice
ORDER BY invoice ASC
";

$result = mysqli_query($con, $sql) or die(mysqli_error($con));

$cutoffDate = "2025-09-20";

while ($row = mysqli_fetch_assoc($result)) {

    $client = $row['client'];
    $mode   = strtoupper($row['mode']);
    $date1  = $row['invoice_date'];
    $gstin  = $row['gst'];
    $sub_total = $row['sub_total'];

    // Client GST code
    $res = mysqli_query($con, "SELECT gst FROM client WHERE client='$client'");
    $gstRow = mysqli_fetch_assoc($res);
    $stateCode = substr($gstRow['gst'], 0, 2);

    $cgst = $sgst = $igst = 0;

    if ($gstin === "YES") {

        if ($date1 > $cutoffDate) {
            // New rule → 18%
            if ($stateCode === "05") {
                $cgst = $sub_total * 0.09;
                $sgst = $sub_total * 0.09;
            } else {
                $igst = $sub_total * 0.18;
            }
        } else {
            // Old rule
            if (
                $client === 'CJ DARCL LOGISTICS LIMITED' ||
                stripos($client, 'BELRISE') !== false
            ) {
                if ($stateCode === "05") {
                    $cgst = $sub_total * 0.09;
                    $sgst = $sub_total * 0.09;
                } else {
                    $igst = $sub_total * 0.18;
                }
            } else {
                if ($mode === "AIR") {
                    $rate = 0.18;
                } else {
                    $rate = 0.12;
                }

                if ($stateCode === "05") {
                    $cgst = $sub_total * ($rate / 2);
                    $sgst = $sub_total * ($rate / 2);
                } else {
                    $igst = $sub_total * $rate;
                }
            }
        }
    }

    $gstTotal = $cgst + $sgst + $igst;
    $grandTotal = $sub_total + $gstTotal;

    fputcsv($output, [
        date("d-m-Y", strtotime($row['invoice_date'])),
        $row['invoice'],
        strtoupper($client),
        $mode,
        round($sub_total, 2),
        round($gstTotal, 2),
        round($grandTotal, 2)
    ]);
}

fclose($output);
exit;
?>
