<?php
include('config.php');
$client = $_GET['client'];
?>
<h2>COMPANY OUTSTANDING LEDGER : <?php echo $client;?></h2>
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
    <th>Sub Total</th>
    <th>GST</th>
    <th>Grand Total</th>
   
</tr>
    </thead>
    <tbody>

<?php


/* FETCH CLIENT GSTIN NUMBER */


$retval = mysqli_query(
    $con,
    "SELECT * FROM purchase 
     WHERE vendor='$client' 
     ORDER BY date ASC 
    "
) or die(mysqli_error($con));

$st = $gt = $tt = 0;

while ($row = mysqli_fetch_array($retval)) {

    
    $date1  = $row['date'];
   $subtotal=$row['subtotal'];
   $gst=$row['gst'];
   $total=$row['total'];

    echo "<tr>
            <td>{$row['bill']}</td>
            <td>" . date("d-m-Y", strtotime($date1)) . "</td>";

    $gt += $gst;
    $st+= $subtotal;
    $tt += $total;
 echo "<td>" . number_format($subtotal, 2) . "</td>";
    echo "<td>" . number_format($gst, 2) . "</td>";
    echo "<td>" . number_format($total, 2) . "</td>";?>
    
    <?php  echo "</tr>";
}
?>

<tr class='total-row'>
    <td colspan="2"><strong>Total</strong></td>
    <td><strong><?php echo number_format($st, 2); ?></strong></td>
    <td><strong><?php echo number_format($gt, 2); ?></strong></td>
    <td><strong><?php echo number_format($tt, 2); ?></strong></td>
</tr>

</tbody>
</table>
</div>
</div>

<!-- PAGINATION -->

</div>





&nbsp;
  <!-- Right: Month-on-Month Sales -->
  <div class="right">
  <h3>Outstanding Amount </h3>
<?php $sql1 = "
    SELECT 
        SUM(amount) AS amt
    FROM vendor_outstanding
    WHERE vendor='$client'
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
        <th><?php $gtotal=round(($tt),2); echo $gtotal;?> </th>
      </tr>
       <tr>
        <th>Total Amount Received</th>
        <th><?php if($amt==null)
          {
            $amt=0;
          }
          $gtotal1=round(($amt),2); Echo $gtotal1;?> </th>
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
  <?php  $sql1 = "SELECT * FROM vendor_outstanding WHERE vendor='$client' order by date ASC ";
$result1 = mysqli_query($con, $sql1) or die(mysqli_error($con));
$ht=0;
while ($row1 = mysqli_fetch_assoc($result1)) {
    $amt = $row1['amount'];
    $ht+=$amt;
    echo "<tr><td>".date("d-m-Y", strtotime($row1['date']))."</td><td>".$row1['remarks']."</td><td>".$amt."</td></tr>" ; 
}
?>
<tr><td colspan='2'><b>TOTAL</b></td><td><b><?php echo $ht;?></b></td></tr>
</tbody>
</table>


</div>
