<?php
include('config.php');
$client = $_GET['client'];
?>
<style>
     .left {
    flex: 1;
    background: #ffffff;
    border-radius: 12px;
    padding: 5px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .left h2 {
    margin-bottom: 15px;
    font-size: 20px;
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 8px;
  }

  .company-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .company {
    display: flex;
    justify-content: space-between;
    padding: 8px 10px;
    background-color: #f2f4f8;
    border-radius: 8px;
    font-size: 16px;
  }

  .amount {
    font-weight: bold;
    color: #007bff;
  }

  /* Right Section */
  .right {
    flex: 1;
    background: #ffffff;
    border-radius: 12px;
    padding: 5px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .right h3 {
    margin-bottom: 15px;
    font-size: 20px;
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  table th, table td {
    border-bottom: 1px solid #ddd;
    padding: 5px;
    text-align: left;
  }

  table th {
    background-color: #007bff;
    color: white;
  }

  table tr:hover {
    background-color: #f1f1f1;
  }
 
</style><div class="row">
<div class="left">
    <h2>Company Invoices</h2>
    

<!-- Company List -->
<div class="company-list">
<div class='company'>
    <table id="salesTable">
    <thead>
      <tr>
        <th>Bill No</th>
        <th>Bill Date</th>
        <th>Sub Total </th>
        <th>GST </th>
        <th>Grand Total </th>
      </tr>
    </thead>
    <tbody >  
    <?php
   $retval = mysqli_query($con, "SELECT * FROM bills WHERE client='$client' GROUP BY invoice HAVING COUNT(invoice)>=1 ORDER BY invoice DESC ") or die(mysqli_error($con));
    if(! $retval ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$st=0;$gt=0;$tt=0;
while($row=mysqli_fetch_array($retval)) {
    $consig=$row['invoice'];
       $date1=$row['invoice_date'];
         $gstin=$row['gst'];
   $date="2025-09-25";
  echo "<tr style='font-size:12px;'><td>".$row['invoice']."</td><td>".date("d-m-Y", strtotime($row['invoice_date']))."</td> " ; 
  $retval1 = mysqli_query($con, "SELECT * FROM bills WHERE invoice = '$consig'") or die(mysqli_error($con));
  if(! $retval1 ) {
   die('Could not get data: ' . mysql_error());
}
$a=1;$sub_total=0;$gst=0;$total=0;
while($row1=mysqli_fetch_array($retval1)) {

                                             $frieght=$row1['frieght'];
                                             $awb_charge=$row1['awb_charge'];
                                             $pickup=$row1['pickup'];
                                             $delivery=$row1['delivery'];
                                             $special_delivery=$row1['special_delivery'];
                                             $other_charge=$row1['other_charge'];
                                             $sub_total=$sub_total+$frieght+$awb_charge+$pickup+$delivery+$special_delivery+$other_charge;

                                             
                                             
                                           } echo "<td>".$sub_total."</td>" ;$st+=$sub_total;
                                           if($gstin=="YES")
                                           {
                                           if($date1>$date)
                                           {
                                               $gst=$sub_total*18/100;
    $gt+=$gst;
                                           }
                                           else
                                           {
 if($row['mode']=="Air")
 {
    $gst=$sub_total*18/100;
    $gt+=$gst;
 }
 else
 {
    $gst=$sub_total*12/100;
     $gt+=$gst;
 }
                                           }
                                           }
                                           else
                                           {
                                              $gst=0;
    $gt+=$gst; 
                                           }
 echo "<td>".$gst."</td>" ;
 $total=$sub_total+$gst;
 $tt+=$total;
 echo "<td>".$total."</td></tr>" ;
  
}
    ?>
    <tr class='total-row'>
        <td colspan="2"><strong>Total</strong></td>
        <td><strong>₹<?php echo number_format($st, 2); ?></strong></td>
        <td><strong>₹<?php echo number_format($gt, 2); ?></strong></td>
        <td><strong>₹<?php echo number_format($tt, 2); ?></strong></td>
      </tr>
    </tbody>
    
    </table>
    </div>

</div>

</div>
<?php

// Get distinct financial years dynamically


// Fetch all bills in the financial year
$sql = "
    SELECT 
        invoice_date,
        mode,
        gst,
        (frieght + awb_charge + pickup + delivery + special_delivery + other_charge) AS sub_total
    FROM bills
    WHERE client='$client'
";
$result = mysqli_query($con, $sql) or die(mysqli_error($con));

// Prepare month totals


$today = date('Y-m-d');
$gsti=0;$amount=0;
// Loop through all bills to calculate GST month-wise
while ($row = mysqli_fetch_assoc($result)) {
    $monthNum = date('n', strtotime($row['invoice_date']));
    $sub_total = $row['sub_total'];
    $gstin = $row['gst'];
    $mode = $row['mode'];
    $date1 = $row['invoice_date'];
    $date  = "2025-09-25";
    
    $gst = 0;
    if ($gstin == "YES") {
        if ($date1 > $date) {
            $gst = $sub_total * 18 / 100;
        } else {
            if ($mode == "Air") {
                $gst = $sub_total * 18 / 100;
            } else {
                $gst = $sub_total * 12 / 100;
            }
        }
    } else {
        $gst = 0;
    }

    $amount += $sub_total;
    $gsti += $gst;
}

?>
&nbsp;
  <!-- Right: Month-on-Month Sales -->
  <div class="right">
  <h3>Outstanding Amount </h3>
<?php $sql1 = "
    SELECT 
        SUM(amount) AS amt
    FROM outstanding
    WHERE client='$client'
";
$result1 = mysqli_query($con, $sql1) or die(mysqli_error($con));
while ($row1 = mysqli_fetch_assoc($result1)) {
    $amt = $row1['amt'];
}
?>

  <!-- Financial Year Dropdown -->
   <table id="salesTable">
    
      <tr>
        <th>Total Bill Amount</th>
        <th><?php $gtotal=round(($amount+$gsti),2); echo $gtotal;?> </th>
      </tr>
       <tr>
        <th>Total Amount Received</th>
        <th><?php $gtotal1=round(($amt),2); Echo $gtotal1;?> </th>
      </tr>
       <tr>
        <th>Total Outstanding</th>
        <th><?php $gtotal2=round(($gtotal-$gtotal1),2); Echo $gtotal2;?> </th>
      </tr>
   
  </table>
  <br>
  <h3>Payment Amount </h3>
  <table id="salesTable">
    <thead>
      <tr>
        <th>Date</th>
        <th>Particular</th>
        <th>Amount </th>
        </tr>
    </thead>
    <tbody>  
  <?php  $sql1 = "SELECT * FROM outstanding WHERE client='$client' ";
$result1 = mysqli_query($con, $sql1) or die(mysqli_error($con));
$ht=0;
while ($row1 = mysqli_fetch_assoc($result1)) {
    $amt = $row1['amount'];
    $ht+=$amt;
    echo "<tr style='font-size:12px;'><td>".date("d-m-Y", strtotime($row1['date']))."</td><td>NEFT</td><td>".$amt."</td></tr>" ; 
}
?>
<tr><td colspan='2'><b>TOTAL</b></td><td><b><?php echo $ht;?></b></td></tr>
</tbody>
</table>


</div>
</div>
