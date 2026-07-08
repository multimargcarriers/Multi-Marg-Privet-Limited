<?php
// Database connection
include('../config.php');
// Set headers to download as CSV
 header('Content-Type: text/csv; charset=utf-8');  
      header('Content-Disposition: attachment; filename=data.csv'); 
// Open output stream
$output = fopen('php://output', 'w');

// Output column headings
fputcsv($output, [
    'AWB No', 'Date', 'Consignor', 'Consignee', 'Origin', 'Destination',
    'Mode', 'Invoice(s)', 'Invoice Date(s)', 'Part Number(s)',
    'Box', 'Quantity', 'Chargeable Weight', 'Status'
]);

// Fetch all trip records
$tripQuery = mysqli_query($con, "SELECT * FROM trip ORDER BY pid DESC");

while ($trip = mysqli_fetch_assoc($tripQuery)) {
    $awb = $trip['awb'];

    // Get related lr_details in one query
    $lrQuery = mysqli_query($con, "SELECT * FROM lr_details WHERE awb = '$awb'");
    
    $invoices = $inv_dates = $parts = $quantities = [];

    while ($lr = mysqli_fetch_assoc($lrQuery)) {
        $invoices[] = $lr['invoice'];
        $inv_dates[] = date("d-m-Y", strtotime($lr['invdate']));
        $parts[] = strtoupper($lr['part']);
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
        implode("\n", $parts),
        $trip['box'],
        implode("\n", $quantities),
        $trip['charge_wt'],
        $trip['type_of_delivery']
    ];

    // Write to CSV
    fputcsv($output, $row);
}

fclose($output);
exit;
?>