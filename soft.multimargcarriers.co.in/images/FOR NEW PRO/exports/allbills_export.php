<?php
// Database connection
include('../config.php');
// Set headers to download as CSV
 header('Content-Type: text/csv; charset=utf-8');  
      header('Content-Disposition: attachment; filename=all bills_report.csv'); 
// Open output stream
$output = fopen('php://output', 'w');

// Output column headings
fputcsv($output, [
    'Date', 'Invoice No', 'Client', 'Mode','Taxable Value',
     'Total Tax',
    'Grand Total'
]);

// Fetch all trip records
 

                                $fr=$_GET['from'];
                                $to=$_GET['to'];
                          
        
$fr = mysqli_real_escape_string($con, $fr);
$to = mysqli_real_escape_string($con, $to);

if (!empty($fr) && !empty($to)) {
        $retval = mysqli_query($con, "        SELECT * FROM bills 
        WHERE invoice_date BETWEEN '$fr' AND '$to' 
        GROUP BY invoice 
        ORDER BY invoice asc
    ") or die(mysqli_error($con));
} else {
    $retval = mysqli_query($con, "SELECT * FROM bills GROUP BY invoice 
        ORDER BY invoice asc
    ") or die(mysqli_error($con));
}
if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$st=0;$gt=0;$tt=0;$sac=0;
while($row1=mysqli_fetch_array($retval)) {

$client=$row1['client'];
    // Get related lr_details in one query
   $retval12 = mysqli_query($con, "SELECT gst FROM client WHERE client = '$client'") or die(mysqli_error($con));

if(! $retval12 ) {
   die('Could not get data: ' . mysql_error());
}
while($row12=mysqli_fetch_array($retval12)) {

                                             $gstabc=$row12['gst'];
}
 if($row1['mode']=="Air")
 {$sac=996531;
 }
  if($row1['mode']=="Train")
 {$sac=996512;
 }  
 if($row1['mode']=="Road" || $row1['mode']=="Local Tempo")
 { $sac=996511;
 }
 $consig=$row1['invoice'];
 $date1=$row1['invoice_date'];
 $date="2025-09-25";
 $gstin=$row1['gst'];
  $retval1 = mysqli_query($con, "SELECT * FROM bills WHERE invoice = '$consig'") or die(mysqli_error($con));

if(! $retval1 ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$sub_total=0;$gst1=0;$total=0;$sgst=0;$cgst=0;$igst=0;
while($row12=mysqli_fetch_array($retval1)) {

                                             $frieght=$row12['frieght'];
                                             $awb_charge=$row12['awb_charge'];
                                             $pickup=$row12['pickup'];
                                             $delivery=$row12['delivery'];
                                             $special_delivery=$row12['special_delivery'];
                                             $other_charge=$row12['other_charge'];
                                             $sub_total=$sub_total+$frieght+$awb_charge+$pickup+$delivery+$special_delivery+$other_charge;

                                             
                                             
                                           } $st=$sub_total;
                             $code= substr($gstabc, 0, 2);  
                             if($gstin=="YES")
                             {
                                 if($date1>$date)
                                 {
                                    if($code=="27")
  {$cgst=$sub_total*9/100;
  $sgst=$sub_total*9/100;}
  else{
    $igst=$sub_total*18/100;
  }  
                                 }
                                 else
                                 {
 if($row1['mode']=="Air" )
 {
  if($code=="27")
  {$cgst=$sub_total*9/100;
  $sgst=$sub_total*9/100;}
  else{
    $igst=$sub_total*18/100;
  }
   
 }
 else
 {
   if($code=="27")
  {$cgst=$sub_total*6/100;
  $sgst=$sub_total*6/100;}
  else{
    $igst=$sub_total*12/100;
  }
 }
                            } }
                             else
                             {
                                 $cgst=0;
                                 $sgst=0;
                                 $igst=0;
                             }
 $gst1=$igst+$cgst+$sgst;
 $total=$sub_total+$gst1;

    // Build the row
    $row = [
        
        date("d-m-Y", strtotime($row1['invoice_date'])),
        $row1['invoice'],
        strtoupper($row1['client']),
        strtoupper($row1['mode']),
     
        $st,
       
        $gst1,
        $total
           ];

    // Write to CSV
    fputcsv($output, $row);
}

fclose($output);
exit;
?>