<?php
// Start the session before any output
session_start();
include('config.php');

$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}
include('header/header.php');
if (!isset($_GET['client']) || trim($_GET['client']) === '') {
    echo "<script>alert('Client not selected'); window.location='dashboard.php';</script>";
    exit;
}
$client = mysqli_real_escape_string($con, $_GET['client']);

$limit = 15;
$limit1 = 11;// records per page
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
if ($page < 1) $page = 1;
$start = ($page - 1) * $limit;
$start1 = ($page - 1) * $limit1;
// Get total invoices count for pagination
$result_count = mysqli_query($con, "SELECT COUNT(DISTINCT invoice) AS total FROM bills WHERE client='$client'");
$result_count1 = mysqli_query($con, "SELECT COUNT(amount) AS total1 FROM outstanding WHERE client='$client'");
$row_count = mysqli_fetch_assoc($result_count);
$row_count1 = mysqli_fetch_assoc($result_count1);
$total_companies = $row_count['total'];
$total_amount = $row_count1['total1'];
$total_pages = ceil($total_companies / $limit);
$total_pages1 = ceil($total_amount / $limit);
?>
<style>
     .left {
    flex: 1;
    background: #ffffff;
    border-radius: 12px;
    padding: 20px;
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
    gap: 12px;
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
    padding: 20px;
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
    padding: 10px;
    text-align: left;
  }

  table th {
    background-color: #007bff;
    color: white;
  }

  table tr:hover {
    background-color: #f1f1f1;
  }
 
</style>
        <!-- ============================================================== -->
        <!-- End Left Sidebar - style you can find in sidebar.scss  -->
        <!-- ============================================================== -->
        <!-- ============================================================== -->
        <!-- Page wrapper  -->
        <!-- ============================================================== -->
        <div class="page-wrapper">
		<div class="page-breadcrumb">
            
  
      
            <!-- ============================================================== -->
            <!-- Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
            <div class="container-fluid">
            <!-- Input -->
            <form class="login100-form validate-form" method="POST" id="frm1" action="add/add-outstanding.php">
            <div class="row clearfix">
                <div class="col-lg-12 col-md-12 col-sm-12">
        
                        <div class="body">
                            <h2 class="card-inside-title">Outstanding Ledger : <?php echo $client; ?></h2>
                            
 

                            <div class="row clearfix">
                            <div class="col-sm-6" data-validate = "Employee Name is required">
                                    <div class="form-group">                                    
                                    <label><b>Date<span style="color:red">*<span></b></label> <input type="date"  class="form-control" name="date" required/>
                                    </div>

                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Particulars<span style="color:red">*<span></b></label>  <select class="form-control show-tick" name="particulars">
                                        <option value="">-- Please select the Particulars--</option>
                                        <option value="Neft">Neft</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Tds">Tds</option>
                                        <option value="Debit">Debit</option>
                                        <option value="Credit_Note">Credit Note</option>
                                        <option value="Debit_Note">Debit Note</option>
                                        </select>  
                                    </div>
                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Amount<span style="color:red">*<span></b></label> <input type="text" class="form-control" name="amount" placeholder="Enter the amount" required />  
                                    <input type="text" class="form-control" name="client" value="<?php echo $client;?>" hidden />  
                                    </div>
                                </div>
                                <div class="col-sm-6" data-validate = "Branch is required">
                                    <div class="form-group">                                   
                                    <label><b>Bank<span style="color:red">*<span></b></label> <select class="form-control show-tick" name="bankname">
                                        <option value="">-- Please select the Bank--</option>
                                        <option value="BOB">Bank of Baroda</option>
                                        <option value="UBI">Union Bank of India</option>
                                       
                                        </select>  
                                    
                                    </div>
                                </div>
                                </div>
                            </div>
                            <center><div class="col-sm-6">
                                    <div class="form-group">                                   
                                    <input type="button" class="btn btn-raised btn-primary waves-effect" onclick="submitForm()" value="ADD" />                                 
                                    </div>
                                </div></center>
</div>

</div>
</div>
</form>  
<div style="text-align: right; margin-bottom: 10px;">
  <button id="pdfButton" class="btn btn-primary">Export as PDF</button>
  <button id="csvButton" class="btn btn-success">Export as CSV</button>
</div>
<div  id="exportSection">
<div class="row">
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
     LIMIT $start, $limit"
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

        // BELRISE → Always CGST + SGST
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

    // 🔹 AFTER RATE CHANGE → ALWAYS 18%
    if ($state_code === '05') {
        // Intra-state
        $cgst = $sub_total * 0.09;
        $sgst = $sub_total * 0.09;
    } else {
        // Inter-state
        $igst = $sub_total * 0.18;
    }

} else {

    // 🔹 BEFORE RATE CHANGE
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
    <td><strong>₹<?php echo number_format($st, 2); ?></strong></td>
    <td><strong>₹<?php echo number_format($gt, 2); ?></strong></td>
    <td><strong>₹<?php echo number_format($tt, 2); ?></strong></td>
</tr>

</tbody>
</table>
</div>
</div>

<!-- PAGINATION -->
<div class="pagination" style="margin-top:20px; text-align:center;">
<?php
if ($page > 1) {
    echo "<a href='?client=$client&page=" . ($page - 1) . "'>Previous</a>";
} else {
    echo "<span style='color:#ccc;'>Previous</span>";
}

$range = 5;
$start_page = max(1, $page - floor($range / 2));
$end_page = min($total_pages, $start_page + $range - 1);

for ($i = $start_page; $i <= $end_page; $i++) {
    if ($i == $page) {
        echo "<strong style='margin:0 5px;'>$i</strong>";
    } else {
        echo "<a style='margin:0 5px;' href='?client=$client&page=$i'>$i</a>";
    }
}

if ($page < $total_pages) {
    echo "<a href='?client=$client&page=" . ($page + 1) . "'>Next</a>";
} else {
    echo "<span style='color:#ccc;'>Next</span>";
}
?>
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
    $date  = "2025-09-20";
    
    $gst = 0;
    if ($gstin == "YES") {

        // BELRISE → Always CGST + SGST
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

    // 🔹 AFTER RATE CHANGE → ALWAYS 18%
    if ($state_code === '05') {
        // Intra-state
        $cgst = $sub_total * 0.09;
        $sgst = $sub_total * 0.09;
    } else {
        // Inter-state
        $igst = $sub_total * 0.18;
    }

} else {

    // 🔹 BEFORE RATE CHANGE
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
  <?php  $sql1 = "SELECT * FROM outstanding WHERE client='$client' order by date ASC LIMIT $start1, $limit1";
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

<div class="pagination" style="margin-top:20px; text-align:center;">
    <?php
    // Previous button
    if ($page > 1) {
        $prev = $page - 1;
        echo "<a href='?client=$client&page=$prev' style='margin-right:10px;'>Previous</a>";
    } else {
        echo "<span style='margin-right:10px;color:#ccc;'>Previous</span>";
    }

    // Numbered pages (show limited range if many pages)
    $range = 5;
    $start_page = max(1, $page - floor($range / 2));
    $end_page = min($total_pages1, $start_page + $range - 1);

    for ($i = $start_page; $i <= $end_page; $i++) {
        if ($i == $page) {
            echo "<span style='margin:0 5px;font-weight:bold;'>$i</span>";
        } else {
            echo "<a style='margin:0 5px;' href='?client=$client&page=$i'>$i</a>";
        }
    }

    // Next button
    if ($page < $total_pages1) {
        $next = $page + 1;
        echo "<a style='margin-left:10px;' href='?client=$client&page=$next'>Next</a>";
    } else {
        echo "<span style='margin-left:10px;color:#ccc;'>Next</span>";
    }
    ?>
</div>
</div>
</div>
</div>
      </div>
    </div>

        <!-- ============================================================== -->
  <!-- ============================================================== -->
</div></div>      </div>                        
    <!-- ============================================================== -->
    <!-- End Wrapper -->
    <!-- ============================================================== -->
    <!-- End Wrapper -->
    <!-- ============================================================== -->
    <!-- All Jquery -->
    <!-- ============================================================== -->
   
    <!-- apps -->
    <!-- apps -->
    <script>
    function submitForm() {
        // Using the native form submit method
        document.getElementById("frm1").submit();
    }

    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>
const { jsPDF } = window.jspdf;

document.getElementById('pdfButton').addEventListener('click', async function() {
  const client = "<?php echo $client; ?>";
  
  // Fetch full HTML (no pagination)
  const response = await fetch(`export_full_data_outstanding.php?client=${client}`);
  const fullHTML = await response.text();

  // Create a hidden container to render everything
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = fullHTML;
  tempDiv.style.padding = "10px";
  tempDiv.style.background = "#fff";
  tempDiv.style.width = "1200px"; // prevent squishing
  document.body.appendChild(tempDiv);

  // Convert to PDF
  html2canvas(tempDiv, { scale: 2 }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * imgWidth / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Client_${client}_Outstanding_Report.pdf`);
    tempDiv.remove(); // Clean up
  });
});
</script>
<script>
document.getElementById('csvButton').addEventListener('click', function() {
    const client = "<?php echo $client; ?>";
    window.location.href = "export_csv_outstanding.php?client=" + encodeURIComponent(client);
});
</script>
    <?php include('header/footer.php'); ?>


