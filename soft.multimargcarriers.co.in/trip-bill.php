<?php
include("config.php"); // your DB connection

// ✅ SECURE INPUT
$fr = mysqli_real_escape_string($con, $_GET['from']);
$to = mysqli_real_escape_string($con, $_GET['to']);
$client = mysqli_real_escape_string($con, $_GET['client']);

// ✅ QUERY
$query = "
SELECT 
    t.trip,
    t.date,
    t.vno,
    t.origin,
    t.destination,

    SUM(IFNULL(m.box,0)) AS total_box,
    SUM(IFNULL(m.weight,0)) AS total_weight,
    SUM(IFNULL(m.amount,0)) AS total_amount

FROM tripsheet t
JOIN material_details m ON t.trip = m.trip

WHERE t.date BETWEEN '$fr' AND '$to'
AND m.client = '$client'

GROUP BY t.trip
ORDER BY t.date ASC
";

$result = mysqli_query($con, $query);

if (!$result) {
    die("Query Failed: " . mysqli_error($con));
}

// ✅ CALCULATIONS
$subtotal = 0;
?>

<!DOCTYPE html>
<html>
<head>
    <title>Client Invoice</title>

    <style>
        body {
            font-family: Arial;
            padding: 20px;
        }

        h1, h2, h3 {
            text-align: center;
            margin: 5px;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        table, th, td {
            border: 1px solid #000;
        }

        th, td {
            padding: 8px;
            text-align: center;
        }

        .totals {
            width: 40%;
            float: right;
            margin-top: 20px;
        }

        .totals td {
            padding: 10px;
        }

        .print-btn {
            margin-top: 20px;
            text-align: center;
        }

        @media print {
            .print-btn {
                display: none;
            }
        }
    </style>
</head>

<body>

<div class="header">
    <h1>YOUR COMPANY NAME</h1>
    <h3>Client Invoice</h3>
</div>

<p><b>Client:</b> <?php echo $client; ?></p>
<p>
    <b>From:</b> <?php echo date("d-m-Y", strtotime($fr)); ?> 
    &nbsp;&nbsp;
    <b>To:</b> <?php echo date("d-m-Y", strtotime($to)); ?>
</p>

<table>
<thead>
<tr>
    <th>Trip No</th>
    <th>Date</th>
    <th>Vehicle No</th>
    <th>Route</th>
    <th>Box</th>
    <th>Weight (kg)</th>
    <th>Amount (₹)</th>
</tr>
</thead>

<tbody>

<?php
while ($row = mysqli_fetch_assoc($result)) {

    $subtotal += $row['total_amount'];

    echo "<tr>
        <td>{$row['trip']}</td>
        <td>" . date("d-m-Y", strtotime($row['date'])) . "</td>
        <td>{$row['vno']}</td>
        <td>" . strtoupper($row['origin']) . " → " . strtoupper($row['destination']) . "</td>
        <td>{$row['total_box']}</td>
        <td>{$row['total_weight']}</td>
        <td>" . number_format($row['total_amount'], 2) . "</td>
    </tr>";
}
?>

</tbody>
</table>

<?php
// ✅ GST CALCULATION
$gst_rate = 0.18;
$gst_amount = $subtotal * $gst_rate;
$grand_total = $subtotal + $gst_amount;
?>

<table class="totals">
<tr>
    <td><b>Subtotal</b></td>
    <td>₹<?php echo number_format($subtotal, 2); ?></td>
</tr>

<tr>
    <td><b>GST (18%)</b></td>
    <td>₹<?php echo number_format($gst_amount, 2); ?></td>
</tr>

<tr>
    <td><b>Grand Total</b></td>
    <td><b>₹<?php echo number_format($grand_total, 2); ?></b></td>
</tr>
</table>

<div style="clear:both;"></div>

<div class="print-btn">
    <button onclick="window.print()">Print Invoice</button>
</div>

</body>
</html>