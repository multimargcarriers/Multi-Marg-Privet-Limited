<?php
// Database connection
include('../config.php');
// Set headers to download as CSV
 header('Content-Type: text/csv; charset=utf-8');  
      header('Content-Disposition: attachment; filename=MIS Data.csv'); 
// Open output stream
$output = fopen('php://output', 'w');

// Output column headings
fputcsv($output, [
    'AWB No', 'Date', 'Consignor', 'Consignee', 'Origin', 'Destination',
    'Mode', 'Invoice(s)', 'Invoice Date(s)','Invoice Value(s)', 'Part Number(s)','Eway Bill(s)',
    'Box', 'Quantity', 'Chargeable Weight', 'Status'
]);

// Fetch all trip records
$tripQuery = mysqli_query($con, "SELECT * FROM trip ORDER BY pid DESC");

while ($trip = mysqli_fetch_assoc($tripQuery)) {
    $awb = $trip['awb'];
    $trackQuery = mysqli_query(
        $con,
        "SELECT status 
         FROM track 
         WHERE awb = '$awb' 
         ORDER BY pid DESC 
         LIMIT 1"
    );
$status="";
    if ($track = mysqli_fetch_assoc($trackQuery)) {
        $status = $track['status'];
    }
    // Get related lr_details in one query
    $lrQuery = mysqli_query($con, "SELECT * FROM lr_details WHERE awb = '$awb'");
    
    $invoices = $inv_dates = $parts = $values =  $eway = $quantities = [];

    while ($lr = mysqli_fetch_assoc($lrQuery)) {
        $invoices[] = $lr['invoice'];
                $values[] = $lr['value'];
        $inv_dates[] = date("d-m-Y", strtotime($lr['invdate']));
        $parts[] = strtoupper($lr['part']);
        $eway[] = strtoupper($lr['eway']);
        $quantities[] = $lr['quantity'];
       
    }

    // Build the row
    $row = [
        $awb,
        date("d-m-Y", strtotime($trip['date'])),
        $trip['consignor'],
        $trip['consignee'],
        strtoupper($trip['origin']),
        strtoupper($trip['destination']),
        strtoupper($trip['mode']),
        implode("\n", $invoices),
        implode("\n", $inv_dates),
         implode("\n", $values),
        implode("\n", $parts),
        implode("\n", $eway),
        $trip['box'],
        implode("\n", $quantities),
        $trip['charge_wt'],
        $status
    ];

    // Write to CSV
    fputcsv($output, $row);
}

fclose($output);
exit;
?>