<?php  
include ('config.php')?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Tax Invoice</title>

<style>
* { box-sizing: border-box; }

body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 16px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

td, th {
  padding: 6px 5px;
}

.table-bordered td, .table-bordered th {
  border: 1px solid #ddd;
}
</style>
</head>

<body>
<button onclick="generateAndSendPDF()">📧 Send Invoice</button>
<?php
$inv = $_GET['code'] ?? '';
if (!$inv) die("Invalid Invoice");

$q1 = mysqli_prepare($con, "SELECT invoice FROM bills WHERE pid = ?");
mysqli_stmt_bind_param($q1, "s", $inv);
mysqli_stmt_execute($q1);
$r1 = mysqli_stmt_get_result($q1);
$row1 = mysqli_fetch_assoc($r1);

if (!$row1) die("Invoice not found");

$invoiceNo = $row1['invoice'];

$sql = "
SELECT b.*, c.address, c.gst
FROM bills b
LEFT JOIN client c ON UPPER(c.client)=UPPER(b.client)
WHERE b.invoice = ?
ORDER BY b.awb_date ASC
";

$stmt = mysqli_prepare($con, $sql);
mysqli_stmt_bind_param($stmt, "s", $invoiceNo);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$bills = [];
while ($row = mysqli_fetch_assoc($res)) {
    $bills[] = $row;
}

$head = $bills[0];

$client = strtoupper($head['client']);
$gstNo = $head['gst'];
$stateCode = substr($gstNo,0,2);

$subtotal = 0;
foreach ($bills as $b) {
    $subtotal += $b['frieght']+$b['awb_charge']+$b['pickup']+$b['delivery']+$b['special_delivery']+$b['other_charge'];
}

$gst = $subtotal * 0.18;
$total = $subtotal + $gst;
?>

<!-- ================= TABLE ================= -->

<table border="1" cellspacing="0" cellpadding="4">
<tbody>

<tr>
<td colspan="9">
<b>Bill To:</b><br>
<b style="font-size:20px;"><?= $client ?></b><br>
<?= strtoupper($head['address']) ?><br>
<b>GSTIN:</b> <?= $gstNo ?><br>
<b>State Code:</b> <?= $stateCode ?>
</td>

<td colspan="8">
<table>
<tbody>
<tr><th align="left">Invoice No:</th><td><?= $invoiceNo ?></td></tr>
<tr><th align="left">Date:</th><td><?= date('d-m-Y', strtotime($head['invoice_date'])) ?></td></tr>
<tr><th align="left">Mode:</th><td><?= $head['mode'] ?></td></tr>
</tbody>
</table>
</td>
</tr>

<tr style="background:#eee; font-weight:bold;">
<th>Sl</th><th>LR NO</th><th>LR DT</th><th colspan="2">REF</th>
<th>ORG</th><th>DEST</th><th>PKG</th><th>WT</th>
<th>RATE</th><th>FRG</th><th>LR</th><th>PICK</th>
<th>DEL</th><th>SPL</th><th>OTH</th><th>TOTAL</th>
</tr>

<?php $i=1; foreach ($bills as $b): ?>
<tr align="center">
<td><?= $i++ ?></td>
<td><?= strtoupper($b['awb']) ?></td>
<td><?= date('d-m-Y', strtotime($b['awb_date'])) ?></td>

<td colspan="2">
<?php
$q = mysqli_prepare($con, "SELECT invoice FROM lr_details WHERE awb=?");
mysqli_stmt_bind_param($q, "s", $b['awb']);
mysqli_stmt_execute($q);
$r = mysqli_stmt_get_result($q);

$refText = '';
while ($x = mysqli_fetch_assoc($r)) {
    if ($x['invoice']) {
        $refText .= $x['invoice'] . "\n";
    }
}
echo nl2br($refText);
?>
</td>

<td><?= strtoupper($b['origin']) ?></td>
<td><?= strtoupper($b['destination']) ?></td>
<td><?= $b['box'] ?></td>
<td><?= $b['weight'] ?></td>
<td><?= $b['rate'] ?></td>
<td><?= $b['frieght'] ?></td>
<td><?= $b['awb_charge'] ?></td>
<td><?= $b['pickup'] ?></td>
<td><?= $b['delivery'] ?></td>
<td><?= $b['special_delivery'] ?></td>
<td><?= $b['other_charge'] ?></td>

<td>
<?= number_format(
$b['frieght']+$b['awb_charge']+$b['pickup']+
$b['delivery']+$b['special_delivery']+$b['other_charge'],2) ?>
</td>
</tr>
<?php endforeach; ?>

<tr>
<td colspan="9"><b>Accounts Details</b></td>
<td colspan="8">
<b>Subtotal:</b> <?= number_format($subtotal,2) ?><br>
<b>GST:</b> <?= number_format($gst,2) ?><br>
<b>Total:</b> <?= number_format($total,2) ?>
</td>
</tr>

</tbody>
</table>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<script>
function generateAndSendPDF() {

    const element = document.getElementById("awbContent");

    html2pdf().from(element).set({
        filename: 'invoice.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).outputPdf('blob').then(function(pdfBlob) {

        let formData = new FormData();
        formData.append("pdf", pdfBlob, "invoice.pdf");
        formData.append("invoice_no", "<?php echo $invoiceNo; ?>");

        fetch("send_invoice_mail.php", {
            method: "POST",
            body: formData
        })
        .then(res => res.text())
        .then(data => {
            alert(data);
        });

    });
}
</script>
</body>
</html>