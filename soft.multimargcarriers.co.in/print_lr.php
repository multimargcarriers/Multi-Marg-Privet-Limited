<?php
include('config.php');

$trip   = $_GET['trip'];
$client = $_GET['client'];

// Get trip info
$t = mysqli_fetch_assoc(mysqli_query($con, "
    SELECT * FROM tripsheet WHERE trip='$trip'
"));

// Get material details
$m = mysqli_fetch_assoc(mysqli_query($con, "
    SELECT 
        GROUP_CONCAT(
            CONCAT(lr,' - ', consignor,' to ',consignee) 
            SEPARATOR '\n'
        ) as lr_details,
        SUM(box) as total_box,
        SUM(weight) as total_weight,
        SUM(amount) as total_amount
    FROM material_details 
    WHERE trip='$trip' AND client='$client'
"));

// Calculations
$amount = $m['total_amount'] ?? 0;
$gst    = $amount * 0.18;
$grand  = $amount + $gst;
?>

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>MULTIMARG CARRIERS</title>

<style>
body {
    font-family: Arial, sans-serif;
    background: #f5f5f5;
}

.top-buttons {
    text-align: center;
    margin: 10px;
}

button {
    padding: 8px 15px;
    margin: 5px;
    border: none;
    background: #000;
    color: #fff;
    cursor: pointer;
}

.container {
    width: 900px;
    margin: 20px auto;
    background: #fff;
    padding: 10px;
    border: 2px solid #000;
}

.header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 5px;
}

.header h1 {
    margin: 0;
    font-size: 22px;
}

.header small {
    font-size: 12px;
}

.row {
    display: flex;
    border-bottom: 1px solid #000;
}

.col {
    padding: 5px;
    border-right: 1px solid #000;
    font-size: 12px;
}

.col:last-child {
    border-right: none;
}

.left { width: 65%; }
.right { width: 35%; }

.section {
    border-bottom: 1px solid #000;
}

.section h3 {
    margin: 0;
    font-size: 13px;
    background: #eee;
    padding: 3px;
    border-bottom: 1px solid #000;
}

.table {
    width: 100%;
    border-collapse: collapse;
}

.table td, .table th {
    border: 1px solid #000;
    padding: 4px;
    font-size: 12px;
}

.footer {
    font-size: 11px;
    padding: 5px;
}

.signature {
    text-align: right;
    margin-top: 30px;
    font-size: 12px;
}

.box {
    border: 1px solid #000;
    padding: 5px;
    margin-bottom: 5px;
}

@media print {
    .top-buttons {
        display: none;
    }
    body {
        background: #fff;
    }
}
</style>
</head>

<body>

<!-- Buttons -->
<div class="top-buttons">
    <button onclick="printPage()">🖨 Print</button>
    <button onclick="downloadPDF()">⬇ Download PDF</button>
</div>

<div class="container" id="printArea">

<div class="header">
    <h1>MULTIMARG CARRIERS PRIVATE LIMITED</h1>
    <small>LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153</small>
</div>

<div class="row">
    <div class="col left">
        <div class="section">
            <h3>Client</h3>
            <p><?php echo htmlspecialchars($client); ?></p>
        </div>
    </div>

    <div class="col right">
        <div class="box"><?php echo htmlspecialchars($trip); ?></div>
        <div class="box">
            <?php echo !empty($t['date']) ? date("d-m-Y", strtotime($t['date'])) : ''; ?>
        </div>
        <div class="box">From: <?php echo htmlspecialchars($t['origin']); ?></div>
        <div class="box">To: <?php echo htmlspecialchars($t['destination']); ?></div>
    </div>
</div>

<div class="section">
    <h3>Goods Details</h3>
    <table class="table">
        <tr>
            <th>No of Pkt</th>
            <th>Description</th>
            <th>Weight</th>
        </tr>
        <tr>
            <td><?php echo $m['total_box'] ?? 0; ?></td>
            <td><?php echo nl2br($m['lr_details'] ?? ''); ?></td>
            <td><?php echo $m['total_weight'] ?? 0; ?></td>
        </tr>
    </table>
</div>

<div class="section">
    <h3>Freight Details</h3>
    <table class="table">
        <tr>
            <td>Freight</td>
            <td><?php echo number_format($amount, 2); ?></td>
        </tr>
        <tr>
            <td>GR Charge</td>
            <td>0.00</td>
        </tr>
        <tr>
            <td>Way Expense</td>
            <td>0.00</td>
        </tr>
        <tr>
            <td>Labour Charges</td>
            <td>0.00</td>
        </tr>
        <tr>
            <td>Total</td>
            <td><?php echo number_format($amount, 2); ?></td>
        </tr>
        <tr>
            <td>GST (18%)</td>
            <td><?php echo number_format($gst, 2); ?></td>
        </tr>
        <tr>
            <td><b>Grand Total</b></td>
            <td><b><?php echo number_format($grand, 2); ?></b></td>
        </tr>
    </table>
</div>

<div class="footer">
    TERMS & CONDITIONS: Transport Company is not responsible for leakage/breakage.<br>
    DELIVERY AT: GODOWN DELIVERY
</div>

<div class="signature">
    For MULTIMARG CARRIERS PVT. LTD.<br><br>
    Authorized Signatory
</div>

</div>

<!-- PDF Script -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<script>
function printPage() {
    window.print();
}

function downloadPDF() {
    var element = document.getElementById("printArea");

    var opt = {
        margin: 0.03,
        filename: 'Trip_<?php echo $trip; ?>.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}
</script>

</body>
</html>