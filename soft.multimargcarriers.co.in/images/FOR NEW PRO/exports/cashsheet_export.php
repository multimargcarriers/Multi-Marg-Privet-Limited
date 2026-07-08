<?php
// Database connection
include('../config.php');
// Set headers to download as CSV
 header('Content-Type: text/csv; charset=utf-8');  
      header('Content-Disposition: attachment; filename=cashsheet_report.csv'); 
// Open output stream
$output = fopen('php://output', 'w');

// Output column headings
fputcsv($output, [
    'Date', 'Particulars', 'Cash In', 'Cash Out', 'Balance'
]);

// Fetch all trip records
 

                                $fr=$_GET['from'];
                                $to=$_GET['to'];
                          
        
$fr = mysqli_real_escape_string($con, $fr);
$to = mysqli_real_escape_string($con, $to);

if (!empty($fr) && !empty($to)) {
        $retval = mysqli_query($con, "        SELECT * FROM cash 
        WHERE date BETWEEN '$fr' AND '$to' 
        ORDER BY date asc
    ") or die(mysqli_error($con));
} else {
    $retval = mysqli_query($con, "SELECT * FROM cash  
        ORDER BY date asc
    ") or die(mysqli_error($con));
}
if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$st=0;$gt=0;$tt=0;$sac=0;
while($row1=mysqli_fetch_array($retval)) {

$date=$row1['date'];
$particulars=$row1['remarks'];
$amount=$row1['amount'];
$inout=$row1['in_out'];
  if($inout=="IN")
  {
      $st+=$amount;
      $tt=$amount;
  }
  else
  {
      $st-=$amount;
       $gt=$amount;
  }
    // Build the row
    $row = [
        
        date("d-m-Y", strtotime($date)),
       
        strtoupper($particulars),
        
        $tt,
        $gt,
        $st,
       
           ];

    // Write to CSV
    fputcsv($output, $row);
    $gt=0;$tt=0;
}

fclose($output);
exit;
?>