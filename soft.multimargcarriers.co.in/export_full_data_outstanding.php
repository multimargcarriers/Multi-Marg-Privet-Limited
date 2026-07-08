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
$date = "2025-09-20";

/* FETCH CLIENT GSTIN NUMBER */
$gstin_no = '';
$gstRes = mysqli_query($con, "
    SELECT gst 
    FROM client 
    WHERE client='$client' 
    LIMIT 1
");
if ($g = mysqli_fetch_assoc($gstRes)) {
    $gstin_no = $g['gst'];
}

$state_code = substr($gstin_no, 0, 2);

$retval = mysqli_query(
    $con,
    "SELECT * FROM bills 
     WHERE client='$client' 
     GROUP BY invoice 
     HAVING COUNT(invoice)>=1 
     ORDER BY invoice DESC 
     "
) or die(mysqli_error($con));

$st = $gt = $tt = 0;

while ($row = mysqli_fetch_array($retval)) {

    $consig = $row['invoice'];
    $date1  = $row['invoice_date'];
    $gstin  = $row['gst'];      // YES / NO
    $mode   = strtoupper($row['mode']);

    echo "<tr>
            <td>{$row['invoice']}</td>
            <td>" . date("d-m-Y", strtotime($date1)) . "</td>";

    /* SUB TOTAL */
    $retval1 = mysqli_query($con, "SELECT * FROM bills WHERE invoice='$consig'");
    $sub_total = 0;

    while ($row1 = mysqli_fetch_array($retval1)) {
        $sub_total +=
            $row1['frieght'] +
            $row1['awb_charge'] +
            $row1['pickup'] +
            $row1['delivery'] +
            $row1['special_delivery'] +
            $row1['other_charge'];
    }

    echo "<td>" . number_format($sub_total, 2) . "</td>";
    $st += $sub_total;

    /* ================= GST LOGIC ================= */
    $gst = 0;
    $cgst = $sgst = $igst = 0;
    $client_upper = strtoupper($client);

    if ($gstin == "YES") {

        // BELRISE â†’ Always CGST + SGST
        if (stripos($client_upper, 'BELRISE') !== false) {

            $cgst = $sub_total * 0.09;
            $sgst = $sub_total * 0.09;

        }
        // CJ DARCL
        elseif ($client_upper === 'CJ DARCL LOGISTICS LIMITED') {

            if ($state_code == '05') {
                $cgst = $sub_total * 0.09;
                $sgst = $sub_total * 0.09;
            } else {
                $igst = $sub_total * 0.18;
            }

        }
        // NORMAL CLIENTS
        else {

             if ($date1 > $date) {

    // ðŸ”¹ AFTER RATE CHANGE â†’ ALWAYS 18%
    if ($state_code === '05') {
        // Intra-state
        $cgst = $sub_total * 0.09;
        $sgst = $sub_total * 0.09;
    } else {
        // Inter-state
        $igst = $sub_total * 0.18;
    }

} else {

    // ðŸ”¹ BEFORE RATE CHANGE
    if ($state_code === '05') {

        // Intra-state
        if ($mode === 'AIR') {
            $cgst = $sub_total * 0.09;
            $sgst = $sub_total * 0.09;
        } else {
            $cgst = $sub_total * 0.06;
            $sgst = $sub_total * 0.06;
        }

    } else {

        // Inter-state
        if ($mode === 'AIR') {
            $igst = $sub_total * 0.18;
        } else {
            $igst = $sub_total * 0.12;
        }
    }
}
        }

        $gst = $cgst + $sgst + $igst;
    }

    $gt += $gst;
    $total = $sub_total + $gst;
    $tt += $total;

    echo "<td>" . number_format($gst, 2) . "</td>";
    echo "<td>" . number_format($total, 2) . "</td>";
    echo "</tr>";
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
    $date  = "2025-09-20";
    
    $gst = 0;
    if ($gstin == "YES") {

        // BELRISE â†’ Always CGST + SGST
        if (stripos($client_upper, 'BELRISE') !== false) {

            $cgst = $sub_total * 0.09;
            $sgst = $sub_total * 0.09;

        }
        // CJ DARCL
        elseif ($client_upper === 'CJ DARCL LOGISTICS LIMITED') {

            if ($state_code == '05') {
                $cgst = $sub_total * 0.09;
                $sgst = $sub_total * 0.09;
            } else {
                $igst = $sub_total * 0.18;
            }

        }
        // NORMAL CLIENTS
        else {

            if ($date1 > $date) {

    // ðŸ”¹ AFTER RATE CHANGE â†’ ALWAYS 18%
    if ($state_code === '05') {
        // Intra-state
        $cgst = $sub_total * 0.09;
        $sgst = $sub_total * 0.09;
    } else {
        // Inter-state
        $igst = $sub_total * 0.18;
    }

} else {

    // ðŸ”¹ BEFORE RATE CHANGE
    if ($state_code === '05') {

        // Intra-state
        if ($mode === 'AIR') {
            $cgst = $sub_total * 0.09;
            $sgst = $sub_total * 0.09;
        } else {
            $cgst = $sub_total * 0.06;
            $sgst = $sub_total * 0.06;
        }

    } else {

        // Inter-state
        if ($mode === 'AIR') {
            $igst = $sub_total * 0.18;
        } else {
            $igst = $sub_total * 0.12;
        }
    }
}

        }

        $gst = $cgst + $sgst + $igst;
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
         <th>Bank</th>
        <th>Amount </th>
        </tr>
    </thead>
    <tbody>  
  <?php  $sql1 = "SELECT * FROM outstanding WHERE client='$client' order by date ASC";
$result1 = mysqli_query($con, $sql1) or die(mysqli_error($con));
$ht=0;
while ($row1 = mysqli_fetch_assoc($result1)) {
    $amt = $row1['amount'];
    $ht+=$amt;
    echo "<tr><td>".date("d-m-Y", strtotime($row1['date']))."</td><td>".$row1['particulars']."</td><td>".$row1['bankname']."</td><td>".$amt."</td></tr>" ; 
}
?>
<tr><td colspan='3'><b>TOTAL</b></td><td><b><?php echo $ht;?></b></td></tr>
</tbody>
</table>


</div>
</div>