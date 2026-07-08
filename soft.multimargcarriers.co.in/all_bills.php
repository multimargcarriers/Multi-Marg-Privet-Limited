<?php
// Start the session before any output
session_start();
$t=$_SESSION['user']['name'];
if (!isset($_SESSION['user'])) {
    echo "<script>window.location = 'index.php'</script>";
    exit;
}
include('header/header.php');
include('config.php');

/* =====================
   FILTER INPUTS
===================== */
$fr = $to = $search = '';

if (isset($_POST['fr'], $_POST['to'])) {
    $fr = mysqli_real_escape_string($con, $_POST['fr']);
    $to = mysqli_real_escape_string($con, $_POST['to']);
} elseif (isset($_GET['fr'], $_GET['to'])) {
    $fr = mysqli_real_escape_string($con, $_GET['fr']);
    $to = mysqli_real_escape_string($con, $_GET['to']);
}

if (isset($_POST['search'])) {
    $search = mysqli_real_escape_string($con, $_POST['search']);
} elseif (isset($_GET['search'])) {
    $search = mysqli_real_escape_string($con, $_GET['search']);
}

/* =====================
   PAGINATION
===================== */
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

// safety check
if (!in_array($limit, [10,25,50,100])) {
    $limit = 10;
}

/* =====================
   GST FUNCTION
===================== */
function calculateGST($subTotal, $gstin, $mode, $client, $invoiceDate) {

    if (strtoupper($gstin) !== "YES") return 0;

    $GST_AIR   = 0.18;
    $GST_OTHER = 0.12;
    $cutoffDate = '2025-09-20';

    if (
        strtoupper($client) === 'CJ DARCL LOGISTICS LIMITED' ||
        stripos($client, 'BELRISE') !== false
    ) {
        return $subTotal * $GST_AIR;
    }

    if ($invoiceDate > $cutoffDate) {
        return $subTotal * $GST_AIR;
    }

    return (strtoupper($mode) === 'AIR')
        ? $subTotal * $GST_AIR
        : $subTotal * $GST_OTHER;
}

/* =====================
   COUNT TOTAL RECORDS
===================== */
$countSql = "
SELECT COUNT(DISTINCT invoice) AS total
FROM bills
WHERE 1
";

if (!empty($fr) && !empty($to)) {
    $countSql .= " AND invoice_date BETWEEN '$fr' AND '$to'";
}

if (!empty($search)) {
    $countSql .= " AND (
        invoice LIKE '%$search%' OR
        client LIKE '%$search%' OR
        mode LIKE '%$search%'
    )";
}

$countRes   = mysqli_query($con, $countSql);
$totalRows  = mysqli_fetch_assoc($countRes)['total'];
$totalPages = ceil($totalRows / $limit);

/* =====================
   MAIN DATA QUERY
===================== */
$sql = "
SELECT 
    invoice,
    invoice_date,
    client,
    mode,
    gst,
    pid,
    SUM(
        frieght + awb_charge + pickup + delivery +
        special_delivery + other_charge
    ) AS sub_total
FROM bills
WHERE 1
";

if (!empty($fr) && !empty($to)) {
    $sql .= " AND invoice_date BETWEEN '$fr' AND '$to'";
}

if (!empty($search)) {
    $sql .= " AND (
        invoice LIKE '%$search%' OR
        client LIKE '%$search%' OR
        mode LIKE '%$search%'
    )";
}

$sql .= " GROUP BY invoice ORDER BY invoice DESC LIMIT $limit ";

$result = mysqli_query($con, $sql) or die(mysqli_error($con));

$st = $gt = $tt = 0;
?>

<div class="page-wrapper">
<div class="container-fluid">

<h2>All Bills</h2>

<!-- DATE FILTER FORM -->
<form method="POST">

<div class="row">
    <div class="col-sm-6">
        <label>FROM DATE</label>
        <input type="date" name="fr" class="form-control" value="<?= $fr ?>">
    </div>

    <div class="col-sm-6">
        <label>TO DATE</label>
        <input type="date" name="to" class="form-control" value="<?= $to ?>">
    </div>
</div>

<br>

<button class="btn btn-primary">SUBMIT</button>

<div style="float:right;">
<a href="exports/allbills_export.php?from=<?php echo $fr;?>&to=<?php echo $to;?>">
<input type="button" class="btn btn-raised btn-primary waves-effect"
       value="ALL BILLS REPORT" />
</a>
</div>

</form>

<br>

<!-- 🔎 SEARCH BAR (LIKE YOUR IMAGE) -->
<form method="GET">
<div class="row align-items-center">

    <!-- LEFT SIDE (Search) -->
    <div class="col-sm-6">
        <div class="input-group">
            <input type="text" name="search" class="form-control"
                   placeholder="Search anything..."
                   value="<?= $search ?>">

            <div class="input-group-append">
                <button type="submit" class="btn btn-primary">
                    Search
                </button>
            </div>
        </div>
    </div>

    <!-- RIGHT SIDE (Limit Dropdown) -->
    <div class="col-sm-2 ml-auto">
        <select name="limit" class="form-control" onchange="this.form.submit()">
            <option value="10" <?= (isset($_GET['limit']) && $_GET['limit']==10)?'selected':'' ?>>10</option>
            <option value="25" <?= (isset($_GET['limit']) && $_GET['limit']==25)?'selected':'' ?>>25</option>
            <option value="50" <?= (isset($_GET['limit']) && $_GET['limit']==50)?'selected':'' ?>>50</option>
            <option value="100" <?= (isset($_GET['limit']) && $_GET['limit']==100)?'selected':'' ?>>100</option>
        </select>
    </div>

    <!-- KEEP FILTER VALUES -->
    <input type="hidden" name="fr" value="<?= $fr ?>">
    <input type="hidden" name="to" value="<?= $to ?>">

</div>
</form>
<br>

<!-- TABLE -->
<div class="table-responsive">
<table class="table table-bordered table-striped">
<thead>
<tr>
    <th>#</th>
    <th>Date</th>
    <th>Invoice</th>
    <th>Client</th>
    <th>Mode</th>
    <th>Sub Total</th>
    <th>GST</th>
    <th>Total</th>
    <th>Print</th>
    <th>Edit</th>

    <th>Delete</th>
</tr>
</thead>

<tbody>
<?php while ($row = mysqli_fetch_assoc($result)):

    $subTotal = $row['sub_total'];
    $gst = calculateGST(
        $subTotal,
        $row['gst'],
        $row['mode'],
        $row['client'],
        $row['invoice_date']
    );
    $total = $subTotal + $gst;

    $st += $subTotal;
    $gt += $gst;
    $tt += $total;
?>
<tr>
    <td>#</td>
    <td><?= date("d-m-Y", strtotime($row['invoice_date'])) ?></td>
    <td><?= $row['invoice'] ?></td>
    <td><?= $row['client'] ?></td>
    <td><?= $row['mode'] ?></td>
    <td><?= number_format($subTotal, 2) ?></td>
    <td><?= number_format($gst, 2) ?></td>
    <td><?= number_format($total, 2) ?></td>

    <td>
        <button class="btn btn-info" onclick="printBill(<?= $row['pid'] ?>)">Print</button>
    </td>

    <td>
        <a href="updatebill.php?code=<?= $row['pid'] ?>" class="btn btn-warning">Edit</a>
    </td>

    <td>
        <button class="btn btn-danger" onclick="myConfirm(<?= $row['pid'] ?>)">Delete</button>
    </td>
</tr>
<?php endwhile; ?>
</tbody>

<tfoot>
<tr>
    <th colspan="5">TOTAL</th>
    <th><?= number_format($st,2) ?></th>
    <th><?= number_format($gt,2) ?></th>
    <th><?= number_format($tt,2) ?></th>
    <th colspan="3"></th>
</tr>
</tfoot>
</table>
</div>

<!-- PAGINATION -->


</div>
</div>

<script>
function myConfirm(id){
    if(confirm("Are you sure you want to delete?")){
        window.location.href = "delete/deletebill.php?vat=" + id;
    }
}

function printBill(pid){
    let sign = confirm("Print WITH SIGN?\nOK = With Sign\nCancel = Without Sign");
    window.open("bill.php?code=" + pid + "&sign=" + (sign ? 1 : 0), "_blank");
}
</script>

<?php include('header/footer.php'); ?>
