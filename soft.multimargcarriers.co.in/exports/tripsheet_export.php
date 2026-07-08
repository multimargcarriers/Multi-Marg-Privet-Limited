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
    'Trip No', 'Date', 'Vehicle Type', 'Vehicle No', 'Driver Name','Vendor','Origin', 'Destination',
    'Material Details', 'Total Amount'
]);
$limit = 10;
$page = isset($_GET['page']) && $_GET['page'] > 0 ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;
// Fetch all trip records
$sql = "
SELECT 
    t.pid, 
    t.trip, 
    t.date, 
    t.vtype, 
    t.vno,
    t.origin, 
    t.destination, 
    t.driver,
t.vendor,
   GROUP_CONCAT(CONCAT(ld.lr, '-', UPPER(ld.client)) SEPARATOR '\n') AS lr,
   
    SUM(ld.amount) AS amount

FROM tripsheet t
LEFT JOIN material_details ld ON ld.trip = t.trip
GROUP BY t.trip
ORDER BY t.trip DESC

";

$result = mysqli_query($con, $sql) or die(mysqli_error($con));

while ($row = mysqli_fetch_assoc($result))  {
   

    // Build the row
    $row1 = [
        $row['trip'],
       date("d-m-Y", strtotime($row['date'])),
       strtoupper( $row['vtype']),
        strtoupper( $row['vno']),
        strtoupper($row['driver']),
        strtoupper($row['vendor']),
        strtoupper($row['origin']),
         strtoupper($row['destination']),
       $row['lr'],
       $row['amount']
    ];

    // Write to CSV
    fputcsv($output, $row1);
}

fclose($output);
exit;
?>