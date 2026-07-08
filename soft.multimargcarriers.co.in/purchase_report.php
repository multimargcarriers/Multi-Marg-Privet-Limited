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

$limit = 15; // companies per page
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$start = ($page - 1) * $limit;
$search = isset($_GET['search']) ? mysqli_real_escape_string($con, $_GET['search']) : "";
$sql = "SELECT vendor,date, SUM(total) as total_amount 
        FROM purchase 
        WHERE vendor LIKE '%$search%' 
        GROUP BY vendor 
        ORDER BY vendor ASC 
        LIMIT $start, $limit";

$result = mysqli_query($con, $sql);

// Count total companies for pagination
$count_sql = "SELECT COUNT(DISTINCT vendor) as total FROM purchase WHERE vendor LIKE '%$search%'";
$count_result = mysqli_query($con, $count_sql);
$total_companies = mysqli_fetch_assoc($count_result)['total'];
$total_pages = ceil($total_companies / $limit);
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
    <h2>Purchase Bills Overview</h2>
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
    <span class='client'><strong>Vendor</strong></span>
    <span class='amount'>Total Bill</span>
    <span class='amount'>Outstanding</span>
</div>";

while ($row = mysqli_fetch_assoc($result)) {

    $client = $row['vendor'];
$total_amount=$row['total_amount'];
    /* ===== GET CLIENT GSTIN NUMBER ===== */
   
    /* ===== OUTSTANDING ===== */
    $amt = 0;
    $sql1 = "
        SELECT SUM(amount) AS amt
        FROM vendor_outstanding
        WHERE vendor = '$client'
    ";
    $result1 = mysqli_query($con, $sql1) or die(mysqli_error($con));
    if ($rowo = mysqli_fetch_assoc($result1)) {
        $amt = $rowo['amt'];
    }

    $out = $total_amount - $amt;

    echo "
    <div class='company'>
        <span class='client'>
            <a href='vendor_outstanding_ledger.php?vendor=$client'>$client</a>
        </span>
        <span class='amount'>₹". number_format($total_amount, 2) . "</span>
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


<?php include('header/footer.php'); ?>