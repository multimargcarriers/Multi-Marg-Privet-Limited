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

define('GST_AIR', 0.18); // 18% standard rate

$fr = isset($_GET['fr']) ? $_GET['fr'] : '';
$to = isset($_GET['to']) ? $_GET['to'] : '';

if (!empty($fr) && !DateTime::createFromFormat('Y-m-d', $fr)) $fr = '';
if (!empty($to) && !DateTime::createFromFormat('Y-m-d', $to)) $to = '';

$limit = 10;
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$offset = ($page - 1) * $limit;

$where = "";
if (!empty($fr) && !empty($to)) {
    $fr_esc = mysqli_real_escape_string($con, $fr);
    $to_esc = mysqli_real_escape_string($con, $to);
    $where = " WHERE b.invoice_date BETWEEN '$fr_esc' AND '$to_esc' ";
}

$countSql = "SELECT COUNT(DISTINCT b.invoice) AS total FROM bills b $where";
$countRes = mysqli_query($con, $countSql);
$totalRows = mysqli_fetch_assoc($countRes)['total'];
$totalPages = ceil($totalRows / $limit);

$sql = "
SELECT 
    b.invoice,
    b.invoice_date,
    b.client,
    b.mode,
    c.gst AS gstin,
    SUM(
        b.frieght + b.awb_charge + b.pickup +
        b.delivery + b.special_delivery + b.other_charge
    ) AS taxable_value
FROM bills b
LEFT JOIN client c ON c.client = b.client
$where
GROUP BY b.invoice
ORDER BY MAX(b.pid) DESC
LIMIT $limit OFFSET $offset
";

$result = mysqli_query($con, $sql) or die(mysqli_error($con));

// GST calculation function
function calculateGST($sub_total, $gstin, $mode, $invoice_date, $client) {
    $cutoff_date = '2025-09-20';
    $cgst = $sgst = $igst = 0;
    $code = substr($gstin, 0, 2);
    $mode = strtoupper($mode);
    $client_upper = strtoupper($client);

    // Special clients
    if ($client_upper === 'CJ DARCL LOGISTICS LIMITED') {
        $igst = $sub_total * GST_AIR;
        return ['cgst' => 0, 'sgst' => 0, 'igst' => $igst];
    } elseif (stripos($client_upper, 'BELRISE') !== false) {
        $cgst = $sub_total * 0.09;
        $sgst = $sub_total * 0.09;
        return ['cgst' => $cgst, 'sgst' => $sgst, 'igst' => 0];
    }

    // Normal GST rules
    if (!empty($gstin)) {
        if ($invoice_date > $cutoff_date || $mode == "AIR") {
            if ($code == "05") {
                $cgst = $sub_total * 0.09;
                $sgst = $sub_total * 0.09;
            } else {
                $igst = $sub_total * 0.18;
            }
        } else {
            if ($code == "05") {
                $cgst = $sub_total * 0.06;
                $sgst = $sub_total * 0.06;
            } else {
                $igst = $sub_total * 0.12;
            }
        }
    }

    return ['cgst' => $cgst, 'sgst' => $sgst, 'igst' => $igst];
}

?>

<div class="page-wrapper">
    <div class="page-breadcrumb">
        <div class="body">
            <h2 class="card-inside-title">GST Report</h2>

            <!-- Filter Form -->
            <form method="GET" id="frm1" class="login100-form validate-form">
                <div class="row clearfix">
                    <div class="col-sm-6" data-validate="Branch is required">
                        <div class="form-group">
                            <label><b>FROM DATE</b></label>
                            <input type="date" class="form-control" name="fr" value="<?= htmlspecialchars($fr) ?>">
                        </div>
                    </div>
                    <div class="col-sm-6" data-validate="Branch is required">
                        <div class="form-group">
                            <label><b>TO DATE</b></label>
                            <input type="date" class="form-control" name="to" value="<?= htmlspecialchars($to) ?>">
                        </div>
                    </div>
                </div>
                <center>
                    <div class="col-sm-6">
                        <div class="form-group">
                            <input type="submit" class="btn btn-primary" value="SEARCH">
                        </div>
                    </div>
                </center>
            </form>

            <!-- GST Export Button -->
            <div class="form-group">
                <a href="exports/gst_export.php?from=<?= urlencode($fr) ?>&to=<?= urlencode($to) ?>" class="btn btn-primary">GST REPORT</a>
            </div>

            <!-- GST Table -->
            <div class="table-responsive">
                <table id="invoice_table" class="table table-striped table-bordered display nowrap" style="width:100%">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Invoice</th>
                            <th>Client</th>
                            <th>GSTIN</th>
                            <th>SAC/HSN</th>
                            <th>Taxable Value</th>
                            <th>IGST</th>
                            <th>CGST</th>
                            <th>SGST</th>
                            <th>Total Tax</th>
                            <th>Grand Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $sr = $offset + 1;
                        $st = $gt = $tt = $cgst_total = $sgst_total = $igst_total = 0;

                        while ($row = mysqli_fetch_assoc($result)) {
                            $sub_total = $row['taxable_value'];
                            $mode = strtoupper($row['mode']);
                            $gstin = $row['gstin'];
                            $client = $row['client'];

                            $taxes = calculateGST($sub_total, $gstin, $mode, $row['invoice_date'], $client);
                            $cgst = $taxes['cgst'];
                            $sgst = $taxes['sgst'];
                            $igst = $taxes['igst'];

                            $gst = $cgst + $sgst + $igst;
                            $total = $sub_total + $gst;

                            $st += $sub_total;
                            $gt += $gst;
                            $tt += $total;
                            $cgst_total += $cgst;
                            $sgst_total += $sgst;
                            $igst_total += $igst;
                        ?>
                        <tr>
                            <td><?= $sr++ ?></td>
                            <td><?= date('d-m-Y', strtotime($row['invoice_date'])) ?></td>
                            <td><?= htmlspecialchars($row['invoice']) ?></td>
                            <td><?= htmlspecialchars($client) ?></td>
                            <td><?= htmlspecialchars($gstin) ?></td>
                            <td>
                                <?= ($mode == "AIR") ? "996531" : (($mode == "TRAIN") ? "996512" : "996511") ?>
                            </td>
                            <td><?= number_format($sub_total, 2) ?></td>
                            <td><?= number_format($igst, 2) ?></td>
                            <td><?= number_format($cgst, 2) ?></td>
                            <td><?= number_format($sgst, 2) ?></td>
                            <td><?= number_format($gst, 2) ?></td>
                            <td><?= number_format($total, 2) ?></td>
                        </tr>
                        <?php } ?>
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="6">TOTAL</th>
                            <th><?= number_format($st, 2) ?></th>
                            <th><?= number_format($igst_total, 2) ?></th>
                            <th><?= number_format($cgst_total, 2) ?></th>
                            <th><?= number_format($sgst_total, 2) ?></th>
                            <th><?= number_format($gt, 2) ?></th>
                            <th><?= number_format($tt, 2) ?></th>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Pagination -->
            <nav>
                <ul class="pagination justify-content-center">
                    <?php
                    $range = 1;
                    $start = max(1, $page - $range);
                    $end = min($totalPages, $page + $range);
                    ?>

                    <?php if ($page > 1): ?>
                        <li class="page-item">
                            <a class="page-link" href="?page=<?= $page-1 ?>&fr=<?= urlencode($fr) ?>&to=<?= urlencode($to) ?>">Previous</a>
                        </li>
                    <?php endif; ?>

                    <?php for ($i = $start; $i <= $end; $i++): ?>
                        <li class="page-item <?= ($i == $page) ? 'active' : '' ?>">
                            <a class="page-link" href="?page=<?= $i ?>&fr=<?= urlencode($fr) ?>&to=<?= urlencode($to) ?>"><?= $i ?></a>
                        </li>
                    <?php endfor; ?>

                    <?php if ($page < $totalPages): ?>
                        <li class="page-item">
                            <a class="page-link" href="?page=<?= $page+1 ?>&fr=<?= urlencode($fr) ?>&to=<?= urlencode($to) ?>">Next</a>
                        </li>
                    <?php endif; ?>
                </ul>
            </nav>
        </div>
    </div>
</div>

<?php include('header/footer.php'); ?>