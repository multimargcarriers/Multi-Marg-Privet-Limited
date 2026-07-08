<?php
// Start the session before any output
session_start();
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    // Redirect to the login page or display an error message
  echo "<script>window.location = 'index.php'</script>";
    exit;
}

include('header/header.php');
include('config.php');
$limit = 12; // companies per page
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$start = ($page - 1) * $limit;
$search = isset($_GET['search']) ? mysqli_real_escape_string($con, $_GET['search']) : "";
$sql = "SELECT client,gst,invoice_date, SUM(frieght + awb_charge + pickup + delivery + special_delivery + other_charge) as total_amount 
        FROM bills 
        WHERE client LIKE '%$search%' 
        GROUP BY client 
        ORDER BY client ASC 
        LIMIT $start, $limit";

$result = mysqli_query($con, $sql);

// Count total companies for pagination
$count_sql = "SELECT COUNT(DISTINCT client) as total FROM bills WHERE client LIKE '%$search%'";
$count_result = mysqli_query($con, $count_sql);
$total_companies = mysqli_fetch_assoc($count_result)['total'];
$total_pages = ceil($total_companies / $limit);
?>
?>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
    * {
      box-sizing: border-box;
      font-family: 'Poppins', sans-serif;
    }

   .dashboard {
    display: flex;
    gap: 20px;
  }

    .sidebar {
      width: 25%;
      background: #1e1f26;
      color: #fff;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }

    .sidebar h2 {
      text-align: center;
      margin-bottom: 20px;
      font-size: 1.5em;
      border-bottom: 2px solid #444;
      padding-bottom: 10px;
    }

    

    .company span {
      font-size: 0.95em;
    }

    .company .amount {
      font-weight: bold;
      color: #00c896;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
      overflow-y: auto;
    }

    .charts-top {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .charts-bottom {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .chart-box {
      flex: 1;
      min-width: 300px;
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    canvas {
      width: 100% !important;
      height: 500px !important;
    }

    /* Table styling */
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

      <div class="page-wrapper">
		<div class="page-breadcrumb">
            
    <div class="row">
      
            <!-- ============================================================== -->
            <!-- Bread crumb and right sidebar toggle -->
            <!-- ============================================================== -->
            <div class="container-fluid">
                <div class="dashboard">
  <div class="left">
    <h2>Company Overview</h2>
    <form method="GET" style="margin-bottom:20px;">
    <input type="text" name="search" placeholder="Search Company" value="<?php echo htmlspecialchars($search); ?>">
    <button type="submit">Search</button>
</form>
<style>
.company {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #ddd;
  padding: 6px 10px;
}

/* Client name stays left */
.company .client {
  flex: 1;
}

/* Amount columns fixed width and right-aligned */
.company .amount {
  width: 120px;
  text-align: right;
}
</style>
<!-- Company List -->
<div class="company-list">
<?php


echo "
<div class='company'>
    <span class='client'><strong>Client</strong></span>
    <span class='amount'>Total Bill</span>
    <span class='amount'>Outstanding</span>
</div>";

while ($row = mysqli_fetch_assoc($result)) {

    $client = $row['client'];

    /* ===== GET CLIENT GSTIN NUMBER ===== */
    $gstin_no = '';
    $gstRes = mysqli_query($con, "
        SELECT gst 
        FROM client 
        WHERE client = '$client' 
        LIMIT 1
    ");
    if ($gstRow = mysqli_fetch_assoc($gstRes)) {
        $gstin_no = $gstRow['gst'];
    }

    /* ===== GET CLIENT INVOICES ===== */
    $retval2 = mysqli_query($con, "
        SELECT invoice, mode, gst, invoice_date
        FROM bills
        WHERE client = '$client'
        GROUP BY invoice
        ORDER BY invoice DESC
    ") or die(mysqli_error($con));

    $tt =$gt =$st= 0;

    while ($row2 = mysqli_fetch_array($retval2)) {

        $invoice = $row2['invoice'];
        $mode = $row2['mode'];
        $gstin = $row2['gst']; // YES / NO
        $date1 = $row2['invoice_date'];
$date = "2025-09-20";
        /* ===== SUB TOTAL ===== */
        $sub_total = 0;
        $retval1 = mysqli_query($con, "
            SELECT 
                IFNULL(frieght,0) +
                IFNULL(awb_charge,0) +
                IFNULL(pickup,0) +
                IFNULL(delivery,0) +
                IFNULL(special_delivery,0) +
                IFNULL(other_charge,0) AS amt
            FROM bills
            WHERE invoice = '$invoice'
        ") or die(mysqli_error($con));

        while ($row1 = mysqli_fetch_array($retval1)) {
            $sub_total += $row1['amt'];
        }

        /* ===== GST CALCULATION ===== */
        $gst =  0;
        $cgst = $sgst = $igst = 0;

       

        if ($gstin == 'YES') {
        $client_upper = strtoupper($client);
        $state_code = substr($gstin_no, 0, 2);

        // Special client rules
        if ($client_upper === 'CJ DARCL LOGISTICS LIMITED') {
            $igst = $sub_total * 0.18;
        } elseif (stripos($client_upper, 'BELRISE') !== false) {
            $cgst = $sub_total * 0.09;
            $sgst = $sub_total * 0.09;
        } 
        // Normal GST logic
        else {
            if ($date1 > $date) {
                if ($state_code == "05") {
                    $cgst = $sub_total * 0.09;
                    $sgst = $sub_total * 0.09;
                } else {
                    $igst = $sub_total * 0.18;
                }
            } else {
                if ($mode == 'AIR') {
                    if ($state_code == "05") {
                        $cgst = $sub_total * 0.09;
                        $sgst = $sub_total * 0.09;
                    } else {
                        $igst = $sub_total * 0.18;
                    }
                } else {
                    if ($state_code == "05") {
                        $cgst = $sub_total * 0.06;
                        $sgst = $sub_total * 0.06;
                    } else {
                        $igst = $sub_total * 0.12;
                    }
                }
            }
        }

            $gst = $cgst + $sgst + $igst;
        }

        $total = $sub_total + $gst;
       
        $tt += $total;
    }

    /* ===== OUTSTANDING ===== */
    $amt = 0;
    $sql1 = "
        SELECT SUM(amount) AS amt
        FROM outstanding
        WHERE client = '$client'
    ";
    $result1 = mysqli_query($con, $sql1) or die(mysqli_error($con));
    if ($rowo = mysqli_fetch_assoc($result1)) {
        $amt = $rowo['amt'];
    }

    $out = $tt - $amt;

    echo "
    <div class='company'>
        <span class='client'>
            <a href='outstanding_ledger.php?client=$client'>$client</a>
        </span>
        <span class='amount'>₹". number_format($tt, 2) . "</span>
        <span class='amount'>₹" . number_format($out, 2) . "</span>
    </div>";
}
?>
</div>
<div class="pagination" style="margin-top:20px;">
    <?php
    // Previous button
    if($page > 1){
        $prev = $page - 1;
        echo "<a href='?page=$prev&search=".urlencode($search)."' style='margin-right:10px;'>Previous</a>";
    } else {
        echo "<span style='margin-right:10px;color:#ccc;'>Previous</span>";
    }

    // Numbered pages
    for($i = 1; $i <= $total_pages; $i++) {
        if($i == $page){
            echo "<span style='margin:0 5px;font-weight:bold;'>$i</span>";
        } else {
            echo "<a style='margin:0 5px;' href='?page=$i&search=".urlencode($search)."'>$i</a>";
        }
    }

    // Next button
    if($page < $total_pages){
        $next = $page + 1;
        echo "<a style='margin-left:10px;' href='?page=$next&search=".urlencode($search)."'>Next</a>";
    } else {
        echo "<span style='margin-left:10px;color:#ccc;'>Next</span>";
    }
    ?>
</div>

</div>
<?php
include('config.php');

/* ===============================
   FINANCIAL YEAR DROPDOWN (FIXED)
================================ */

// Current year logic
$currentMonth = date('n');
$currentYear  = date('Y');
$defaultFY    = ($currentMonth >= 4) ? $currentYear : $currentYear - 1;

// Selected year
$selectedYear = isset($_GET['year']) ? intval($_GET['year']) : $defaultFY;

// Start & End date
$startDate = "$selectedYear-04-01";
$endDate   = ($selectedYear + 1) . "-03-31";

/* ===============================
   FETCH DATA
================================ */

$sql = "
    SELECT 
        b.invoice_date,
        b.client,
        b.mode,
        b.gst,
        c.gst AS client_gst,
        (IFNULL(frieght,0) + IFNULL(awb_charge,0) + IFNULL(pickup,0) + 
         IFNULL(delivery,0) + IFNULL(special_delivery,0) + IFNULL(other_charge,0)) AS sub_total
    FROM bills b
    LEFT JOIN client c ON c.client = b.client
    WHERE invoice_date BETWEEN '$startDate' AND '$endDate'
";

$result = mysqli_query($con, $sql) or die(mysqli_error($con));

/* ===============================
   MONTH ARRAY (APR → MAR)
================================ */

$months = [4,5,6,7,8,9,10,11,12,1,2,3];
$monthData = [];

foreach ($months as $m) {
    $monthData[$m] = ['amount' => 0, 'gst' => 0];
}

/* ===============================
   LOOP DATA
================================ */

while ($row = mysqli_fetch_assoc($result)) {

    $monthNum = date('n', strtotime($row['invoice_date']));
    $sub_total = $row['sub_total'];
    $gstin = $row['gst'];
    $mode  = $row['mode'];
    $date1 = $row['invoice_date'];

    $gst = 0;
    $cgst = $sgst = $igst = 0;

    $cutoff = "2025-09-20";

    if ($gstin == 'YES') {

        $client_upper = strtoupper($row['client']);
        $state_code   = substr($row['client_gst'], 0, 2);

        // Special Rules
        if ($client_upper === 'CJ DARCL LOGISTICS LIMITED') {
            $igst = $sub_total * 0.18;
        } 
        elseif (stripos($client_upper, 'BELRISE') !== false) {
            $cgst = $sub_total * 0.09;
            $sgst = $sub_total * 0.09;
        } 
        else {
            if ($date1 > $cutoff) {
                if ($state_code == "05") {
                    $cgst = $sub_total * 0.09;
                    $sgst = $sub_total * 0.09;
                } else {
                    $igst = $sub_total * 0.18;
                }
            } else {
                if ($mode == 'AIR') {
                    if ($state_code == "05") {
                        $cgst = $sub_total * 0.09;
                        $sgst = $sub_total * 0.09;
                    } else {
                        $igst = $sub_total * 0.18;
                    }
                } else {
                    if ($state_code == "05") {
                        $cgst = $sub_total * 0.06;
                        $sgst = $sub_total * 0.06;
                    } else {
                        $igst = $sub_total * 0.12;
                    }
                }
            }
        }

        $gst = $cgst + $sgst + $igst;
    }

    $monthData[$monthNum]['amount'] += $sub_total;
    $monthData[$monthNum]['gst']    += $gst;
}
?>

<!-- ===============================
     RIGHT SECTION UI
================================ -->

<div class="right">
<h3>Month-on-Month Sales (FY <?php echo $selectedYear . '-' . ($selectedYear + 1); ?>)</h3>

<!-- 🔥 FIXED DROPDOWN -->
<form method="GET" style="margin-bottom: 15px;">
    <label>Select Financial Year:</label>
    <select name="year" onchange="this.form.submit()">
        <?php
        for ($i = 0; $i < 5; $i++) {
            $year = $defaultFY - $i;
            $selected = ($year == $selectedYear) ? "selected" : "";
            echo "<option value='$year' $selected>FY $year-" . ($year + 1) . "</option>";
        }
        ?>
    </select>
</form>

<table>
<thead>
<tr>
    <th>Month</th>
    <th>Sub Total</th>
    <th>GST</th>
    <th>Grand Total</th>
</tr>
</thead>

<tbody>
<?php
$grandAmount = 0;
$grandGST    = 0;

foreach ($months as $m) {

    $monthName = date('F', mktime(0, 0, 0, $m, 10));
    $amount = $monthData[$m]['amount'];
    $gst    = $monthData[$m]['gst'];
    $total  = $amount + $gst;

    $grandAmount += $amount;
    $grandGST    += $gst;

    echo "
    <tr>
        <td>$monthName</td>
        <td>₹" . number_format($amount, 2) . "</td>
        <td>₹" . number_format($gst, 2) . "</td>
        <td>₹" . number_format($total, 2) . "</td>
    </tr>";
}

$grandTotal = $grandAmount + $grandGST;
?>

<tr>
    <td><strong>Total</strong></td>
    <td><strong>₹<?php echo number_format($grandAmount, 2); ?></strong></td>
    <td><strong>₹<?php echo number_format($grandGST, 2); ?></strong></td>
    <td><strong>₹<?php echo number_format($grandTotal, 2); ?></strong></td>
</tr>

</tbody>
</table>

<?php if($grandTotal == 0){ ?>
    <p style="color:red; margin-top:10px;">⚠ No data found for this Financial Year</p>
<?php } ?>

</div>

</div>
<br>
    <div class="charts-bottom">
      <div class="chart-box">
        <h3>Sales Breakdown (Pie)</h3>
        <canvas id="pieChart"></canvas>
      </div>
      <div class="chart-box">
        <h3>Monthly Comparison (Bar)</h3>
        <canvas id="barChart"></canvas>
      </div>
    </div>
  </div>
 </div>
  </div> </div>
  </div>
  <script>
    // Sample data
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep','Oct','Nov','Dec','Jan', 'Feb', 'Mar'];
    const salesData = [<?php
    $jsData = [];
    foreach ($months as $m) {
        $total = $monthData[$m]['amount'] + $monthData[$m]['gst']; // grand total per month
        $jsData[] = round($total, 2);
    }
    echo implode(',', $jsData);
    ?>];

    // Populate the sales table dynamically
   

    // Line Chart
    const ctxLine = document.getElementById('lineChart');
    new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Sales ($)',
          data: salesData,
          borderColor: '#00c896',
          backgroundColor: 'rgba(0,200,150,0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Pie Chart
   const ctxPie = document.getElementById('pieChart');

// Make sure salesData has 12 values (replace missing months with 0)
const safeSalesData = salesData.slice(0,12).map(v => v ? v : 0);

const backgroundColors = [
  '#FB2C36', '#FEF9C2', '#31C950', '#A2F4FD', '#FE9A37', '#4F39F6',
  '#C9CBCF', '#FFE2E2', '#A813B7', '#FDA5D5', '#FFD700', '#8A2BE2'
];

new Chart(ctxPie, {
  type: 'pie',
  data: {
    labels: months.slice(0,12),
    datasets: [{
      data: safeSalesData,
      backgroundColor: backgroundColors,
      borderColor: '#000',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          font: { size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let value = context.raw;
            return context.label + ': ₹' + value.toLocaleString('en-IN'); // Indian format
          }
        }
      }
    },
    hoverOffset: 10 // slices pop out on hover
  }
});

    // Bar Chart
    const ctxBar = document.getElementById('barChart');
    new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: months.slice(0,12),
        datasets: [{
          label: 'Sales (₹)',
          data: salesData.slice(0,12),
          backgroundColor: '#007bff'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  </script>


<?php include('header/footer.php'); ?>