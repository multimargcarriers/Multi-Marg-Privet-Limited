<?php
// Database connection
include('../config.php');
// Set headers to download as CSV
 header('Content-Type: text/csv; charset=utf-8');  
      header('Content-Disposition: attachment; filename=unbilled_report.csv'); 
// Open output stream
$output = fopen('php://output', 'w');

// Output column headings
fputcsv($output, [
    'AWB No', 'Date', 'Consignor', 'Consignee', 'Origin', 'Destination',
    'Mode', 
    'Box',  'Chargeable Weight',  'Billed To',  'Remarks'
]);
 $fr=$_GET['from'];
                                $to=$_GET['to'];
                          $client=$_GET['client'];
        
$fr = mysqli_real_escape_string($con, $fr);
$to = mysqli_real_escape_string($con, $to);
$client = mysqli_real_escape_string($con, $client);
if (!empty($fr) && !empty($to) && !empty($client)) {
    $tripQuery = mysqli_query($con, "SELECT * FROM trip where client='$client' and date between '$fr' AND '$to' and status=0 ORDER BY awb DESC");
}
elseif (!empty($fr) && !empty($to) && empty($client)) {
    $tripQuery = mysqli_query($con, "SELECT * FROM trip where date between '$fr' AND '$to' and status=0 ORDER BY pid DESC");
}
elseif (empty($fr) && empty($to) && !empty($client)) {
    $tripQuery = mysqli_query($con, "SELECT * FROM trip where client='$client' and status=0 ORDER BY pid DESC");
}
// Fetch all trip records
else
{
$tripQuery = mysqli_query($con, "SELECT * FROM trip where status=0 ORDER BY pid DESC");
}


while ($trip = mysqli_fetch_assoc($tripQuery)) {
    $awb = $trip['awb'];

   

    // Build the row
    $row = [
        $awb,
        date("d-m-Y", strtotime($trip['date'])),
        $trip['consignor'],
        $trip['consignee'],
        strtoupper($trip['origin']),
        strtoupper($trip['destination']),
        strtoupper($trip['mode']),
        $trip['box'],
        $trip['charge_wt'],
         $trip['client'],
          $trip['remarks'],
         ];

    // Write to CSV
    fputcsv($output, $row);
}

fclose($output);
exit;
?>