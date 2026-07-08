<?php
session_start();
include('config.php');

$t=$_SESSION['user']['name'];

if (!isset($_SESSION['user'])) {
  echo "<script>window.location = 'index.php'</script>";
  exit;
}

$v=$_GET['code'];

$query="select * from trip where pid=$v";
$result=mysqli_query($con,$query);
$row=mysqli_fetch_array($result);

$consignment=$row['awb'];
$dispatch_date=$row['date'];
$date_sort=date("d-m-Y", strtotime($dispatch_date));
$mode=$row['mode'];
$client=$row['client'];
$origin=strtoupper($row['origin']);
$destination=strtoupper($row['destination']);
$typeofdelivery=$row['type_of_delivery'];
$insured=$row['insured'];
$box=$row['box'];
$aweight=$row['actual_wt'];
$cweight=$row['charge_wt'];
$remarks=strtoupper($row['remarks']);
$consignor=strtoupper($row['consignor']);
$consignee=strtoupper($row['consignee']);
$description=strtoupper($row['description']);
$clerk=strtoupper($row['clerk_name']);

$fcharge=$row['frieght_charge'];
$acharge=$row['awb_charge'];
$pcharge=$row['pickup_charge'];
$dcharge=$row['delivery_charge'];
$pacharge=$row['packaging_charge'];
$hcharge=$row['handling_charge'];

$c=$client;

$sql = "SELECT gst FROM client WHERE client = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("s", $consignor);
$stmt->execute();
$result = $stmt->get_result();
$client = $result->fetch_assoc();
$gst_no = $client['gst'] ?? '';

$stmt1 = $con->prepare($sql);
$stmt1->bind_param("s", $consignee);
$stmt1->execute();
$result1 = $stmt1->get_result();
$client1 = $result1->fetch_assoc();
$gst_no1 = $client1['gst'] ?? '';
?>

<!DOCTYPE html>
<html>
<head>

<meta charset="utf-8">
<title>MULTIMARG CARRIERS</title>

<style>
body{
font-family: "Segoe UI", Arial, Helvetica, sans-serif;
background:#f4f6f9;
margin:0;
padding:0;
font-size:13px;
color:#222;
}

/* MAIN PAGE */

.awb-container{
background:#fff;
width:210mm;
min-height:297mm;
margin:20px auto;
padding:8mm;
border:1px solid #444;
box-sizing:border-box;
box-shadow:0 0 8px rgba(0,0,0,0.08);
}

/* SECTION */

.section{
margin-bottom:12px;
}

.section-title{
border:1px solid #444;
padding:5px 8px;
font-weight:600;
font-size:14px;
background:#f7f7f7;
letter-spacing:.5px;
}

/* TABLE */

table{
width:100%;
border-collapse:collapse;
margin-top:4px;
}

th,td{
border:1px solid #888;
padding:5px 6px;
font-size:12px;
vertical-align:middle;
}

th{
background:#f2f2f2;
font-weight:600;
color:#222;
}

/* TABLE DATA */

td strong{
font-weight:600;
color:#000;
}

/* REMARKS */

.remarks{
margin-top:8px;
font-size:11px;
padding:6px;
border:1px dashed #777;
background:#fafafa;
color:#333;
}

/* SIGNATURE AREA */

.signature-area{
display:flex;
justify-content:space-between;
margin-top:18px;
font-size:12px;
}

/* FOOTER */

.footer{
display:flex;
justify-content:space-between;
font-size:11px;
margin-top:20px;
padding-top:6px;
border-top:1px solid #aaa;
color:#444;
}

/* BUTTONS */

.btn-group{
position:fixed;
top:40%;
right:20px;
display:flex;
flex-direction:column;
gap:12px;
z-index:999;
}

.btn{
background:#0b5ed7;
color:#fff;
border:none;
padding:10px 16px;
font-size:14px;
border-radius:6px;
cursor:pointer;
box-shadow:0 2px 5px rgba(0,0,0,0.2);
transition:.2s;
}

.btn:hover{
background:#0a4fb5;
transform:translateY(-1px);
}

/* MOBILE */

@media screen and (max-width:768px){

.awb-container{
width:95%;
padding:6px;
margin:10px auto;
}

table,th,td{
font-size:10px;
padding:3px;
word-break:break-word;
}

.section-title{
font-size:12px;
}

.btn-group{
top:auto;
bottom:10px;
right:10px;
flex-direction:row;
}

}

/* PRINT SETTINGS */

@page{
size:A4;
margin:8mm;
}

@media print{

body{
background:#fff;
}

.awb-container{
width:210mm;
min-height:297mm;
margin:0;
padding:8mm;
border:1px solid #444;
box-shadow:none;
}

.btn-group{
display:none;
}

}

/* SIGNATURE FONT */

.websafe-calligraphy{
font-family:'Brush Script MT','Lucida Handwriting',cursive;
font-size:1.5em;
color:#444;
}
/* FORCE COLOR PRINTING */

*{
-webkit-print-color-adjust: exact !important;
print-color-adjust: exact !important;
}

/* PRINT SETTINGS */

@media print{

body{
background:#ffffff;
}

.awb-container{
width:210mm;
min-height:297mm;
margin:0;
padding:8mm;
border:1px solid #444;
box-shadow:none;
}

/* ensure section headers keep color */

.section-title{
background:#f2f2f2 !important;
color:#000 !important;
}

/* ensure table headers keep color */

th{
background:#f2f2f2 !important;
}

.btn-group{
display:none;
}

}
</style>
</head>

<body>

<div class="btn-group">
<button class="btn" onclick="window.print()">Print</button>
<button class="btn" id="downloadPDF">Download</button>
</div>

<?php

$iu = "https://www.multimargcarriers.co.in/tracking?code=" . urlencode($consignment);
$qrUrl = "https://barcode.tec-it.com/barcode.ashx?data=" . urlencode($iu) . "&code=QRCode";
$qrData = file_get_contents($qrUrl);
$qrBase64 = base64_encode($qrData);

?>

<div class="awb-container" id="awbContent">

<!-- HEADER -->

<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #000;padding-bottom:10px;">

<div style="width:10%">
<img src="logo.jpg" style="height:110px;width:110px;">
</div>

<div style="text-align:center;width:80%">
<span style="font-size:30px;font-weight:bold;color:#1567CF">
MULTIMARG CARRIERS PVT. LTD.
</span><br>

<span style="font-size:12px;color:#004080">
LIG-194, NEAR NATIONAL PUBLIC SCHOOL, RUDRAPUR, UTTARAKHAND-263153
</span><br>

<span style="font-size:12px;color:#004080">
Contact: 05944-324033 | info@multimargcarriers.co.in
</span><br>

<span style="font-size:12px;color:#004080">
GST No: 05AANCM3054E1ZN | PAN: AANCM3054E1ZN
</span>

</div>

<div style="width:10%;text-align:right">
<img src="data:image/png;base64,<?= $qrBase64 ?>" style="height:80px;width:80px;">
<div style="font-size:11px;font-weight:bold;color:#1567CF">Track Me</div>
</div>

</div>

<!-- AWB DETAILS -->

<div class="section">

<div class="section-title">AWB Details</div>

<table>
<tr>

<th>AWB No</th>
<td><strong><?php echo $consignment;?></strong></td>

<th>Date</th>
<td><strong><?php echo $date_sort;?></strong></td>

<th>Mode</th>
<td><strong><?php echo strtoupper($mode);?></strong></td>

</tr>
</table>

</div>

<!-- PARTIES -->

<div class="section">

<div class="section-title">Parties</div>

<table>

<tr>
<th>Consignor</th>
<td><?php echo $consignor;?></td>

<th>GSTIN</th>
<td><?php echo $gst_no;?></td>
</tr>

<tr>
<th>Consignee</th>
<td><?php echo $consignee;?></td>

<th>GSTIN</th>
<td><?php echo $gst_no1;?></td>
</tr>

<tr>
<th>Bill To</th>
<td colspan="3"><?php echo $c;?></td>
</tr>

</table>

</div>

<!-- SHIPMENT INFO -->

<div class="section">

<div class="section-title">Shipment Info</div>

<table>

<tr>
<th>Pkg(s)</th>
<td><?php echo $box;?></td>

<th>Origin</th>
<td><?php echo $origin;?></td>

<th>Destination</th>
<td><?php echo $destination;?></td>

<th>Description</th>
<td><?php echo $typeofdelivery;?></td>
</tr>

<tr>
<th>Actual Weight</th>
<td><?php echo $aweight;?></td>

<th>Charge Weight</th>
<td><?php echo $cweight;?></td>

<th>Insured</th>
<td><?php echo $insured;?></td>

<th>Remarks</th>
<td><?php echo $remarks;?></td>

</tr>

</table>

</div>

<!-- SHIPMENT ITEMS -->

<div class="section">

<div class="section-title">Shipment Items</div>

<table>

<tr>
<th>Invoice</th>
<th>Date</th>
<th>Qty</th>
<th>Part</th>
<th>Value</th>
<th>Eway</th>
</tr>

<?php

$query1=mysqli_query($con,"SELECT * FROM lr_details where awb='$consignment'");

while($row1=mysqli_fetch_array($query1))
{

$date1=date("d-m-Y",strtotime($row1['invdate']));

?>

<tr>

<td><?php echo $row1['invoice'];?></td>
<td><?php echo $date1;?></td>
<td><?php echo $row1['quantity'];?></td>
<td><?php echo $row1['part'];?></td>
<td><?php echo $row1['value'];?></td>
<td><?php echo $row1['eway'];?></td>

</tr>

<?php } ?>

</table>

</div>

<!-- CHARGES -->

<div class="section">

<div class="section-title">Charges</div>

<table>

<tr>
<th>Freight</th>
<td>₹<?php echo $fcharge;?></td>

<th>AWB</th>
<td>₹<?php echo $acharge;?></td>

<th>Pickup</th>
<td>₹<?php echo $pcharge;?></td>
</tr>

<tr>
<th>Delivery</th>
<td>₹<?php echo $dcharge;?></td>

<th>Packaging</th>
<td>₹<?php echo $pacharge;?></td>

<th>Handling</th>
<td>₹<?php echo $hcharge;?></td>
</tr>

<?php

$subtotal=$fcharge+$acharge+$pcharge+$dcharge+$pacharge+$hcharge;
$gst=$subtotal*18/100;
$total=$subtotal+$gst;

?>

<tr>

<th>Sub Total</th>
<td>₹<?php echo number_format($subtotal,2);?></td>

<th>GST 18%</th>
<td>₹<?php echo number_format($gst,2);?></td>

<th>Total</th>
<td>₹<?php echo number_format($total,2);?></td>

</tr>

</table>

</div>


<div class="remarks">

NOTE: Quantity and quality not checked.  
Subject to Uttarakhand jurisdiction only.

</div>

<br>

<div style="display:flex;justify-content:space-between">

<div>
Sender Signature:
<u class="websafe-calligraphy"><?php echo ucfirst(strtolower($clerk));?></u>
</div>

<div>
Receiver Sign: __________
</div>

</div>

<div class="footer">

<span>□ Consignor Copy</span>
<span>□ Consignee Copy</span>
<span>□ Accounts Copy</span>
<span>□ POD Copy</span>

</div>

</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<script>

document.getElementById("downloadPDF").addEventListener("click",function(){

const element=document.getElementById("awbContent");

html2pdf().from(element).set({

filename:'AWB_<?php echo $consignment;?>.pdf',
image:{type:'jpeg',quality:1},
html2canvas:{scale:1.5,useCORS:true},
jsPDF:{unit:'px',format:[850,1300],orientation:'portrait'}

}).save();

});

</script>

</body>
</html>